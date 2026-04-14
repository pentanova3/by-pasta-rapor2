const express = require('express');
const cron = require('node-cron');
const admin = require('firebase-admin');
const https = require('https');

const TELEGRAM_TOKEN = '8625001432:AAE30hy3IZgmDJ4NoThjKgd_0QlDExSpTk8';
const CHAT_ID = '-5282486977';
const PORT = process.env.PORT || 8080;

const serviceAccount = {
  type: 'service_account',
  project_id: 'by-pasta-siparis',
  private_key_id: '418c97c6f78568d4a60ae8974f15f5932c8e1f4a',
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDItd3zqt06tCAG\nt0i7N+1wAob0zyU+n04VH3w1BfbpNw7KUemcQkaRoOQSpFnoyNC0xFaggNEZNrNy\ndjziHV0PMlPm8pmAVy0R8EN94u/mfkKfQoYAtArxtt6T7OjYzLuTitCrS0jbXO/9\nqEsMKhCVbbqMRSVOea/tIvzyMy+lcvDKv0fwcr5dg1yZk5NttC+uh95M6hzGsBfX\n80QAAj13lDGIyld3EkAoqbhSZICBe4+flqM4orrMFAQSLGfYgZDdXiy4cTg17KX+\nZ1cJZf3t3UECVkeT8TAjDY9K8qXmHHm2jcl08hKO9UrYGOBs+5ZsKERjVCrVyG7A\nEDj7CeOnAgMBAAECggEACXk2wLQ6kkrDjY2ZIT0X4pw77SeEhTAqaf99HVjquUH1\nW2ytBMhxYZj2gEAW/lB8NAwQYAMJ25F5ZthYh1Ow0MbPWayZvN+11jhA90V+4qI9\nrXFhDHzIXMsE4SE4Ma4i1xP2RXTdkNJngXwwDqLtpXVIbivVVvQ8xDSikSFZXmBj\nm5X9qblJKOmM52qp3gGm+/IKcEZChfujosPTYma/7RN4FjCGt3LkjDrdU+zYM9fm\nnQuQ7SY+k8qiJ0btf9LGzceO+FUq8x/7voOyrgTj47x3ZkiBjq4yB4adNiSW8A9q\nM7EgsCJ1kRX9K6QOqDndxQy+MsWt7bgAIx+xiMI8AQKBgQD/GS9DzmFDuno4zE2m\nyxgeIyAf1+ap9FDUutbEHXiu7jdq/427vvOxOBUZWtrCf8cPlJC2odeRzgujLjqW\ng6Zs33JXOyC1VURA7RqJIzZF8aAC8cuYBAQ5WODl5SAELlecEbzkPCRdAJVdvMG/\nYevAtvlmISHoO3WI3Vw7blctvwKBgQDJa3i9iTej8dF8cGYJ7nTQa1IHiNFXU2gt\nLUQn+fl5eaIWEVn+z5mX1wd4qsdqFnD8i0i9hd5+OxBFzuO9WiE2e9mQpLI5zhkK\nRIvSnLt6XG4yXHd/vWh90dhoV4yxqgB8SINKonlgE5kCKHrpS648Mowr+0E1hYeZ\nfTMp3uyUGQKBgFmLoKC/qDrbEZ4wcS2UayHhGJy0795Gybzy3QK4ia12J3PiwwDd\ndbOGyTk+QD44FksszmOdigs/daxRRPWivt/Gy988/S1KAgx8bm0nNBz3RUDjWaFB\n/62VulRYypVNIynAvDqtteIDm2rtIGGq4NOkJwWnqbxYatihQ4gFIosHAoGBAItx\n+DlgEkFSXTHFrx8ZE45nfnbw5d2LRQhh2lnC2lCbQPf+M0wR9cgFeoqz0TNFLhvp\nYgaz84F46p8pyMmC6JOL0ugs3abfZL6TDipVkAX6j+AV3DV3sCvLaAN0+VbW11cz\n7JFzQoydhMTVuaJiXtIWPK0GWfLv6xz8bLuENk2hAoGATlVvpqZ23x/AM7bFvatt\n5IJ5aQncMWF/fa7wqHobQJmhF01iftTyBsKf3RrxL2eY7Fb2+jVf63RJugE/DCqy\nZUDHJQvg9dLI14NFu7FTh+R8I/OXjEHm8R2QTO4Qu33qgE+VfZpgqONSPm2153fW\ncy0hBGA1KZ48Q1xTuVg0ZDo=\n-----END PRIVATE KEY-----\n",
  client_email: 'firebase-adminsdk-fbsvc@by-pasta-siparis.iam.gserviceaccount.com',
  client_id: '113751706185384082198',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token'
};
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
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

