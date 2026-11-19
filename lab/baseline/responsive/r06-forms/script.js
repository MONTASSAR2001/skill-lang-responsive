document.getElementById('signup').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target, bad = [];
  const email = f.email;
  [f.first, f.last, email].forEach((i) => i.classList.toggle('invalid', !i.value || (i === email && !/^\S+@\S+\.\S+$/.test(i.value))));
  if (!f.terms.checked) bad.push('terms');
  document.getElementById('err').hidden = !(document.querySelector('.invalid') || bad.length);
});
