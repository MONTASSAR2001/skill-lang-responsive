const header = document.getElementById('site-header');
const burger = document.getElementById('burger');
burger.addEventListener('click', () => {
  const open = header.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.has-menu > a').forEach((a) => a.addEventListener('click', (e) => {
  if (matchMedia('(hover: none), (max-width: 1240px)').matches) { e.preventDefault(); a.parentElement.classList.toggle('open'); }
}));