// AYLIK RAPOR
async function aylikRapor() {
  console.log('Aylik rapor calisiyor...');
  try {
    const orders = await loadData('byp_orders');
    if (!orders) { await sendTelegram('<b>Aylik Rapor</b>\nVeri okunamadi.'); return; }

    const now = new Date(new Date().toLocaleString('en-US', {timeZone:'Europe/Istanbul'}));
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthStart = year + '-' + String(month + 1).padStart(2, '0') + '-01';
    const monthEnd = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(new Date(year, month + 1, 0).getDate()).padStart(2, '0');
    const ayAdi = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

    const monthOrders = orders.filter(o => o.createdAt && o.createdAt.split('T')[0] >= monthStart && o.createdAt.split('T')[0] <= monthEnd);
    const delivered = monthOrders.filter(o => o.status === 'teslim');
    const cancelled = monthOrders.filter(o => o.status === 'iptal');
    const undelivered = monthOrders.filter(o => o.status === 'teslim_edilemedi');
    const revenue = delivered.reduce((s, o) => s + (o.discounted || o.price || 0), 0);
    const collected = delivered.reduce((s, o) => s + (o.paid || 0), 0);

    let msg = '<b>BY Pasta - Aylik Rapor</b>\n';
    msg += ayAdi + '\n\n';
    msg += '<b>Genel Ozet:</b>\n';
    msg += 'Toplam siparis: <b>' + monthOrders.length + '</b>\n';
    msg += 'Teslim edilen: <b>' + delivered.length + '</b>\n';
    msg += 'Iptal edilen: <b>' + cancelled.length + '</b>\n';
    msg += 'Teslim edilemeyen: <b>' + undelivered.length + '</b>\n\n';

    msg += '<b>Ciro Bilgileri:</b>\n';
    msg += 'Aylik ciro: <b>' + fMoney(revenue) + '</b>\n';
    msg += 'Tahsil edilen: ' + fMoney(collected) + '\n';
    if (revenue - collected > 0) msg += 'Kalan bakiye: ' + fMoney(revenue - collected) + '\n';
    msg += '\n';

    if (monthOrders.length > 0) {
      msg += '<b>Oranlar:</b>\n';
      msg += 'Teslim orani: %' + Math.round(delivered.length / monthOrders.length * 100) + '\n';
      msg += 'Iptal orani: %' + Math.round(cancelled.length / monthOrders.length * 100) + '\n';
      msg += 'Ortalama siparis tutari: ' + fMoney(Math.round(revenue / (delivered.length || 1))) + '\n\n';
    }

    // Sube bazli
    const byBranch = {};
    delivered.forEach(o => {
      const b = o.branch || 'Belirsiz';
      if (!byBranch[b]) byBranch[b] = { count: 0, rev: 0 };
      byBranch[b].count++;
      byBranch[b].rev += (o.discounted || o.price || 0);
    });

    if (Object.keys(byBranch).length > 0) {
      msg += '<b>Sube Performansi:</b>\n';
      Object.entries(byBranch).forEach(function(entry) {
        msg += '  ' + entry[0] + ': ' + entry[1].count + ' teslim - ' + fMoney(entry[1].rev) + '\n';
      });
      msg += '\n';
    }

    // En cok siparis veren musteriler
    const byCust = {};
    monthOrders.forEach(o => {
      if (!byCust[o.customer]) byCust[o.customer] = 0;
      byCust[o.customer]++;
    });
    const topCust = Object.entries(byCust).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (topCust.length > 0) {
      msg += '<b>En Cok Siparis Veren Musteriler:</b>\n';
      topCust.forEach(function(entry, i) {
        msg += '  ' + (i + 1) + '. ' + entry[0] + ': ' + entry[1] + ' siparis\n';
      });
      msg += '\n';
    }

    // Kaplama dagilimi
    const byCoating = {};
    monthOrders.forEach(o => {
      const c = o.coating || 'Belirsiz';
      if (!byCoating[c]) byCoating[c] = 0;
      byCoating[c]++;
    });
    if (Object.keys(byCoating).length > 0) {
      msg += '<b>Kaplama Dagilimi:</b>\n';
      Object.entries(byCoating).sort((a, b) => b[1] - a[1]).forEach(function(entry) {
        msg += '  ' + entry[0] + ': ' + entry[1] + ' siparis\n';
      });
    }

    await sendTelegram(msg);
  } catch (err) { console.error('Aylik rapor hatasi:', err.message); }
}

