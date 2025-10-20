
/*! Runtime color/size injector for dashboard (no edits to old code) */
(function(){
  var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz-lU5fK8J01r01gk5z7gsas6_oqbgZ4qYAwimgg3Bc2VxKZt-b0KI2vEXsXr9Wxhs/exec'; // نفس الموجود في dashboard

  var ordersMap = {}; // row -> products[]

  async function loadOrdersOnce(){
    try {
      const res = await fetch(SCRIPT_URL);
      const data = await res.json();
      // data is array of orders
      ordersMap = {};
      if (Array.isArray(data)){
        data.forEach(function(o){
          try {
            var prods = JSON.parse(o.Products || '[]');
            ordersMap[String(o.row)] = Array.isArray(prods) ? prods : [];
          } catch(e){}
        });
      }
    } catch(e){}
  }

  // format one <ul> using products[] with color/size if present
  function renderUL(ul, products){
    if (!ul || !Array.isArray(products) || !products.length) return;
    ul.innerHTML = '';
    products.forEach(function(p){
      var name = p.name || '---';
      var qty  = p.quantity || 1;
      var price = (p.price!=null? p.price : 0);
      var bits = [];
      if (p.selectedColorLabel || p.selectedColor) bits.push('اللون: '+(p.selectedColorLabel || p.selectedColor));
      if (p.selectedSizeLabel || p.selectedSize) bits.push('المقاس: '+(p.selectedSizeLabel || p.selectedSize));
      var extra = bits.length ? ' — ' + bits.join(' | ') : '';
      var li = document.createElement('li');
      li.textContent = name + extra + ' (الكمية: ' + qty + ') - السعر: ' + price;
      ul.appendChild(li);
    });
  }

  function tryEnhanceCard(card){
    if (!card) return;
    var row = card.getAttribute('data-row');
    if (!row) return;
    var products = ordersMap[String(row)];
    if (!products || !products.length) return;
    var ul = card.querySelector('.order-details ul');
    if (!ul) return;
    renderUL(ul, products);
  }

  // Observe mutations and enhance cards when they appear
  var observer = new MutationObserver(function(muts){
    muts.forEach(function(m){
      m.addedNodes && m.addedNodes.forEach(function(node){
        if (node.nodeType === 1){ // ELEMENT
          if (node.classList && node.classList.contains('order-card')) {
            tryEnhanceCard(node);
          } else {
            node.querySelectorAll && node.querySelectorAll('.order-card').forEach(tryEnhanceCard);
          }
        }
      });
    });
  });

  function startObserver(){
    var list = document.getElementById('order-list');
    if (!list) return false;
    observer.observe(list, { childList: true, subtree: true });
    // initial pass after load
    list.querySelectorAll('.order-card').forEach(tryEnhanceCard);
    return true;
  }

  async function init(){
    await loadOrdersOnce();
    var ok = startObserver();
    if (!ok){
      // retry until list exists
      var tries = 0, id = setInterval(function(){
        tries++;
        if (startObserver()){
          clearInterval(id);
        }
        if (tries > 40) clearInterval(id);
      }, 250);
    }
    // periodic refresh of orders then re-enhance visible cards
    setInterval(async function(){
      await loadOrdersOnce();
      document.querySelectorAll('.order-card').forEach(tryEnhanceCard);
    }, 10000);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
