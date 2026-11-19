// Off-canvas sidebar toggle for narrow screens
const app = document.getElementById('app');
const toggle = document.getElementById('side-toggle');
toggle?.addEventListener('click', () => {
  const open = app.classList.toggle('nav-open');
  toggle.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('#sidebar nav a').forEach((a) => a.addEventListener('click', () => { app.classList.remove('nav-open'); toggle?.setAttribute('aria-expanded', 'false'); }));
