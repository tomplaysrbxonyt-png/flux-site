(function(){
  const canvas = document.getElementById('graphCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, dpr;

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.offsetWidth; h = canvas.offsetHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize', resize);
  resize();

  // A gently descending curve (the "bill going down") built from control points,
  // sampled with a sine wobble so it doesn't look mechanical.
  function curveY(x){
    const p = x / w; // 0..1
    const base = h * 0.72 - p * h * 0.34; // overall downward trend
    const wobble = Math.sin(p * Math.PI * 2.4) * h * 0.035;
    return base + wobble;
  }

  let t = 0;
  function draw(){
    t += reduceMotion ? 0 : 1;
    ctx.clearRect(0,0,w,h);

    // filled area under curve
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x=0;x<=w;x+=6){ ctx.lineTo(x, curveY(x)); }
    ctx.lineTo(w,h);
    ctx.closePath();
    const fill = ctx.createLinearGradient(0,0,0,h);
    fill.addColorStop(0, 'rgba(47,212,140,0.16)');
    fill.addColorStop(1, 'rgba(47,212,140,0)');
    ctx.fillStyle = fill;
    ctx.fill();

    // the line itself
    ctx.beginPath();
    for (let x=0;x<=w;x+=6){
      const y = curveY(x);
      if (x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.strokeStyle = '#2FD48C';
    ctx.lineWidth = 2;
    ctx.stroke();

    // faint horizontal grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i=1;i<4;i++){
      const y = h * (i/4);
      ctx.beginPath();
      ctx.moveTo(0,y); ctx.lineTo(w,y);
      ctx.stroke();
    }

    // traveling glow dot with small floating "-x€" markers periodically
    const px = (t * 1.1) % (w + 200) - 100;
    const py = curveY(Math.max(0, Math.min(w, px)));
    const grad = ctx.createRadialGradient(px,py,0,px,py,22);
    grad.addColorStop(0, 'rgba(47,212,140,0.9)');
    grad.addColorStop(1, 'rgba(47,212,140,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px,py,22,0,Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(px,py,3,0,Math.PI*2);
    ctx.fill();

    if (!reduceMotion) requestAnimationFrame(draw);
  }

  if (reduceMotion){ draw(); } else { requestAnimationFrame(draw); }
})();

// ---------------- calculator ----------------
(function(){
  const list = document.getElementById('calcList');
  const totalEl = document.getElementById('calcTotal');
  if (!list || !totalEl) return;

  function format(n){
    return n.toLocaleString('fr-FR');
  }
  function update(){
    let total = 0;
    list.querySelectorAll('li').forEach(li => {
      const checkbox = li.querySelector('input[type="checkbox"]');
      if (checkbox && !checkbox.checked){
        total += parseInt(li.dataset.value, 10) || 0;
      }
    });
    totalEl.innerHTML = format(total) + ' €<small>/an</small>';
  }
  list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', update);
  });
  update();
})();
