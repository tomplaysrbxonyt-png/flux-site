// ---------- nav toggle (mobile) ----------
const navToggle = document.querySelector('.nav__toggle');
const navLinks = document.querySelector('.nav__links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('is-open');
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('is-open')));
}

// ---------- nav appearance on scroll (swap dark/light based on section under it) ----------
const nav = document.querySelector('.nav');
const lightSections = document.querySelectorAll('[data-nav="light"]');
if (nav && lightSections.length) {
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        nav.classList.toggle('is-light', entry.target.dataset.nav === 'light');
      }
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  document.querySelectorAll('[data-nav]').forEach(s => navObserver.observe(s));
}

// ---------- scroll reveal ----------
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach((el, i) => {
    el.style.setProperty('--i', i % 6);
    revealObserver.observe(el);
  });
}

// ---------- animated counters ----------
function animateCount(el) {
  const target = parseFloat(el.dataset.count);
  const decimals = (el.dataset.count.split('.')[1] || '').length;
  const suffix = el.dataset.suffix || '';
  const duration = 1400;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = (target * eased).toFixed(decimals);
    el.textContent = val + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
const counters = document.querySelectorAll('[data-count]');
if (counters.length) {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });
  counters.forEach(c => counterObserver.observe(c));
}

// ---------- current year ----------
document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
