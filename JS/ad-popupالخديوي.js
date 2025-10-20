
/*! Ad Popup (الخديوي) - Adds an image/video ad with 5s timer before closing is enabled.
    How to configure:
      window.AD_POPUP_CONFIG = {
        mediaType: 'image' | 'video',
        src: 'img/your-ad.jpg' or 'videos/your-ad.mp4',
        poster: 'img/poster.jpg'      // optional for video
        autoplay: true,               // for video
        muted: true,                  // for video (autoplay requires muted in most browsers)
        countdownSeconds: 5           // show close after N seconds
      }
*/
(function () {
  const CFG = Object.assign({
    mediaType: 'image',
    src: 'img/لوجو.png',
    poster: '',
    autoplay: true,
    muted: true,
    countdownSeconds: 5
  }, (window.AD_POPUP_CONFIG || {}));

  const makeEl = (tag, cls, html) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  };

  function buildPopup() {
    const overlay = makeEl('div', 'ad-overlay');
    const modal = makeEl('div', 'ad-modal');
    const mediaWrap = makeEl('div', 'ad-media-wrap');

    let mediaEl;
    if (CFG.mediaType === 'video') {
      mediaEl = document.createElement('video');
      mediaEl.setAttribute('playsinline', '');
      mediaEl.setAttribute('webkit-playsinline', '');
      mediaEl.controls = false;
      mediaEl.autoplay = !!CFG.autoplay;
      mediaEl.muted = !!CFG.muted;
      mediaEl.loop = true;
      if (CFG.poster) mediaEl.poster = CFG.poster;
      const srcEl = document.createElement('source');
      srcEl.src = CFG.src;
      srcEl.type = 'video/mp4';
      mediaEl.appendChild(srcEl);
    } else {
      mediaEl = document.createElement('img');
      mediaEl.src = CFG.src;
      mediaEl.alt = 'إعلان';
      mediaEl.loading = 'eager';
      mediaEl.decoding = 'async';
    }
    mediaWrap.appendChild(mediaEl);

    const footer = makeEl('div', 'ad-footer');
    const msg = makeEl('div', 'ad-countdown', 'سيتم تفعيل زر الإغلاق بعد <b id="ad-count">'
      + (CFG.countdownSeconds) + '</b> ثانية');
    const closeBtn = makeEl('button', 'ad-close', 'إغلاق الإعلان');
    const xBadge = makeEl('div', 'ad-x', '&times;');

    footer.appendChild(msg);
    footer.appendChild(closeBtn);

    modal.appendChild(mediaWrap);
    modal.appendChild(footer);
    modal.appendChild(xBadge);
    overlay.appendChild(modal);

    document.body.appendChild(overlay);

    // show overlay
    requestAnimationFrame(() => overlay.classList.add('ad-show'));

    // start countdown
    let remain = Math.max(0, parseInt(CFG.countdownSeconds, 10) || 5);
    const countEl = msg.querySelector('#ad-count');
    const enableClose = () => {
      closeBtn.classList.add('ad-enabled');
      xBadge.classList.add('ad-enabled');
      closeBtn.style.cursor = 'pointer';
      closeBtn.addEventListener('click', () => destroy());
      xBadge.addEventListener('click', () => destroy());
      // also allow overlay click outside modal after enabled
      overlay.addEventListener('click', (e) => {
        if (!modal.contains(e.target)) destroy();
      });
    };

    const timer = setInterval(() => {
      remain -= 1;
      if (remain <= 0) {
        clearInterval(timer);
        if (countEl) countEl.textContent = '0';
        msg.textContent = 'يمكنك إغلاق الإعلان الآن';
        enableClose();
      } else {
        if (countEl) countEl.textContent = String(remain);
      }
    }, 1000);

    function destroy() {
      try { clearInterval(timer); } catch {}
      overlay.classList.remove('ad-show');
      // small fade-out
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 200);
      try {
        if (mediaEl && mediaEl.tagName === 'VIDEO') {
          mediaEl.pause();
          mediaEl.src = '';
        }
      } catch {}
    }

    // Autoplay video when visible
    if (mediaEl && mediaEl.tagName === 'VIDEO' && CFG.autoplay) {
      const play = () => mediaEl.play().catch(() => {});
      if (document.visibilityState === 'visible') play();
      document.addEventListener('visibilitychange', play, { once: true });
    }
  }

  // Wait for DOM then inject
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildPopup);
  } else {
    buildPopup();
  }
})();
