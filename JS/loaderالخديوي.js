
(function(){
  // اسم/مسار اللوجو (عدّل هنا أو عيّنه من الصفحة: window.KH_LOADER_LOGO)
  var LOGO_SRC = (window.KH_LOADER_LOGO || "img/لوجو.png");

  function createOverlay(){
    if (document.getElementById('khLoader')) return;
    const wrap = document.createElement('div');
    wrap.id = 'khLoader';
    wrap.className = 'kh-loader-backdrop';
    wrap.innerHTML = `
      <div class="kh-loader-box">
        <img class="kh-logo-img" src="${LOGO_SRC}" alt="Khediwe Logo" onerror="this.style.display='none'">
        <div class="kh-loader-text">جاري التحميل...</div>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  function showLoader(){
    const el = document.getElementById('khLoader');
    if (!el) return;
    el.classList.remove('kh-loader-hidden');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  function hideLoader(){
    const el = document.getElementById('khLoader');
    if (!el) return;
    el.classList.add('kh-loader-hidden');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  // واجهة عامة
  window.khLoader = { show: showLoader, hide: hideLoader };

  document.addEventListener('DOMContentLoaded', function(){
    createOverlay();
    showLoader();
    // جرّب تحميل الصورة بدري
    const testImg = new Image();
    testImg.src = LOGO_SRC;
  });

  window.addEventListener('load', function(){
    setTimeout(hideLoader, 200);
  });

  window.addEventListener('beforeunload', function(){
    showLoader();
  });

  // روابط داخلية
  document.addEventListener('click', function(e){
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const target = a.getAttribute('target');
    const isSameTab = !target || target === '_self';
    const isJs = href.startsWith('javascript:') || href.startsWith('#');
    if (isSameTab && href && !isJs) showLoader();
  });

  // فورمات
  document.addEventListener('submit', function(){ showLoader(); setTimeout(hideLoader, 2500); }, true);

  // لفّ fetch
  if (window.fetch) {
    const _f = window.fetch.bind(window);
    window.fetch = async function(){
      try{ showLoader(); }catch(_){}
      try{ return await _f.apply(this, arguments); }
      finally{ setTimeout(hideLoader, 180); }
    };
  }
})();

