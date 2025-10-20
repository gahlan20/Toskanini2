/**
 * كشري الخديوي — Google Apps Script backend (مع إشعار مجاني)
 * - إشعار فوري ببريد إلكتروني (مجاني) + اختياري تليجرام/ديسكورد (مجانيان)
 * - يحفظ الطلبات مثل نسخة V2 (Orders + OrderItems)
 * - نفس واجهات GET/POST
 */

// ===== إعدادات الإشعارات =====
const NOTIFY = {
  OWNER_EMAILS: ['your-email@example.com'], // ← عدّلها ببريدك/بريد الفريق
  ENABLE_EMAIL: true,

  // Telegram (اختياري ومجاني): أنشئ Bot من @BotFather وخذ token + chat_id، ثم فعّل السطور أسفل
  ENABLE_TELEGRAM: false,
  TELEGRAM_BOT_TOKEN: 'XXXXXXXX:YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
  TELEGRAM_CHAT_ID: '123456789',

  // Discord (اختياري ومجاني): اعمل Incoming Webhook من إعدادات القناة
  ENABLE_DISCORD: false,
  DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/xxxx/yyy'
};

// ===== إعدادات الجداول =====
const CONFIG = {
  ORDERS_SHEET: 'Orders',
  ORDER_ITEMS_SHEET: 'OrderItems',
  META_SHEET:   'Meta',
  HEADERS: [
    'Date','Shift_Number','Status','Name','Phone','Email','Address','Area',
    'Service','Subtotal','Totalprice','Products','FormattedProducts','Notes'
  ],
  ORDER_ITEMS_HEADERS: [
    'OrderRow','Date','Shift_Number','Status','Name','Phone','Area',
    'ItemName','Color','Size','Quantity','Price','LineTotal'
  ]
};

function ensureSheets() {
  const ss = SpreadsheetApp.getActive();
  let orders = ss.getSheetByName(CONFIG.ORDERS_SHEET);
  if (!orders) orders = ss.insertSheet(CONFIG.ORDERS_SHEET);
  let meta = ss.getSheetByName(CONFIG.META_SHEET);
  if (!meta) meta = ss.insertSheet(CONFIG.META_SHEET);
  let items = ss.getSheetByName(CONFIG.ORDER_ITEMS_SHEET);
  if (!items) items = ss.insertSheet(CONFIG.ORDER_ITEMS_SHEET);

  if (orders.getLastRow() === 0) {
    orders.getRange(1, 1, 1, CONFIG.HEADERS.length).setValues([CONFIG.HEADERS]);
  }
  if (items.getLastRow() === 0) {
    items.getRange(1, 1, 1, CONFIG.ORDER_ITEMS_HEADERS.length).setValues([CONFIG.ORDER_ITEMS_HEADERS]);
  }
  if (!meta.getRange('A1').getValue()) {
    meta.getRange('A1').setValue(1);
    meta.getRange('B1').setValue('Current Shift Number');
  }
}

function getCurrentShiftNumber() {
  ensureSheets();
  const ss = SpreadsheetApp.getActive();
  return Number(ss.getSheetByName(CONFIG.META_SHEET).getRange('A1').getValue() || 1) || 1;
}
function setCurrentShiftNumber(n) {
  SpreadsheetApp.getActive().getSheetByName(CONFIG.META_SHEET).getRange('A1').setValue(Number(n));
}

function formatProductsForSheet(productsJson) {
  try {
    const arr = JSON.parse(productsJson || '[]');
    if (!Array.isArray(arr)) return productsJson;
    return arr.map(p => {
      const name  = p.name || '';
      const qty   = p.quantity || 1;
      const price = (p.price != null ? p.price : 0);
      const parts = [];
      if (p.selectedColorLabel || p.selectedColor) parts.push('اللون: ' + (p.selectedColorLabel || p.selectedColor));
      if (p.selectedSizeLabel || p.selectedSize)   parts.push('المقاس: ' + (p.selectedSizeLabel || p.selectedSize));
      const extra = parts.length ? ' — ' + parts.join(' | ') : '';
      return `${name}${extra} ×${qty} — LE:${price}`;
    }).join('\n');
  } catch (e) {
    return productsJson;
  }
}

// ===== Handlers =====
function doGet(e) {
  try {
    ensureSheets();
    const action = (e && e.parameter && e.parameter.action) || '';
    if (action === 'getShiftNumber') {
      return jsonOut({ result: 'success', shiftNumber: getCurrentShiftNumber() });
    }
    return jsonOut(getAllOrders_());
  } catch (err) {
    return jsonOut({ result: 'error', message: String(err) }, 500);
  }
}

