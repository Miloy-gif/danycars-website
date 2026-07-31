/* =========================================================
   DanyCars — Usługi (services mini-cards) reveal animation
   Adds .is-visible to .services-grid the first time it
   scrolls into view; the staggered timing itself lives in
   services.css (transition-delay per nth-child).
   ========================================================= */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var grid = document.querySelector('.services-grid');
    if (!grid) return;

    function reveal() {
      grid.classList.add('is-visible');
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(
        function (entries, obs) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              reveal();
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(grid);
    } else {
      /* Fallback for very old browsers without IntersectionObserver */
      reveal();
    }
  });
})();
