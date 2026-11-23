'use strict';
(() => {
  window.cohorteInstitutionCleanup?.();
  const section = document.querySelector('#equipo');
  const grid = section?.querySelector('.institution-directory');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.institution-team-card')];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('institution-connections');
  svg.setAttribute('aria-hidden', 'true');
  grid.prepend(svg);
  let frame = 0;
  const draw = () => {
    frame = 0;
    const box = grid.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const points = cards.map(card => ({ x: card.offsetLeft + card.offsetWidth / 2, y: card.offsetTop + card.offsetHeight / 2 }));
    let paths = '';
    points.forEach((a, i) => {
      const right = points.slice(i + 1).find(b => Math.abs(a.y - b.y) < 4 && b.x > a.x);
      const down = points.slice(i + 1).find(b => Math.abs(a.x - b.x) < 4 && b.y > a.y);
      [right, down].filter(Boolean).forEach(b => { paths += `M${a.x},${a.y}L${b.x},${b.y} `; });
    });
    svg.innerHTML = `<path d="${paths}"/><path class="connection-signal" d="${paths}"/>`;
  };
  const resize = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); });
  resize.observe(grid);
  const reveal = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('institution-entered');
      reveal.unobserve(entry.target);
    });
  }, { threshold: .12 });
  cards.forEach((card, index) => {
    card.style.setProperty('--institution-delay', `${index % 3 * 90}ms`);
    reveal.observe(card);
  });
  window.cohorteInstitutionCleanup = () => {
    reveal.disconnect(); resize.disconnect(); cancelAnimationFrame(frame); svg.remove();
  };
})();
