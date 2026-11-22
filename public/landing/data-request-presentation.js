'use strict';
(() => {
  const note = document.querySelector('.data-review-note');
  if (!note) return;
  const compact = matchMedia('(max-width:1000px)');
  let chosen = false;
  const sync = () => { if (!chosen) note.open = !compact.matches; };
  note.querySelector('summary')?.addEventListener('click', () => { chosen = true; });
  compact.addEventListener('change', sync);
  sync();
})();
