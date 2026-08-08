(function(){
  const canvas = document.getElementById('sunCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, dpr, sunX, sunY, sunR;
  let cols, cellW, gridY, cellH;

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.offsetWidth; h = canvas.offsetHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);

    sunX = w * 0.78;
    sunY = h * 0.22;
    sunR = Math.min(w,h) * 0.06;

    cols = window.innerWidth < 700 ? 8 : 14;
    cellW = w / cols;
    cellH = 26;
    gridY = h - cellH - 40;
    cells = Array.from({length: cols}, () => ({ glow: 0 }));
  }
  let cells = [];
  window.addEventListener('resize', resize);
  resize();

  const particles = [];
  function spawnParticle(){
    const targetCol = Math.floor(Math.random() * cols);
    particles.push({
      x: sunX + (Math.random()-0.5) * sunR * 1.6,
      y: sunY + (Math.random()-0.5) * sunR * 1.6,
      tx: targetCol * cellW + cellW/2,
      ty: gridY,
      col: targetCol,
      p: 0,
      speed: 0.006 + Math.random()*0.006
    });
  }

  let frame = 0;
  function draw(){
    frame++;
    ctx.clearRect(0,0,w,h);

    // sun glow
    const sunGlow = ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,sunR*7);
    sunGlow.addColorStop(0, 'rgba(255,176,32,0.35)');
    sunGlow.addColorStop(1, 'rgba(255,176,32,0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0,0,w,h);

    // sun core
    const core = ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,sunR);
    core.addColorStop(0, '#FFE9B8');
    core.addColorStop(1, '#FFB020');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(sunX,sunY,sunR,0,Math.PI*2);
    ctx.fill();

    // rays (slow rotation)
    const rot = frame * 0.0009;
    ctx.strokeStyle = 'rgba(255,176,32,0.14)';
    ctx.lineWidth = 1;
    for (let i=0;i<10;i++){
      const a = rot + (i/10)*Math.PI*2;
      ctx.beginPath();
      ctx.moveTo(sunX + Math.cos(a)*sunR*1.3, sunY + Math.sin(a)*sunR*1.3);
      ctx.lineTo(sunX + Math.cos(a)*sunR*4.2, sunY + Math.sin(a)*sunR*4.2);
      ctx.stroke();
    }

    if (!reduceMotion && frame % 4 === 0 && particles.length < 60) spawnParticle();

    // particles falling toward grid
    for (let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      if (!reduceMotion) p.p += p.speed;
      const ease = p.p<0.5 ? 2*p.p*p.p : 1-Math.pow(-2*p.p+2,2)/2;
      const x = sunX + (p.tx - sunX)*ease;
      const y = sunY + (p.ty - sunY)*ease;
      ctx.beginPath();
      ctx.fillStyle = '#FFD37A';
      ctx.arc(x,y,2,0,Math.PI*2);
      ctx.fill();
      if (p.p >= 1){
        cells[p.col].glow = 1;
        particles.splice(i,1);
      }
    }

    // panel grid
    for (let c=0;c<cols;c++){
      const x = c*cellW + 4;
      const cw = cellW - 8;
      const glow = cells[c].glow;
      cells[c].glow = Math.max(0, glow - 0.02);
      ctx.fillStyle = `rgba(255,176,32,${0.06 + cells[c].glow*0.55})`;
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1;
      roundRect(ctx, x, gridY, cw, cellH, 4);
      ctx.fill();
      ctx.stroke();
    }

    if (!reduceMotion) requestAnimationFrame(draw);
  }

  function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  if (reduceMotion){ draw(); } else { requestAnimationFrame(draw); }
})();
