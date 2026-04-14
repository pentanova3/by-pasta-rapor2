const express = require('express');
const cron = require('node-cron');
const admin = require('firebase-admin');
const https = require('https');

const TELEGRAM_TOKEN = '8625001432:AAE30hy3IZgmDJ4NoThjKgd_0QlDExSpTk8';
const CHAT_ID = '-5282486977';
const PORT = process.env.PORT || 8080;

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SA || '{}')),
  projectId: 'by-pasta-siparis'
});
const db = admin.firestore();

async function loadData(key) {
  try {
    const doc = await db.collection('config').doc(key).get();
    if (doc.exists) return JSON.parse(doc.data().value);
    return null;
  } catch (err) { console.error('Firestore:', key, err.message); return null; }
}

function sendTelegram(text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' });
    const options = {
      hostname: 'api.telegram.org',
      path: '/bot' + TELEGRAM_TOKEN + '/sendMessage',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => res.statusCode === 200 ? resolve(true) : reject(new Error(body)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function fDate(d) { return d ? new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'; }
function fMoney(n) { return String.fromCharCode(8378) + Number(n || 0).toLocaleString('tr-TR'); }

// GUN SONU RAPORU — Aksam 20:00
async function gunSonuRaporu() {
  console.log('Gun sonu raporu calisiyor...');
  try {
    const orders = await loadData('byp_orders');
    if (!orders) { await sendTelegram('<b>Gun Sonu Raporu</b>\nVeri okunamadi.'); return; }

    const today = new Date().toISOString().split('T')[0];
    const todayCreated = orders.filter(o => o.createdAt && o.createdAt.split('T')[0] === today);
    const todayDelivered = orders.filter(o => o.delivAt && o.delivAt.split('T')[0] === today && o.status === 'teslim');
    const todayCancelled = orders.filter(o => o.cancelledAt && o.cancelledAt.split('T')[0] === today && o.status === 'iptal');
    const todayUndelivered = orders.filter(o => o.undeliveredAt && o.undeliveredAt.split('T')[0] === today && o.status === 'teslim_edilemedi');
    const revenue = todayDelivered.reduce((s, o) => s + (o.discounted || o.price || 0), 0);
    const collected = todayDelivered.reduce((s, o) => s + (o.paid || 0), 0);
    const stillWaiting = orders.filter(o => o.status === 'bekliyor');
    const stillInProd = orders.filter(o => o.status === 'uretimde');

    let msg = '<b>BY Pasta - Gun Sonu Raporu</b>\n';
    msg += fDate(today) + '\n\n';
    msg += 'Bugun alinan: <b>' + todayCreated.length + '</b> siparis\n';
    msg += 'Teslim edilen: <b>' + todayDelivered.length + '</b>\n';
    msg += 'Iptal edilen: <b>' + todayCancelled.length + '</b>\n';
    msg += 'Teslim edilemeyen: <b>' + todayUndelivered.length + '</b>\n\n';
    msg += 'Gunluk ciro: <b>' + fMoney(revenue) + '</b>\n';
    msg += 'Tahsil edilen: ' + fMoney(collected) + '\n';
    if (revenue - collected > 0) msg += 'Kalan bakiye: ' + fMoney(revenue - collected) + '\n';
    msg += '\n';

    if (stillWaiting.length > 0 || stillInProd.length > 0) {
      msg += 'Bekleyen: ' + stillWaiting.length + ' - Uretimde: ' + stillInProd.length + '\n';
    }

    const byBranch = {};
    todayDelivered.forEach(o => {
      const b = o.branch || 'Belirsiz';
      if (!byBranch[b]) byBranch[b] = { count: 0, rev: 0 };
      byBranch[b].count++;
      byBranch[b].rev += (o.discounted || o.price || 0);
    });

    if (Object.keys(byBranch).length > 0) {
      msg += '\n<b>Sube Performansi:</b>\n';
      Object.entries(byBranch).forEach(function(entry) {
        msg += '  ' + entry[0] + ': ' + entry[1].count + ' teslim - ' + fMoney(entry[1].rev) + '\n';
      });
    }

    if (todayCancelled.length > 0) {
      msg += '\n<b>Iptal Detaylari:</b>\n';
      todayCancelled.forEach(o => { msg += '  ' + o.orderNo + ' - ' + o.customer + ': ' + (o.cancelReason || '-') + '\n'; });
    }

    if (todayUndelivered.length > 0) {
      msg += '\n<b>Teslim Edilemedi:</b>\n';
      todayUndelivered.forEach(o => { msg += '  ' + o.orderNo + ' - ' + o.customer + ': ' + (o.undeliveredReason || '-') + '\n'; });
    }

    // Geri bildirimler
    const todayFeedback = orders.filter(o => o.feedbackAt && o.feedbackAt.split('T')[0] === today && o.feedback);
    if (todayFeedback.length > 0) {
      msg += '\n<b>Musteri Geri Bildirimleri:</b>\n';
      todayFeedback.forEach(o => { msg += '  ' + o.orderNo + ' - ' + o.customer + ': ' + o.feedback + '\n'; });
    }

    msg += '\nIyi aksamlar!';
    await sendTelegram(msg);
  } catch (err) { console.error('Gun sonu raporu hatasi:', err.message); }
}

// HAFTALIK RAPOR — Pazartesi 09:00
async function haftalikRapor() {
  console.log('Haftalik rapor calisiyor...');
  try {
    const orders = await loadData('byp_orders');
    if (!orders) { await sendTelegram('<b>Haftalik Rapor</b>\nVeri okunamadi.'); return; }

    const now = new Date();
    const day = now.getDay() || 7;
    const mon = new Date(now); mon.setDate(now.getDate() - day - 6);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    const startDate = mon.toISOString().split('T')[0];
    const endDate = sun.toISOString().split('T')[0];

    const weekOrders = orders.filter(o => o.createdAt && o.createdAt.split('T')[0] >= startDate && o.createdAt.split('T')[0] <= endDate);
    const delivered = weekOrders.filter(o => o.status === 'teslim');
    const cancelled = weekOrders.filter(o => o.status === 'iptal');
    const revenue = delivered.reduce((s, o) => s + (o.discounted || o.price || 0), 0);

    let msg = '<b>BY Pasta - Haftalik Rapor</b>\n';
    msg += fDate(startDate) + ' - ' + fDate(endDate) + '\n\n';
    msg += 'Toplam siparis: <b>' + weekOrders.length + '</b>\n';
    msg += 'Teslim edilen: <b>' + delivered.length + '</b>\n';
    msg += 'Iptal edilen: <b>' + cancelled.length + '</b>\n';
    msg += 'Haftalik ciro: <b>' + fMoney(revenue) + '</b>\n';
    if (weekOrders.length > 0) {
      msg += 'Iptal orani: %' + Math.round(cancelled.length / weekOrders.length * 100) + '\n';
      msg += 'Teslim orani: %' + Math.round(delivered.length / weekOrders.length * 100) + '\n';
    }

    await sendTelegram(msg);
  } catch (err) { console.error('Haftalik rapor hatasi:', err.message); }
}

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/', (req, res) => res.json({ status: 'BY Pasta Rapor Bot calisiyor', time: new Date().toISOString() }));
app.get('/test', async (req, res) => { try { await sendTelegram('BY Pasta Rapor Bot - Test mesaji, sistem calisiyor!'); res.json({ ok: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/gun-sonu', async (req, res) => { await gunSonuRaporu(); res.json({ ok: true }); });
app.post('/haftalik', async (req, res) => { await haftalikRapor(); res.json({ ok: true }); });

// CRON: Aksam 20:00 Turkiye
cron.schedule('0 20 * * *', () => { console.log('CRON: Gun sonu raporu'); gunSonuRaporu(); }, { timezone: 'Europe/Istanbul' });

// CRON: Pazartesi 09:00 Turkiye
cron.schedule('0 9 * * 1', () => { console.log('CRON: Haftalik rapor'); haftalikRapor(); }, { timezone: 'Europe/Istanbul' });

app.listen(PORT, () => {
  console.log('BY Pasta Rapor Bot - Port: ' + PORT);
  console.log('Cron: Aksam 20:00 (gun sonu), Pazartesi 09:00 (haftalik)');
});
