
/*! Dashboard patch: show color/size inside "محتويات الطلب" without editing old file */
(function () {
  // wait for dashboard script to define things
  function ready(fn){ if(document.readyState!=='loading'){ fn(); } else { document.addEventListener('DOMContentLoaded', fn); } }
  ready(function(){
    // Hook after every render by monkey-patching displayOrders
    var tried = 0;
    (function hook(){
      tried++;
      if (typeof window.displayOrders !== 'function') {
        if (tried < 50) return setTimeout(hook, 200);
        return;
      }
      var original = window.displayOrders;
      window.displayOrders = function(orders, filterStatus){
        original.call(this, orders, filterStatus);
        try {
          var list = document.getElementById('order-list');
          if (!list) return;
          list.querySelectorAll('.order-card').forEach(function(card){
            var ul = card.querySelector('.order-details ul');
            if (!ul) return;
            // Try to find the order data for this card (dataset.row)
            var row = card.dataset.row;
            var order = (Array.isArray(window.allOrders) ? window.allOrders : []).find(function(o){ return String(o.row) === String(row); });
            // Fallback: parse from DOM (already there) – but we prefer parsing JSON again.
            // Rebuild list if order.Products is available
            if (order && (order.Products || order.products)) {
              try {
                var products = JSON.parse(order.Products || order.products || '[]');
                if (Array.isArray(products) && products.length) {
                  ul.innerHTML = '';
                  products.forEach(function(p){
                    var name = p.name || '---';
                    var qty  = p.quantity || 1;
                    var price = (p.price!=null? p.price : 0);
                    var parts = [name];
                    if (p.selectedColorLabel || p.selectedColor) parts.push('اللون: '+ (p.selectedColorLabel || p.selectedColor));
                    if (p.selectedSizeLabel || p.selectedSize)   parts.push('المقاس: '+ (p.selectedSizeLabel || p.selectedSize));
                    var extra = parts.slice(1).join(' | ');
                    var li = document.createElement('li');
                    li.textContent = (extra? (name+' — '+extra) : name) + ' (الكمية: '+qty+') - السعر: '+price;
                    ul.appendChild(li);
                  });
                }
              } catch (e) {}
            }
          });
        } catch (e) {}
      };
    })();
  });
})();
