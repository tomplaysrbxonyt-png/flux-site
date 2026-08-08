(function(){
  const canvas = document.getElementById('roadCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, dpr, vanishX, vanishY;

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.offsetWidth; h = canvas.offsetHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    vanishX = w * 0.5;
    vanishY = h * 0.32;
  }
  window.addEventListener('resize', resize);
  resize();

  // Lane lines converging toward a vanishing point (road-like perspective)
  const LANES = [ -0.55, -0.18, 0.18, 0.55 ];
  // Pulses of light traveling from bottom (near) to vanishing point (far)
  const pulses = LANES.map((lx, i) => ({
    lane: lx,
    t: Math.random(),
    speed: 0.0032 + i * 0.0006,
    color: i % 2 === 0 ? '#3D8BFF' : '#7AB8FF'
  }));

  // faint background city-light dots
  const dots = Array.from({length: 40}, () => ({
    x: Math.random(), y: Math.random() * 0.35,
    r: Math.random()*1.2 + 0.3,
    a: Math.random()*0.4 + 0.1
  }));

  function laneX(lane, depth){
    // depth: 0 = far (vanishing point), 1 = near (bottom)
    return vanishX + lane * depth * w * 1.4;
  }
  function laneY(depth){
    return vanishY + depth * (h - vanishY);
  }

  function draw(){
    ctx.clearRect(0,0,w,h);

    // ambient horizon glow
    const glow = ctx.createRadialGradient(vanishX, vanishY, 0, vanishX, vanishY, w*0.6);
    glow.addColorStop(0, 'rgba(61,139,255,0.16)');
    glow.addColorStop(1, 'rgba(61,139,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0,0,w,h);

    // city lights
    dots.forEach(d => {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${d.a})`;
      ctx.arc(d.x*w, d.y*h, d.r, 0, Math.PI*2);
      ctx.fill();
    });

    // lane lines
    ctx.lineWidth = 1;
    LANES.forEach(lx => {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.09)';
      ctx.moveTo(laneX(lx,0), laneY(0));
      ctx.lineTo(laneX(lx,1), laneY(1));
      ctx.stroke();
    });

    // center dashed lane markers (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(laneX(0,0), laneY(0));
    ctx.lineTo(laneX(0,1), laneY(1));
    ctx.stroke();

    // traveling pulses (electric current running toward viewer)
    pulses.forEach(p => {
      if (!reduceMotion) p.t += p.speed;
      if (p.t > 1) p.t -= 1;
      const depth = p.t;
      const x = laneX(p.lane, depth);
      const y = laneY(depth);
      const size = 1.5 + depth * 7;
      const grad = ctx.createRadialGradient(x,y,0,x,y,size*4);
      grad.addColorStop(0, p.color + 'DD');
      grad.addColorStop(1, p.color + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x,y,size*4,0,Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = '#fff';
      ctx.arc(x,y,size*0.35,0,Math.PI*2);
      ctx.fill();
    });

    if (!reduceMotion) requestAnimationFrame(draw);
  }

  if (reduceMotion){ draw(); } else { requestAnimationFrame(draw); }
})();
