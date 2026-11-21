'use strict';
(() => {
  const allowed = window.matchMedia('(prefers-reduced-motion: no-preference)');
  document.querySelectorAll('#proyecto .research-plate').forEach(card => {
    let frame = 0;
    let pointer = null;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      pointer = null;
      card.classList.remove('is-tilting');
      ['--card-rx', '--card-ry', '--card-light-x', '--card-light-y', '--card-shadow-x'].forEach(name => card.style.removeProperty(name));
    };
    card.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !allowed.matches || document.documentElement.dataset.motion === 'reduced') {
        reset();
        return;
      }
      pointer = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!pointer) return;
        const bounds = card.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (pointer.x - bounds.left) / bounds.width));
        const y = Math.max(0, Math.min(1, (pointer.y - bounds.top) / bounds.height));
        card.style.setProperty('--card-rx', `${((.5 - y) * 18).toFixed(2)}deg`);
        card.style.setProperty('--card-ry', `${((x - .5) * 18).toFixed(2)}deg`);
        card.style.setProperty('--card-light-x', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--card-light-y', `${(y * 100).toFixed(1)}%`);
        card.style.setProperty('--card-shadow-x', `${((.5 - x) * 28).toFixed(1)}px`);
        card.classList.add('is-tilting');
      });
    }, { passive: true });
    card.addEventListener('pointerleave', reset);
    card.addEventListener('pointercancel', reset);
    card.addEventListener('lostpointercapture', reset);
  });
})();
