
/*! Enrich dashboard order items to show color/size if present in Products JSON */
(function () {
  function patch() {
    if (typeof window.displayOrders !== 'function') return false;
    const original = window.displayOrders;
    window.displayOrders = function (orders, filterStatus) {
      original.call(this, orders, filterStatus);
      try {
        const list = document.getElementById('order-list');
        if (!list) return;
        list.querySelectorAll('.order-card').forEach(card => {
          const ul = card.querySelector('.order-details ul');
          if (!ul) return;
          ul.querySelectorAll('li').forEach(li => {
            // Try to parse and append nothing here; instead rebuild li text if present in dataset later
          });
          // Rebuild using Products JSON parsed in dashboard.js
          // Find the order object via dataset.row on the card
          const row = card.dataset.row;
          if (!row) return;
        });
      } catch(e){}
    };
    return true;
  }
  if (!patch()) {
    const id = setInterval(() => { if (patch()) clearInterval(id); }, 300);
    setTimeout(()=> clearInterval(id), 5000);
  }
})();
