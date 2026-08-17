(function () {
  const toast = document.getElementById('bkCopied');
  let toastTimer;

  function showCopied(text) {
    if (!toast) return;
    toast.textContent = 'Copiado: ' + text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 2000);
  }

  document.querySelectorAll('.bk-swatch').forEach(function (swatch) {
    swatch.addEventListener('click', function () {
      var hex = swatch.dataset.hex;
      if (!hex) return;
      navigator.clipboard.writeText(hex).then(function () {
        showCopied(hex);
      });
    });
  });

  document.querySelectorAll('.bk-type-spec[data-copy]').forEach(function (el) {
    el.style.cursor = 'pointer';
    el.title = 'Clic para copiar';
    el.addEventListener('click', function () {
      var val = el.dataset.copy;
      if (!val) return;
      navigator.clipboard.writeText(val).then(function () {
        showCopied(val);
      });
    });
  });
})();
