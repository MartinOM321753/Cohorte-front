'use strict';
(() => {
  window.cohorteExperienceCleanup?.();
  const root = document.querySelector('#proyecto');
  if (!root) return;
  const controller = new AbortController();
  const options = { passive: true, signal: controller.signal };
  const states = new Map();
  const properties = ['--card-rx', '--card-ry', '--card-strength', '--card-light-x', '--card-light-y', '--card-shadow-x'];
  let frame = 0, lastTime = 0, active = null, touchUntil = 0;
  const paint = state => {
    const style = state.card.style;
    style.setProperty('--card-rx', state.x.toFixed(3) + 'deg');
    style.setProperty('--card-ry', state.y.toFixed(3) + 'deg');
    style.setProperty('--card-strength', state.strength.toFixed(4));
    style.setProperty('--card-shadow-x', (-state.y * 1.4).toFixed(2) + 'px');
  };
  const animate = now => {
    const dt = lastTime ? Math.min(40, now - lastTime) : 16;
    lastTime = now;
    const blend = 1 - Math.exp(-dt / 180);
    let moving = false;
    states.forEach(state => {
      ['x', 'y', 'strength'].forEach(key => {
        const difference = state.target[key] - state[key];
        if (Math.abs(difference) > .0008) {
          state[key] += difference * blend;
          moving = true;
        } else state[key] = state.target[key];
      });
      paint(state);
      if (state !== active && state.strength === 0) {
        state.card.classList.remove('is-tilting');
        properties.forEach(name => state.card.style.removeProperty(name));
        states.delete(state.card);
      }
    });
    if (moving) frame = requestAnimationFrame(animate);
    else { frame = 0; lastTime = 0; }
  };
  const start = () => { if (!frame) frame = requestAnimationFrame(animate); };
  const release = () => {
    if (active) { active.target = { x: 0, y: 0, strength: 0 }; active = null; start(); }
  };
  const reset = () => {
    cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    states.forEach(state => {
      state.card.classList.remove('is-tilting');
      properties.forEach(name => state.card.style.removeProperty(name));
    });
    states.clear(); active = null;
  };
  document.addEventListener('mousemove', event => {
    if (event.sourceCapabilities?.firesTouchEvents || performance.now() < touchUntil || document.documentElement.dataset.motion === 'reduced') { release(); return; }
    const element = event.target instanceof Element ? event.target : null;
    const card = element?.closest('#proyecto .research-plate');
    if (!card) {
      if (active) { active.target = { x: 0, y: 0, strength: 0 }; active = null; start(); }
      return;
    }
    if (active?.card !== card) {
      if (active) active.target = { x: 0, y: 0, strength: 0 };
      let state = states.get(card);
      if (!state) {
        state = { card, x: 0, y: 0, strength: 0, target: { x: 0, y: 0, strength: 0 } };
        states.set(card, state);
      }
      state.bounds = card.getBoundingClientRect();
      active = state;
      paint(state);
      card.classList.add('is-tilting');
    }
    const b = active.bounds;
    const x = Math.max(0, Math.min(1, (event.clientX - b.left) / b.width));
    const y = Math.max(0, Math.min(1, (event.clientY - b.top) / b.height));
    active.target = { x: (.5 - y) * 12, y: (x - .5) * 12, strength: 1 };
    card.style.setProperty('--card-light-x', (x * 100).toFixed(1) + '%');
    card.style.setProperty('--card-light-y', (y * 100).toFixed(1) + '%');
    start();
  }, options);
  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') { touchUntil = performance.now() + 800; reset(); }
  }, options);
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') touchUntil = 0;
    if (event.pointerType === 'touch') reset();
  }, options);
  document.addEventListener('mouseleave', release, options);
  window.addEventListener('blur', reset, options);
  window.addEventListener('scroll', release, options);
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('is-in-view', entry.isIntersecting));
  }, { threshold: .15 });
  root.querySelectorAll('#proyecto-resumen, #investigacion .dimension').forEach(section => observer.observe(section));
  window.cohorteExperienceCleanup = () => {
    reset(); controller.abort(); observer.disconnect();
  };
})();
