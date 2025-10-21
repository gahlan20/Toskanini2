
/*! WhatsApp customer notifier on "تم الاستلام" (no edits to old code)
 * - Hooks clicks on .received-btn in dashboard
 * - Reads the order row from .order-card[data-row]
 * - Fetches order details from Apps Script GET
 * - Builds Arabic WhatsApp message (name, phone, address, items, delivery after N days)
 * - Opens wa.me with customer's phone (international format)
 *
 * ملاحظات:
 * - واتساب لا يسمح بالإرسال التلقائي تمامًا مجانًا، لذا بنفتح wa.me والمرسل يضغط Send.
 * - عيّن رقم هاتف المحل في SHOP_PHONE.
 * - DELIVERY_DAYS: عدد الأيام للتسليم (افتراضي 3).
 */

(function(){
  // === إعدادات قابلة للتخصيص ===
  var SCRIPT_URL   = 'https://script.google.com/macros/s/AKfycbz-lU5fK8J01r01gk5z7gsas6_oqbgZ4qYAwimgg3Bc2VxKZt-b0KI2vEXsXr9Wxhs/exec';
  var COUNTRY_CODE = '20';           // مصر
  var SHOP_PHONE   = '01287003333';  // ← حط رقم خدمة العملاء
  var DELIVERY_DAYS = 3;             // التسليم بعد كم يوم؟

  var cache = { rows: {}, lastFetch: 0 };

  async function fetchAllOrders(){
    // simple cache, refresh every 15s
    var now = Date.now();
    if (now - cache.lastFetch < 15000 && cache.list) return cache.list;
    var res = await fetch(SCRIPT_URL);
    var data = await res.json();
    cache.list = Array.isArray(data) ? data : [];
    cache.lastFetch = now;
    cache.rows = {};
    cache.list.forEach(function(o){ cache.rows[String(o.row)] = o; });
    return cache.list;
  }

  function toIntlPhone(raw){
    // Keep digits only
    var digits = String(raw || '').replace(/\D+/g, '');
    if (!digits) return '';
    // If already starts with country code, keep it; if starts with 0, replace with country code
    if (digits.startsWith(COUNTRY_CODE)) return digits;
    if (digits.startsWith('0')) return COUNTRY_CODE + digits.slice(1);
    // fallback: prepend country code
    return COUNTRY_CODE + digits;
  }

  function fmtDatePlusDays(days){
    var d = new Date();
    d.setDate(d.getDate() + (parseInt(days,10)||0));
    var y = d.getFullYear();
    var m = (d.getMonth()+1).toString().padStart(2,'0');
    var dd= d.getDate().toString().padStart(2,'0');
    return dd + '-' + m + '-' + y;
  }

  function buildMessage(o){
    var lines = [];
    lines.push('Toskaniniتأكيد استلام طلبك من   ✅');
    lines.push('رقم الطلب: #' + o.row);
    lines.push('الاسم: ' + (o.Name || '-'));
    lines.push('الهاتف: ' + (o.Phone || '-'));
    lines.push('العنوان: ' + (o.Address || '-') + (o.Area ? (' — ' + o.Area) : ''));
    lines.push('الإجمالي: LE ' + (o.Totalprice || 0));
    lines.push('-----------------------');
    var content = o.FormattedProducts;
    if (!content) {
      try {
        var arr = JSON.parse(o.Products || '[]');
        if (Array.isArray(arr) && arr.length){
          content = arr.map(function(p){
            var name = p.name || '';
            var qty  = p.quantity || 1;
            var price= (p.price!=null?p.price:0);
            var bits = [];
            if (p.selectedColorLabel || p.selectedColor) bits.push('اللون: '+(p.selectedColorLabel || p.selectedColor));
            if (p.selectedSizeLabel || p.selectedSize) bits.push('المقاس: '+(p.selectedSizeLabel || p.selectedSize));
            var extra = bits.length ? ' — ' + bits.join(' | ') : '';
            return name + extra + ' ×' + qty + ' — LE:' + price;
          }).join('\n');
        } else {
          content = '';
        }
      } catch(e){ content = ''; }
    }
    if (content) lines.push(content);
    lines.push('-----------------------');
    lines.push('موعد التسليم المتوقع: خلال ' + DELIVERY_DAYS + ' أيام (حتى ' + fmtDatePlusDays(DELIVERY_DAYS) + ')');
    lines.push('لو حابب تعدّل أي حاجة، كلمنا على: ' + SHOP_PHONE);
    return lines.join('\n');
  }

  async function handleReceivedClick(btn){
    try {
      var card = btn.closest('.order-card');
      if (!card) return;
      var row  = card.getAttribute('data-row');
      if (!row) return;

      // نترك الكود القديم يحدّث الحالة كما هو؛ نحن فقط نكمل بعد لحظات
      setTimeout(async function(){
        await fetchAllOrders();
        var order = cache.rows[String(row)];
        if (!order) return;
        var phoneIntl = toIntlPhone(order.Phone);
        if (!phoneIntl) return;

        var msg = buildMessage(order);
        var url = 'https://wa.me/01287003333' + phoneIntl + '?text=' + encodeURIComponent(msg);
        window.open(url, '_blank'); // يفتح واتساب ويب/الموبايل ويرسل المستخدم الرسالة
      }, 500);
    } catch(e){}
  }

  // Capture-phase hook for any .received-btn click
  document.addEventListener('click', function(ev){
    var btn = ev.target.closest && ev.target.closest('.received-btn');
    if (!btn) return;
    // لا نمنع الحدث من الكود القديم — فقط نضيف سلوكنا
    handleReceivedClick(btn);
  }, true);
})();
