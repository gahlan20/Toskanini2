
/*! Product Quick-View + Variants (كشري الخديوي)
 *  - Opens instead of direct add-to-cart
 *  - color filters images, pick size, qty
 *  - Confirm adds to existing cart format + options
 *  - Does NOT modify old files; uses capture-phase to intercept clicks
 */

(function () {
  const PRODUCTS_URL = 'productsالخديوي.json';

  let _allProducts = null;
  let _scrollY = 0;

  // Capture-phase listener to stop old add-to-cart
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn_add_cart');
    if (!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation(); // prevent existing listeners from firing
    const pid = btn.getAttribute('data-id');
    if (!pid) return;
    openQuickView(pid);
  }, true); // capture

  async function ensureData() {
    if (_allProducts) return _allProducts;
    const res = await fetch(PRODUCTS_URL);
    _allProducts = await res.json();
    return _allProducts;
  }

  async function openQuickView(productId) {
    const products = await ensureData();
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) return;

    _scrollY = window.scrollY;

    const modal = buildModal(product);
    document.body.appendChild(modal.backdrop);
    setTimeout(() => modal.backdrop.classList.add('active'), 10);
  }

  function buildModal(product) {
    const backdrop = document.createElement('div');
    backdrop.className = 'khed-modal-backdrop';
    backdrop.innerHTML = `
      <div class="khed-modal" role="dialog" aria-modal="true">
        <button class="khed-close" aria-label="Close">&times;</button>
        <div class="khed-modal__left">
          <div class="khed-modal__thumbs"></div>
          <div class="khed-modal__stage"><img alt=""></div>
        </div>
        <div class="khed-modal__right">
          <h3 class="khed-title">${escapeHtml(product.name || '')}</h3>
          <div class="khed-price">
            <span class="now">LE ${Number(product.price || 0).toFixed(2)}</span>
            ${product.old_price ? `<span class="old">LE ${Number(product.old_price).toFixed(2)}</span>` : ''}
          </div>
          <p class="khed-desc">${escapeHtml(product.desc || 'بدون وصف للمنتج')}</p>

          <div class="khed-options">
            <div class="khed-option-group khed-colors" style="display:none">
              <div class="khed-option-label">اللون</div>
              <div class="khed-color-pills"></div>
            </div>
            <div class="khed-option-group khed-sizes" style="display:none">
              <div class="khed-option-label">المقاس</div>
              <div class="khed-size-pills"></div>
            </div>
            <div class="khed-option-group khed-qty">
              <div class="khed-option-label">الكمية</div>
              <button type="button" data-act="dec">-</button>
              <input type="number" min="1" step="1" value="1">
              <button type="button" data-act="inc">+</button>
            </div>
          </div>

          <div class="khed-actions">
            <button class="khed-btn" data-act="confirm">تأكيد</button>
            <button class="khed-btn secondary" data-act="cancel">إلغاء</button>
          </div>
        </div>
      </div>
    `;

    const close = () => {
      backdrop.classList.remove('active');
      setTimeout(() => {
        backdrop.remove();
        window.scrollTo({ top: _scrollY });
      }, 180);
    };

    const modalEl = backdrop.querySelector('.khed-modal');
    backdrop.addEventListener('click', (ev) => {
      if (ev.target === backdrop) close();
    });
    backdrop.querySelector('.khed-close').addEventListener('click', close);
    backdrop.querySelector('[data-act="cancel"]').addEventListener('click', close);

    // Options: colors & sizes (backward compatible)
    const colorsWrap = backdrop.querySelector('.khed-colors');
    const sizesWrap  = backdrop.querySelector('.khed-sizes');
    const colorPills = backdrop.querySelector('.khed-color-pills');
    const sizePills  = backdrop.querySelector('.khed-size-pills');
    const qtyInput   = backdrop.querySelector('.khed-qty input');

    // Collect variants if present
    const variants = product.variants || {};
    const colors = Array.isArray(variants.colors) ? variants.colors : [];
    const sizes = Array.isArray(variants.sizes) ? variants.sizes : [];

    let selectedColor = colors.length ? (colors.find(c=>c.default) || colors[0]) : null;
    let selectedSize  = sizes.length ? (sizes.find(s=>s.default) || sizes[0]) : null;

    // Build color pills
    if (colors.length) {
      colorsWrap.style.display = 'grid';
      colors.forEach((c, idx) => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'khed-pill';
        if (c.hex) { pill.setAttribute('data-color', c.hex); pill.style.background = c.hex; pill.title = c.name || ''; }
        else { pill.textContent = c.name || '—'; }
        if (idx === 0 || c === selectedColor) pill.classList.add('active');
        pill.addEventListener('click', () => {
          colorPills.querySelectorAll('.khed-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          selectedColor = c;
          refreshImages();
        });
        colorPills.appendChild(pill);
      });
    }

    // Build size pills
    if (sizes.length) {
      sizesWrap.style.display = 'grid';
      sizes.forEach((s, idx) => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'khed-pill';
        pill.textContent = typeof s === 'string' ? s : (s.label || s.value || '—');
        if (idx === 0 || s === selectedSize) pill.classList.add('active');
        pill.addEventListener('click', () => {
          sizePills.querySelectorAll('.khed-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          selectedSize = s;
        });
        sizePills.appendChild(pill);
      });
    }

    // Quantity
    modalEl.querySelector('.khed-qty').addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-act]'); if (!btn) return;
      const act = btn.getAttribute('data-act');
      const v = Math.max(1, parseInt(qtyInput.value || '1', 10));
      qtyInput.value = String(act === 'inc' ? v + 1 : Math.max(1, v - 1));
    });

    // Images
    const stageImg = backdrop.querySelector('.khed-modal__stage img');
    const thumbs = backdrop.querySelector('.khed-modal__thumbs');
    function currentImages() {
      if (selectedColor && Array.isArray(selectedColor.images) && selectedColor.images.length) {
        return selectedColor.images;
      }
      if (Array.isArray(product.images) && product.images.length) return product.images;
      return [product.img].filter(Boolean);
    }
    function refreshImages() {
      const imgs = currentImages();
      thumbs.innerHTML = '';
      imgs.forEach((src, idx) => {
        const t = document.createElement('img');
        t.src = src;
        if (idx === 0) t.classList.add('active');
        t.addEventListener('click', () => {
          thumbs.querySelectorAll('img').forEach(x => x.classList.remove('active'));
          t.classList.add('active');
          stageImg.src = src;
        });
        thumbs.appendChild(t);
      });
      stageImg.src = imgs[0] || '';
    }
    refreshImages();

    // Confirm add
    modalEl.querySelector('[data-act="confirm"]').addEventListener('click', () => {
      const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));
      const imgs = currentImages();
      const primaryImage = imgs && imgs.length ? imgs[0] : (product.img || '');
      addToCartWithOptions(product, {
        color: selectedColor ? (selectedColor.value || selectedColor.hex || selectedColor.name) : null,
        colorLabel: selectedColor ? (selectedColor.name || selectedColor.value || selectedColor.hex) : null,
        size: selectedSize ? (selectedSize.value || selectedSize) : null,
        sizeLabel: selectedSize ? (selectedSize.label || selectedSize.value || selectedSize) : null,
        images: imgs,
        primaryImage: primaryImage
      }, qty);
      close();
    });

    return { backdrop };
  }

  function addToCartWithOptions(product, opts, qty) {
    // Ensure chosen image (first of selected color) is used for cart preview
    
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');

    // Try to merge with existing same product+options
    const keyMatch = (it) =>
      String(it.id) === String(product.id) &&
      String(it.selectedColor || '') === String(opts.color || '') &&
      String(it.selectedSize || '') === String(opts.size || '');

    const existing = cart.find(keyMatch);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + qty;
    } else {
      cart.push({
        ...product,
        img: (opts && opts.primaryImage) ? opts.primaryImage : (product.img || ''),
        quantity: qty,
        selectedColor: opts.color,
        selectedColorLabel: opts.colorLabel,
        selectedSize: opts.size,
        selectedSizeLabel: opts.sizeLabel,
        images: Array.isArray(opts.images) ? opts.images : undefined
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));

    // If the old updateCart() exists, call it to refresh UI
    if (typeof window.updateCart === 'function') {
      try { window.updateCart(); } catch(e){}
    }

    // Toast
    toast('تم إضافة المنتج بالتفاصيل إلى السلة ✨');
  }

  function toast(msg) {
    let el = document.querySelector('.khed-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'khed-toast';
      Object.assign(el.style, {
        position: 'fixed', bottom: '18px', left: '50%', transform: 'translateX(-50%)',
        background: '#111', color: '#fff', padding: '10px 14px', borderRadius: '8px',
        zIndex: 4000, boxShadow: '0 8px 24px rgba(0,0,0,.25)', opacity: '0',
        transition: 'opacity .2s'
      });
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(()=>{ el.style.opacity = '0'; }, 1700);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[s]));
  }
})();
