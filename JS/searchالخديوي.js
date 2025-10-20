/*! searchالخديوي.js — نسخة مُحسَّنة وآمنة لكل الصفحات (2025-10-20)
------------------------------------------------------------------------------
- يمنع أخطاء null لما عناصر البحث مش موجودة في بعض الصفحات.
- ينشئ صندوق اقتراحات تلقائيًا لو مش موجود في الـ DOM.
- بحث حيّ (debounce)، تنقّل بالكيبورد (↑/↓/Enter/Esc)، وكليك للاختيار.
- يمرّ على name / category / store، ويقفّل نفسه بهدوء لو مفيش عناصر.
------------------------------------------------------------------------------*/
(function () {
  if (window._khSearchInit) return; // منع التكرار
  window._khSearchInit = true;

  document.addEventListener("DOMContentLoaded", () => {
    // 1) عناصر البحث
    const searchInput = document.getElementById("search");
    if (!searchInput) return; // الصفحة مافيهاش سيرش — خروج بدون أخطاء

    // 2) صندوق الاقتراحات (أنشئه لو مش موجود)
    let suggestionsBox = document.getElementById("search_suggestions");
    if (!suggestionsBox) {
      suggestionsBox = document.createElement("div");
      suggestionsBox.id = "search_suggestions";
      suggestionsBox.className = "search_suggestions";
      // لو عندك .search_box بنحطها جواها، وإلا نحطها بعد الإنبت مباشرة
      const host = document.querySelector(".search_box") || searchInput.parentElement || document.body;
      host.appendChild(suggestionsBox);
    }

    // 3) تحميل البيانات
    let allData = [];
    fetch("productsالخديوي.json")
      .then((res) => res.json())
      .then((data) => {
        allData = Array.isArray(data) ? data : [];
      })
      .catch(() => {
        allData = [];
      });

    // 4) أدوات مساعدة
    const DEBOUNCE_MS = 140;
    let debounceTimer = null;
    let activeIndex = -1; // المؤشر الحالي داخل قائمة الاقتراحات

    function debounce(fn, ms) {
      return function (...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fn.apply(this, args), ms);
      };
    }

    function normalize(v) {
      return (v || "").toString().toLowerCase().trim();
    }

    function clearSuggestions() {
      suggestionsBox.innerHTML = "";
      suggestionsBox.classList.remove("active");
      activeIndex = -1;
    }

    function ensureVisible() {
      // تأكد أن الصندوق ظاهر أسفل الإنبت
      suggestionsBox.classList.add("active");
    }

    function highlightEl(el) {
      try {
        el.classList.add("highlight");
        setTimeout(() => el.classList.remove("highlight"), 1800);
      } catch (_) {}
    }

    function renderSuggestions(results) {
      suggestionsBox.innerHTML = "";

      if (!results.length) {
        const noRes = document.createElement("div");
        noRes.textContent = "لا توجد نتائج";
        suggestionsBox.appendChild(noRes);
        ensureVisible();
        return;
      }

      results.slice(0, 12).forEach((item, idx) => {
        const row = document.createElement("div");
        row.className = "suggestion-row";
        row.setAttribute("role", "option");
        row.dataset.index = String(idx);
        row.textContent = `${item.name || "بدون اسم"}${item.catetory ? " (" + item.catetory + ")" : ""}`;
        row.addEventListener("click", () => selectResult(item));
        suggestionsBox.appendChild(row);
      });

      activeIndex = -1;
      ensureVisible();
    }

    function setActive(indexDelta) {
      const items = suggestionsBox.querySelectorAll(".suggestion-row");
      if (!items.length) return;

      // إزالة القديم
      if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].classList.remove("active");

      // حساب الجديد
      activeIndex = (activeIndex + indexDelta + items.length) % items.length;

      // تعيين الجديد
      items[activeIndex].classList.add("active");
      // Scroll لضمان الظهور
      items[activeIndex].scrollIntoView({ block: "nearest" });
    }

    function selectActive() {
      const items = suggestionsBox.querySelectorAll(".suggestion-row");
      if (activeIndex >= 0 && items[activeIndex]) {
        items[activeIndex].click();
      }
    }

    function selectResult(item) {
      // حط الاسم في الإنبت
      searchInput.value = item.name || "";
      clearSuggestions();

      // حاول تلاقي العنصر في الصفحة
      const target = document.getElementById(`product-${item.id}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => window.scrollBy({ top: -70, behavior: "smooth" }), 300);
        highlightEl(target);
      }
    }

    // 5) البحث الحيّ
    const handleSearch = debounce(function () {
      const q = normalize(searchInput.value);
      if (!q) return clearSuggestions();

      const results = allData.filter((item) => {
        const n = normalize(item.name);
        const c = normalize(item.catetory);
        const s = normalize(item.store);
        return n.includes(q) || c.includes(q) || s.includes(q);
      });

      renderSuggestions(results);
    }, DEBOUNCE_MS);

    searchInput.addEventListener("input", handleSearch);
    searchInput.addEventListener("focus", handleSearch);

    // 6) تنقّل بالكيبورد
    searchInput.addEventListener("keydown", (e) => {
      if (!suggestionsBox.classList.contains("active")) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActive(+1);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActive(-1);
          break;
        case "Enter":
          e.preventDefault();
          selectActive();
          break;
        case "Escape":
          clearSuggestions();
          break;
      }
    });

    // 7) إخفاء عند الضغط خارج
    document.addEventListener("click", (e) => {
      const inside =
        e.target === searchInput ||
        e.target.closest("#search_suggestions") ||
        e.target.closest(".search_box");
      if (!inside) clearSuggestions();
    });

    // 8) حماية إضافية: لو حد نادى دالة البحث من بره
    window.khediveSearchRefresh = handleSearch;
  });
})();
