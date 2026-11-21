'use strict';
(() => {
  window.cohorteExperienceCleanup?.();
  const root = document.querySelector('#proyecto');
  if (!root) return;
  const controller = new AbortController();
  const options = { passive: true, signal: controller.signal };
  let frame = 0, active = null, pointer = null, touchUntil = 0;
  const timers = new Set();
  const properties = ['--card-rx', '--card-ry', '--card-light-x', '--card-light-y', '--card-shadow-x'];
  const reset = () => {
    cancelAnimationFrame(frame); frame = 0;
    if (active) {
      active.classList.remove('is-tilting');
      properties.forEach(name => active.style.removeProperty(name));
    }
    active = null; pointer = null;
  };
  // Mouse events also work in embedded browsers that omit pointer capabilities.
  document.addEventListener('mousemove', event => {
    if (event.sourceCapabilities?.firesTouchEvents || performance.now() < touchUntil || document.documentElement.dataset.motion === 'reduced') { reset(); return; }
    const card = event.target instanceof Element ? event.target.closest('#proyecto .research-plate, #proyecto .dimension') : null;
    if (!card) { reset(); return; }
    if (card !== active) { reset(); active = card; }
    pointer = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!active || !pointer) return;
      const bounds = active.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (pointer.x - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (pointer.y - bounds.top) / bounds.height));
      active.style.setProperty('--card-rx', ((.5 - y) * 20).toFixed(2) + 'deg');
      active.style.setProperty('--card-ry', ((x - .5) * 20).toFixed(2) + 'deg');
      active.style.setProperty('--card-light-x', (x * 100).toFixed(1) + '%');
      active.style.setProperty('--card-light-y', (y * 100).toFixed(1) + '%');
      active.style.setProperty('--card-shadow-x', ((.5 - x) * 28).toFixed(1) + 'px');
      active.classList.add('is-tilting');
    });
  }, options);
  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') { touchUntil = performance.now() + 800; reset(); }
  }, options);
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') touchUntil = 0;
    if (event.pointerType === 'touch') reset();
  }, options);
  document.addEventListener('mouseleave', reset, options);
  window.addEventListener('blur', reset, options);
  window.addEventListener('scroll', reset, options);
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('is-in-view', entry.isIntersecting));
  }, { threshold: .15 });
  root.querySelectorAll('#proyecto-resumen, #investigacion .dimension').forEach(section => observer.observe(section));
  root.querySelectorAll('[data-experience-replay]').forEach(button => {
    button.addEventListener('click', () => {
      const section = document.getElementById(button.dataset.experienceReplay);
      if (!section) return;
      timers.forEach(clearTimeout); timers.clear();
      section.classList.remove('is-replaying');
      void section.offsetWidth;
      section.classList.add('is-replaying');
      const timer = setTimeout(() => { section.classList.remove('is-replaying'); timers.delete(timer); }, 7000);
      timers.add(timer);
    }, { signal: controller.signal });
  });
  window.cohorteExperienceCleanup = () => {
    reset(); controller.abort(); observer.disconnect(); timers.forEach(clearTimeout);
  };
})();
