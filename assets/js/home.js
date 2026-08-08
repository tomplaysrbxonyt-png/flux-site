(function(){
  const canvas = document.getElementById('fieldCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, dpr;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const colors = ['#3D8BFF', '#2FD48C', '#FFB020'];

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.offsetWidth;
    h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize', resize);
  resize();

  // Nodes drifting slowly, connected by lines when close, plus a few
  // fast "current" particles that trace slightly curved paths across.
  const NODE_COUNT = Math.round((window.innerWidth < 700 ? 0.5 : 1) * 46);
  const nodes = Array.from({length: NODE_COUNT}, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.18,
    vy: (Math.random() - 0.5) * 0.18,
    r: Math.random() * 1.6 + 0.6,
    c: colors[Math.floor(Math.random()*colors.length)]
  }));

  const CURRENTS = 5;
  const currents = Array.from({length: CURRENTS}, (_, i) => makeCurrent(i));
  function makeCurrent(i){
    const y = h * (0.15 + 0.7 * Math.random());
    return {
      y0: y,
      amp: 40 + Math.random()*60,
      speed: 0.15 + Math.random()*0.18,
      offset: Math.random()*1000,
      color: colors[i % colors.length],
      phase: Math.random()*Math.PI*2
    };
  }

  let t = 0;
  function draw(){
    t += 1;
    ctx.clearRect(0,0,w,h);

    // drifting nodes
    for (const n of nodes){
      n.x += n.vx; n.y += n.vy;
      if (n.x < -10) n.x = w+10; if (n.x > w+10) n.x = -10;
      if (n.y < -10) n.y = h+10; if (n.y > h+10) n.y = -10;
    }
    // connections
    ctx.lineWidth = 1;
    for (let i=0;i<nodes.length;i++){
      for (let j=i+1;j<nodes.length;j++){
        const a = nodes[i], b = nodes[j];
        const dx = a.x-b.x, dy = a.y-b.y;
        const d = Math.sqrt(dx*dx+dy*dy);
        if (d < 130){
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.06 * (1 - d/130)) + ')';
          ctx.beginPath();
          ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
          ctx.stroke();
        }
      }
    }
    for (const n of nodes){
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.arc(n.x, n.y, n.r, 0, Math.PI*2);
      ctx.fill();
    }

    // flowing current lines
    for (const c of currents){
      ctx.beginPath();
      ctx.strokeStyle = c.color;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 1.4;
      for (let x=0; x<=w; x+=8){
        const y = c.y0 + Math.sin((x*0.006) + t*0.01*c.speed + c.phase) * c.amp;
        if (x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // traveling glow dot along the wave
      const px = ((t*1.4*c.speed + c.offset) % (w+200)) - 100;
      const py = c.y0 + Math.sin((px*0.006) + t*0.01*c.speed + c.phase) * c.amp;
      const grad = ctx.createRadialGradient(px,py,0,px,py,26);
      grad.addColorStop(0, c.color + 'CC');
      grad.addColorStop(1, c.color + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px,py,26,0,Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = '#fff';
      ctx.arc(px,py,2.2,0,Math.PI*2);
      ctx.fill();
    }

    if (!reduceMotion) requestAnimationFrame(draw);
  }

  if (reduceMotion){
    draw(); // draw a single static-ish frame
  } else {
    requestAnimationFrame(draw);
  }
})();
