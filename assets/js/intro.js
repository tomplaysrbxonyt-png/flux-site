(function () {
  const intro = document.getElementById('intro');
  if (!intro) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const alreadyPlayed = sessionStorage.getItem('fluxIntroPlayed') === '1';

  function removeIntro() {
    intro.remove();
    document.documentElement.classList.remove('no-scroll');
  }

  if (reduceMotion || alreadyPlayed) {
    removeIntro();
    return;
  }

  document.documentElement.classList.add('no-scroll');
  sessionStorage.setItem('fluxIntroPlayed', '1');

  const scenes = intro.querySelectorAll('.intro__scene');
  const dots = intro.querySelectorAll('.intro__dot');
  const car = document.getElementById('car3d');
  const panelRow = document.getElementById('panelRow');
  const chartBars = intro.querySelectorAll('.bar3d__rod');
  const skipBtn = document.getElementById('introSkip');

  let timers = [];
  function schedule(fn, delay) {
    timers.push(setTimeout(fn, delay));
  }
  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function setActiveScene(n) {
    scenes.forEach(s => s.classList.toggle('is-active', s.dataset.scene === String(n)));
    dots.forEach(d => d.classList.toggle('is-active', d.dataset.dot === String(n)));
  }

  function playAct1() {
    setActiveScene(1);
    schedule(() => car.classList.add('is-driving'), 120);
  }

  function playAct2() {
    setActiveScene(2);
    schedule(() => panelRow.classList.add('is-open'), 120);
  }

  function playAct3() {
    setActiveScene(3);
    chartBars.forEach((bar, i) => {
      schedule(() => bar.classList.add('is-grown'), 150 + i * 160);
    });
  }

  function playExit() {
    intro.classList.add('intro--exit');
    schedule(removeIntro, 950);
  }

  function runTimeline() {
    playAct1();
    schedule(playAct2, 2500);
    schedule(playAct3, 4900);
    schedule(playExit, 7300);
  }

  function skip() {
    clearTimers();
    playExit();
  }

  if (skipBtn) skipBtn.addEventListener('click', skip);

  runTimeline();
})();