function doPost(e) {
  try {
    ensureSheets();
    const p = (e && e.parameter) || {};
    const action = p.action;

    if (action === 'addOrder') {
      const r = addOrder_(p);
      return jsonOut({ result: 'success', row: r.row });
    }
    if (action === 'updateStatus') {
      const row = Number(p.row);
      const status = p.status || 'جديد';
      if (!row || row < 2) throw new Error('رقم الصف غير صحيح.');
      updateStatus_(row, status);
      return jsonOut({ result: 'success' });
    }
    if (action === 'endShift') {
      const dateStr = p.date;
      if (!dateStr) throw new Error('برجاء إرسال التاريخ.');
      const done = endShift_(dateStr);
      return jsonOut({ result: 'success', archived: done.archived, newShift: getCurrentShiftNumber() });
    }
    return jsonOut({ result: 'error', message: 'Unknown action' }, 400);
  } catch (err) {
    return jsonOut({ result: 'error', message: String(err) }, 500);
  }
}

// ===== Business =====
function addOrder_(p) {
  const ss = SpreadsheetApp.getActive();
  const orders = ss.getSheetByName(CONFIG.ORDERS_SHEET);
  const items  = ss.getSheetByName(CONFIG.ORDER_ITEMS_SHEET);

  const now = new Date();
  const shift = getCurrentShiftNumber();

  const Name   = p.Name || '';
  const Phone  = p.Phone || '';
  const Email  = p.Email || '';
  const Address= p.Address || '';
  const Area   = p.Area || '';
  const Service   = Number(p.Service || p.service || 0);
  const Subtotal  = Number(p.Subtotal || 0);
  const Totalprice= Number(p.Totalprice || p.totalprice || 0);
  const Products  = p.Products || '[]';
  const Notes     = p.Notes || p.notes || '';

  // صف الطلب في Orders
  const rowValues = [
    now, shift, 'جديد', Name, Phone, Email, Address, Area,
    Service, Subtotal, Totalprice, Products,
    formatProductsForSheet(Products), Notes
  ];
  orders.appendRow(rowValues);
  const lastRow = orders.getLastRow();

  // عناصر الطلب في OrderItems
  try {
    const arr = JSON.parse(Products || '[]');
    if (Array.isArray(arr) && arr.length) {
      const block = arr.map(function(pp){
        const name  = pp.name || '';
        const qty   = Number(pp.quantity || 1);
        const price = Number(pp.price != null ? pp.price : 0);
        const color = pp.selectedColorLabel || pp.selectedColor || '';
        const size  = pp.selectedSizeLabel || pp.selectedSize || '';
        const line  = qty * price;
        return [lastRow, now, shift, 'جديد', Name, Phone, Area, name, color, size, qty, price, line];
      });
      if (block.length) {
        items.getRange(items.getLastRow()+1, 1, block.length, CONFIG.ORDER_ITEMS_HEADERS.length).setValues(block);
      }
    }
  } catch(e) {}

  // إشعارات مجانية
  try {
    sendNewOrderNotifications_({
      row: lastRow,
      name: Name,
      phone: Phone,
      total: Totalprice,
      area: Area,
      formatted: formatProductsForSheet(Products)
    });
  } catch(e) {}

  return { row: lastRow };
}

function updateStatus_(row, status) {
  const ss = SpreadsheetApp.getActive();
  const orders = ss.getSheetByName(CONFIG.ORDERS_SHEET);
  const items  = ss.getSheetByName(CONFIG.ORDER_ITEMS_SHEET);

  orders.getRange(row, 3).setValue(status);

  // مزامنة الحالة في OrderItems
  const last = items.getLastRow();
  if (last >= 2) {
    const data = items.getRange(2,1,last-1, CONFIG.ORDER_ITEMS_HEADERS.length).getValues();
    for (let i=0;i<data.length;i++){
      if (Number(data[i][0]) === Number(row)) data[i][3] = status;
    }
    items.getRange(2,1,last-1, CONFIG.ORDER_ITEMS_HEADERS.length).setValues(data);
  }
}

