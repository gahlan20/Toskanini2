
/*! Enhance checkout + cart items rendering (options display) */
(function () {
  // Patch updateCart if present, else wait
  function patch() {
    const original = window.updateCart;
    if (typeof original !== 'function') return false;

    window.updateCart = function patchedUpdateCart() {
      original.apply(this, arguments);
      try {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        // In cart side panel
        document.querySelectorAll('.items_in_cart .item_cart').forEach((itemEl, idx) => {
          const it = cart[idx]; if (!it) return;
          // add options line if exists
          const content = itemEl.querySelector('.content');
          if (!content) return;
          let extra = content.querySelector('.khed-options-line');
          if (!extra) {
            extra = document.createElement('div');
            extra.className = 'khed-options-line';
            extra.style.fontSize = '12px';
            extra.style.color = '#666';
            content.appendChild(extra);
          }
          const parts = [];
          if (it.selectedColorLabel || it.selectedColor) parts.push(`اللون: ${it.selectedColorLabel || it.selectedColor}`);
          if (it.selectedSizeLabel || it.selectedSize) parts.push(`المقاس: ${it.selectedSizeLabel || it.selectedSize}`);
          extra.textContent = parts.join(' | ');
        });

        // In checkout page list
        const checkoutWrap = document.getElementById('checkout_items');
        if (checkoutWrap) {
          checkoutWrap.querySelectorAll('.item_cart').forEach((itemEl, idx) => {
            const it = cart[idx]; if (!it) return;
            const content = itemEl.querySelector('.content');
            if (!content) return;
            let extra = content.querySelector('.khed-options-line');
            if (!extra) {
              extra = document.createElement('div');
              extra.className = 'khed-options-line';
              extra.style.fontSize = '12px';
              extra.style.color = '#666';
              extra.style.marginTop = '4px';
              content.appendChild(extra);
            }
            const parts = [];
            if (it.selectedColorLabel || it.selectedColor) parts.push(`اللون: ${it.selectedColorLabel || it.selectedColor}`);
            if (it.selectedSizeLabel || it.selectedSize) parts.push(`المقاس: ${it.selectedSizeLabel || it.selectedSize}`);
            extra.textContent = parts.join(' | ');
          });
        }
      } catch (e) {}
    };
    // Run once to refresh if cart exists
    try { window.updateCart(); } catch(e){}
    return true;
  }

  if (!patch()) {
    const id = setInterval(() => { if (patch()) clearInterval(id); }, 200);
    setTimeout(()=> clearInterval(id), 6000);
  }
})();