// DOGUM GUNU BILDIRIMI — her ayin 1'inde bu ay dogum gunu olanlar
async function dogumGunuBildirimi() {
  console.log('Dogum gunu bildirimi calisiyor...');
  try {
    const bdayDb = await loadData('byp_bday_db');
    if (!bdayDb || !bdayDb.length) {
      await sendTelegram('<b>Dogum Gunu Bildirimi</b>\nKayitli dogum gunu verisi bulunamadi.');
      return;
    }

    const now = new Date(new Date().toLocaleString('en-US', {timeZone:'Europe/Istanbul'}));
    const currentMonth = now.getMonth(); // 0-11
    const ayAdi = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

    // Bu ay dogum gunu olanlar
    const thisMonth = [];
    bdayDb.forEach(function(entry) {
      // Ana kisi
      if (entry.main && entry.main.birthday) {
        const bday = new Date(entry.main.birthday);
        if (bday.getMonth() === currentMonth) {
          thisMonth.push({
            name: entry.main.name || entry.customer || '-',
            phone: entry.main.phone || entry.phone || '-',
            day: bday.getDate(),
            birthday: bday.toLocaleDateString('tr-TR', {day:'numeric', month:'long'}),
            orderNo: entry.orderNo || '-'
          });
        }
      }
      // Aile uyeleri
      if (entry.family && Array.isArray(entry.family)) {
        entry.family.forEach(function(f) {
          if (f.birthday) {
            const fbday = new Date(f.birthday);
            if (fbday.getMonth() === currentMonth) {
              thisMonth.push({
                name: f.name || '-',
                phone: f.phone || entry.main?.phone || '-',
                day: fbday.getDate(),
                birthday: fbday.toLocaleDateString('tr-TR', {day:'numeric', month:'long'}),
                orderNo: entry.orderNo || '-',
                relation: '(aile uyesi: ' + (entry.main?.name || entry.customer || '') + ')'
              });
            }
          }
        });
      }
    });

    if (thisMonth.length === 0) {
      await sendTelegram('<b>Dogum Gunu Bildirimi</b>\n' + ayAdi + '\n\nBu ay dogum gunu olan kayitli musteri bulunmadi.');
      return;
    }

    // Gune gore sirala
    thisMonth.sort(function(a, b) { return a.day - b.day; });

    let msg = '<b>BY Pasta - Dogum Gunu Bildirimi</b>\n';
    msg += ayAdi + '\n\n';
    msg += 'Bu ay <b>' + thisMonth.length + '</b> kisinin dogum gunu var:\n\n';

    thisMonth.forEach(function(p, i) {
      msg += (i + 1) + '. <b>' + p.name + '</b> — ' + p.birthday + '\n';
      msg += '   Tel: ' + p.phone;
      if (p.relation) msg += ' ' + p.relation;
      msg += '\n\n';
    });

    msg += 'Musterilerinize dogum gunu surprizi yapmayi unutmayin!';

    await sendTelegram(msg);
  } catch (err) { console.error('Dogum gunu bildirimi hatasi:', err.message); }
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
app.post('/aylik', async (req, res) => { await aylikRapor(); res.json({ ok: true }); });
app.post('/dogum-gunu', async (req, res) => { await dogumGunuBildirimi(); res.json({ ok: true }); });

// CRON: Aksam 20:00 Turkiye
cron.schedule('0 20 * * *', () => { console.log('CRON: Gun sonu raporu'); gunSonuRaporu(); }, { timezone: 'Europe/Istanbul' });

// CRON: Pazartesi 09:00 Turkiye
cron.schedule('0 9 * * 1', () => { console.log('CRON: Haftalik rapor'); haftalikRapor(); }, { timezone: 'Europe/Istanbul' });

// CRON: Her ayin son gunu 22:00 Turkiye
cron.schedule('0 22 28-31 * *', () => {
  const now = new Date(new Date().toLocaleString('en-US', {timeZone:'Europe/Istanbul'}));
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (tomorrow.getDate() === 1) { console.log('CRON: Aylik rapor'); aylikRapor(); }
}, { timezone: 'Europe/Istanbul' });

// CRON: Her ayin 1'i saat 09:00 — dogum gunu bildirimi
cron.schedule('0 9 1 * *', () => { console.log('CRON: Dogum gunu bildirimi'); dogumGunuBildirimi(); }, { timezone: 'Europe/Istanbul' });

app.listen(PORT, () => {
  console.log('BY Pasta Rapor Bot - Port: ' + PORT);
  console.log('Cron: 20:00 gun sonu, Pzt 09:00 haftalik, Ayin sonu 22:00 aylik, Ayin 1i 09:00 dogum gunu');
});