function endShift_(dateStr) {
  const ss = SpreadsheetApp.getActive();
  const orders = ss.getSheetByName(CONFIG.ORDERS_SHEET);
  const items  = ss.getSheetByName(CONFIG.ORDER_ITEMS_SHEET);

  const [y,m,d] = dateStr.split('-').map(Number);
  const start = new Date(y, m-1, d, 0,0,0,0);
  const end   = new Date(y, m-1, d, 23,59,59,999);

  const lastOrders = orders.getLastRow();
  let archived = 0;
  if (lastOrders >= 2) {
    const vals = orders.getRange(2,1,lastOrders-1, CONFIG.HEADERS.length).getValues();
    for (let i=0;i<vals.length;i++){
      const rowIdx = i+2;
      const dt = vals[i][0] instanceof Date ? vals[i][0] : new Date(vals[i][0]);
      const status = vals[i][2];
      if (dt >= start && dt <= end && ['تم الاستلام','قيد التحضير','جديد'].indexOf(status) > -1){
        orders.getRange(rowIdx,3).setValue('مؤرشف');
        archived++;
      }
    }
  }

  // أرشفة العناصر التابعة
  const lastItems = items.getLastRow();
  if (lastItems >= 2) {
    const data = items.getRange(2,1,lastItems-1, CONFIG.ORDER_ITEMS_HEADERS.length).getValues();
    const ordersMap = {};
    for (let r=2; r<=orders.getLastRow(); r++){
      ordersMap[r] = orders.getRange(r,3).getValue();
    }
    for (let i=0;i<data.length;i++){
      const ordRow = Number(data[i][0]);
      if (ordersMap[ordRow] === 'مؤرشف') data[i][3] = 'مؤرشف';
    }
    items.getRange(2,1,lastItems-1, CONFIG.ORDER_ITEMS_HEADERS.length).setValues(data);
  }

  setCurrentShiftNumber(getCurrentShiftNumber()+1);
  return { archived };
}

// ===== Notifications =====
function sendNewOrderNotifications_(order) {
  var title = 'طلب جديد — #' + order.row;
  var body  =
    'طلب جديد تم استلامه:\n'+
    'رقم الطلب: #' + order.row + '\n' +
    'العميل: ' + (order.name || '-') + '\n' +
    'الهاتف: ' + (order.phone || '-') + '\n' +
    'المنطقة: ' + (order.area || '-') + '\n' +
    'الإجمالي: LE ' + (order.total || 0) + '\n\n' +
    'المحتويات:\n' + (order.formatted || '');

  // 1) Email (مجاني ضمن حصة Gmail/Apps Script)
  if (NOTIFY.ENABLE_EMAIL && Array.isArray(NOTIFY.OWNER_EMAILS) && NOTIFY.OWNER_EMAILS.length) {
    try {
      MailApp.sendEmail({
        to: NOTIFY.OWNER_EMAILS.join(','),
        subject: title,
        htmlBody: '<pre style="font-size:14px;line-height:1.6">'+escapeHtml_(body)+'</pre>'
      });
    } catch(e) {}
  }

  // 2) Telegram (مجاني — يحتاج Bot Token + Chat ID)
  if (NOTIFY.ENABLE_TELEGRAM && NOTIFY.TELEGRAM_BOT_TOKEN && NOTIFY.TELEGRAM_CHAT_ID) {
    try {
      var url = 'https://api.telegram.org/bot' + NOTIFY.TELEGRAM_BOT_TOKEN + '/sendMessage';
      var payload = { chat_id: NOTIFY.TELEGRAM_CHAT_ID, text: body };
      UrlFetchApp.fetch(url, { method: 'post', payload: payload, muteHttpExceptions: true });
    } catch(e) {}
  }

  // 3) Discord (مجاني — Incoming Webhook)
  if (NOTIFY.ENABLE_DISCORD && NOTIFY.DISCORD_WEBHOOK_URL) {
    try {
      var content = '**' + title + '**\n' + '```' + body + '```';
      UrlFetchApp.fetch(NOTIFY.DISCORD_WEBHOOK_URL, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ content: content }),
        muteHttpExceptions: true
      });
    } catch(e) {}
  }
}

function escapeHtml_(s) {
  return String(s).replace(/[&<>"']/g, function(m){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]);
  });
}

// ===== Read for dashboard =====
function getAllOrders_() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(CONFIG.ORDERS_SHEET);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, CONFIG.HEADERS.length).getValues();
  return values.map((v, i) => ({
    row: i + 2,
    Date: v[0] ? new Date(v[0]).toISOString() : '',
    Shift_Number: v[1],
    Status: v[2] || 'جديد',
    Name: v[3] || '',
    Phone: v[4] || '',
    Email: v[5] || '',
    Address: v[6] || '',
    Area: v[7] || '',
    Service: v[8] || 0,
    Subtotal: v[9] || 0,
    Totalprice: v[10] || 0,
    Products: v[11] || '[]',
    FormattedProducts: v[12] || '',
    Notes: v[13] || ''
  }));
}

// ===== Utilities =====
function jsonOut(obj, code) {
  const out = ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  if (code && out.setStatusCode) out.setStatusCode(code);
  return out;
}
