/* =========================================================
   DanyCars — FAQ accordion (danycars-faq.html)
   Each question toggles independently (plus <-> minus).
   The first item starts open by default (see .is-open in HTML).
   ========================================================= */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var items = document.querySelectorAll('.faq-accordion-item');
    if (!items.length) return;

    items.forEach(function (item) {
      var question = item.querySelector('.faq-question');
      if (!question) return;

      question.addEventListener('click', function () {
        item.classList.toggle('is-open');
      });
    });
  });
})();
