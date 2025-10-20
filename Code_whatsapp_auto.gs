/**
 * كشري الخديوي — Google Apps Script backend (نسخة كاملة مع واتساب تلقائي)
 *
 * الميزات:
 * - جداول Orders و OrderItems (تفصيلي لكل عنصر)
 * - doGet: يرجّع كل الطلبات كـ JSON + getShiftNumber
 * - doPost: addOrder | updateStatus | endShift
 * - إشعار إيميل (اختياري)
 * - إرسال واتساب تلقائي عبر WhatsApp Cloud API عند تغيير الحالة إلى "تم الاستلام"
 *
 * هام: استخدام WhatsApp Cloud API يتطلب:
 *  - Meta Business Manager + WhatsApp Business API
 *  - PHONE_NUMBER_ID + Permanent Access Token
 *  - قالب رسالة (Template) معتمد باسم WA.TEMPLATE_NAME
 *  - أول 1000 محادثة شهريًا مجانًا من واتساب؛ بعدها محاسبة لكل محادثة.
 */

// ===== (1) إعدادات الإشعارات الاختيارية عبر البريد =====
const NOTIFY = {
  ENABLE_EMAIL: false,                 // اجعلها true لو عايز إيميل للفريق
  OWNER_EMAILS: ['your-email@example.com']
};

// ===== (2) إعدادات واتساب السحابية (مطلوبة للتلقائي) =====
const WA = {
  TOKEN: 'PASTE_YOUR_PERMANENT_ACCESS_TOKEN_HERE',  // ضع الـ Permanent Access Token
  PHONE_NUMBER_ID: 'PASTE_PHONE_NUMBER_ID_HERE',    // ضع الـ phone_number_id
  TEMPLATE_NAME: 'order_confirmation_ar',           // اسم القالب المعتمد
  TEMPLATE_LANG: 'ar',                               // 'ar' أو 'ar_EG' حسب اعتماد القالب
  DELIVERY_DAYS: 3,                                  // عدد الأيام للتسليم في الرسالة
  FALLBACK_SHOP_PHONE: '01000000000'                 // رقم خدمة العملاء في آخر الرسالة
};

// ===== (3) إعدادات الجداول =====
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

// ====== تهيئة الشيتات ======
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

// ====== رقم الوردية ======
function getCurrentShiftNumber() {
  ensureSheets();
  const ss = SpreadsheetApp.getActive();
  return Number(ss.getSheetByName(CONFIG.META_SHEET).getRange('A1').getValue() || 1) || 1;
}
function setCurrentShiftNumber(n) {
  SpreadsheetApp.getActive().getSheetByName(CONFIG.META_SHEET).getRange('A1').setValue(Number(n));
}

// ====== تنسيق المنتجات لعرض مقروء ======
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

// ====== Handlers ======
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

// ====== الأعمال ======
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

  // إشعار بريد (اختياري)
  if (NOTIFY.ENABLE_EMAIL && Array.isArray(NOTIFY.OWNER_EMAILS) && NOTIFY.OWNER_EMAILS.length) {
    try {
      var subject = 'طلب جديد — #' + lastRow;
      var body = 'عميل: ' + Name + '\\nهاتف: ' + Phone + '\\nمنطقة: ' + Area + '\\nإجمالي: LE ' + Totalprice + '\\n\\n' + formatProductsForSheet(Products);
      MailApp.sendEmail({
        to: NOTIFY.OWNER_EMAILS.join(','),
        subject: subject,
        htmlBody: '<pre style="font-size:14px;line-height:1.6">'+escapeHtml_(body)+'</pre>'
      });
    } catch(e) {}
  }

  return { row: lastRow };
}

