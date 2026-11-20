const rows = [...document.querySelectorAll('.data-row')];
const layers = [...document.querySelectorAll('.layer')];
const caption = document.querySelector('.figure-label');
function selectLayer(row) {
  const index = Number(row.dataset.layer);
  rows.forEach((item, i) => item.setAttribute('aria-pressed', String(i === index)));
  layers.forEach((item, i) => item.classList.toggle('active', i === index));
  caption.textContent = row.querySelector('.row-label').textContent;
}
rows.forEach(row => row.addEventListener('click', () => selectLayer(row)));
