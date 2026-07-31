/* =========================================================
   DanyCars — Pakiety (flip-card packages section) behaviour
   - Clicking "Zobacz pakiet" on the front flips the card open.
   - Opening a card automatically closes any other open card.
   - Clicking "Zobacz pakiet" again on an already-open card,
     or the "Powrót" link on the back, flips it closed.
   ========================================================= */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var cards = document.querySelectorAll('.package-card');
    if (!cards.length) return;

    function closeAllExcept(exceptCard) {
      cards.forEach(function (card) {
        if (card !== exceptCard) {
          card.classList.remove('is-flipped');
        }
      });
    }

    cards.forEach(function (card) {
      var openBtn = card.querySelector('.package-toggle-btn');
      var closeBtn = card.querySelector('.package-back-btn');

      if (openBtn) {
        openBtn.addEventListener('click', function (e) {
          e.preventDefault();
          var wasOpen = card.classList.contains('is-flipped');
          closeAllExcept(card);
          card.classList.toggle('is-flipped', !wasOpen);
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', function (e) {
          e.preventDefault();
          card.classList.remove('is-flipped');
        });
      }
    });
  });
})();