function updateStatus_(row, status) {
  const ss = SpreadsheetApp.getActive();
  const orders = ss.getSheetByName(CONFIG.ORDERS_SHEET);
  const items  = ss.getSheetByName(CONFIG.ORDER_ITEMS_SHEET);

  // حدّث الحالة في Orders
  orders.getRange(row, 3).setValue(status);

  // مزامنة OrderItems لنفس الطلب
  const last = items.getLastRow();
  if (last >= 2) {
    const data = items.getRange(2,1,last-1, CONFIG.ORDER_ITEMS_HEADERS.length).getValues();
    for (let i=0;i<data.length;i++){
      if (Number(data[i][0]) === Number(row)) data[i][3] = status;
    }
    items.getRange(2,1,last-1, CONFIG.ORDER_ITEMS_HEADERS.length).setValues(data);
  }

  // ===== إرسال واتساب تلقائيًا عند "تم الاستلام" =====
  if (status === 'تم الاستلام') {
    // اقرأ الصف الحالي بالكامل لبناء الرسالة
    const vals = orders.getRange(row, 1, 1, CONFIG.HEADERS.length).getValues()[0];
    const order = {
      row: row,
      Date: vals[0],
      Shift_Number: vals[1],
      Status: vals[2],
      Name: vals[3],
      Phone: vals[4],
      Email: vals[5],
      Address: vals[6],
      Area: vals[7],
      Service: vals[8],
      Subtotal: vals[9],
      Totalprice: vals[10],
      Products: vals[11],
      FormattedProducts: vals[12],
      Notes: vals[13]
    };

    // إرسال عبر WhatsApp Cloud API
    try {
      var msisdn = toIntlMsisdn_(order.Phone, '20'); // غير كود الدولة لو لزم
      if (msisdn && WA.TOKEN && WA.PHONE_NUMBER_ID) {
        sendWhatsAppTemplate_(msisdn, order);
      }
    } catch(e) {}
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
    // اعمل خريطة حالة الطلبات بعد التعديل
    const map = {};
    for (let r=2; r<=orders.getLastRow(); r++){
      map[r] = orders.getRange(r,3).getValue();
    }
    for (let i=0;i<data.length;i++){
      const ordRow = Number(data[i][0]);
      if (map[ordRow] === 'مؤرشف') data[i][3] = 'مؤرشف';
    }
    items.getRange(2,1,lastItems-1, CONFIG.ORDER_ITEMS_HEADERS.length).setValues(data);
  }

  setCurrentShiftNumber(getCurrentShiftNumber()+1);
  return { archived };
}

// ====== WhatsApp Cloud API ======
// إرسال رسالة قالب واتساب (Business-initiated)
function sendWhatsAppTemplate_(toMsisdn, order) {
  var url = 'https://graph.facebook.com/v20.0/' + WA.PHONE_NUMBER_ID + '/messages';
  var payload = {
    messaging_product: 'whatsapp',
    to: toMsisdn,   // رقم دولي بدون +
    type: 'template',
    template: {
      name: WA.TEMPLATE_NAME,
      language: { code: WA.TEMPLATE_LANG },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: String(order.row || '') },                 // رقم الطلب
            { type: 'text', text: String(order.Name || '-') },               // اسم العميل
            { type: 'text', text: String(order.Phone || '-') },              // رقم الهاتف
            { type: 'text', text: String(order.Address || '-') },            // العنوان
            { type: 'text', text: String(order.Totalprice || 0) },           // الإجمالي
            { type: 'text', text: formatProductsForSheet(order.Products) },  // قائمة المنتجات
            { type: 'text', text: datePlusDays_(WA.DELIVERY_DAYS) },         // تاريخ التسليم المتوقع
            { type: 'text', text: WA.FALLBACK_SHOP_PHONE }                   // رقم خدمة العملاء
          ]
        }
      ]
    }
  };

  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + WA.TOKEN },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  // Logger.log(res.getResponseCode() + ' ' + res.getContentText());
}

// تحويل رقم محلي إلى دولي (افتراضي مصر 20)
function toIntlMsisdn_(raw, countryCode) {
  countryCode = countryCode || '20';
  var d = String(raw || '').replace(/\D+/g,'');
  if (!d) return '';
  if (d.startsWith(countryCode)) return d;
  if (d.startsWith('0')) return countryCode + d.slice(1);
  return countryCode + d;
}

// تاريخ + أيام (dd-mm-yyyy)
function datePlusDays_(days) {
  var d = new Date();
  d.setDate(d.getDate() + (parseInt(days,10)||0));
  var dd = String(d.getDate()).padStart(2,'0');
  var mm = String(d.getMonth()+1).padStart(2,'0');
  var yy = d.getFullYear();
  return dd + '-' + mm + '-' + yy;
}

// ====== القراءة للداشبورد ======
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

// ====== Utilities ======
function jsonOut(obj, code) {
  const out = ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  if (code && out.setStatusCode) out.setStatusCode(code);
  return out;
}
function escapeHtml_(s) {
  return String(s).replace(/[&<>"']/g, function(m){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]);
  });
}
