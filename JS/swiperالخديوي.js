/* ===== Keep only the main slider (slied-swp) ===== */
try {
  if (typeof Swiper !== 'undefined') {
    if (document.querySelector('.slied-swp') && !window._sliedSwpInit) {
      window._sliedSwpInit = true;
      new Swiper('.slied-swp', {
        pagination: { el: '.swiper-pagination', dynamicBullets: true, clickable: true },
        autoplay: { delay: 2500 },
        loop: true
      });
    }
  }
} catch (e) {
  console.warn('slied-swp init error', e);
}

/* ===== Convert product containers to Grid after filling them ===== */
function convertContainerToGrid(id) {
  const el = document.getElementById(id);
  if (!el) return;

  // Destroy any swiper if exists
  const ancestor = el.closest('.slide_product, .mySwiper, .swiper-container');
  try {
    if (
      ancestor &&
      ancestor._swiperInstance &&
      typeof ancestor._swiperInstance.destroy === 'function'
    ) {
      ancestor._swiperInstance.destroy(true, true);
      ancestor._swiperInstance = null;
    }
    if (el.swiper && typeof el.swiper.destroy === 'function') {
      el.swiper.destroy(true, true);
    }
  } catch (e) {
    console.warn('destroy swiper error', e);
  }

  // Apply grid class
  el.classList.add('products-grid');

  // Reset inline styles from Swiper
  el.querySelectorAll('.swiper-slide').forEach((s) => {
    s.style.removeProperty('width');
    s.style.removeProperty('flex');
    s.style.removeProperty('max-width');
    s.style.removeProperty('margin');
  });
}

/* ===== Call for all product containers ===== */
[
  'swiper_items_sale',
  'swiper_kashri',
  'swiper_tajin',
  'swiper_mix',
  'swiper_sweet',
  'swiper_add',
  'swiper_top'
].forEach((id) => {
  convertContainerToGrid(id);
});
