/* service.js — hero canvases, nav and reveal behaviour shared by the service pages. */
/* SMOKE CANVAS */
(function(){
  const canvas=document.getElementById('smoke-canvas');
  const ctx=canvas.getContext('2d');
  let W,H;
  function resize(){W=canvas.width=canvas.offsetWidth;H=canvas.height=canvas.offsetHeight;}
  resize();
  window.addEventListener('resize',resize);
  const orbs=Array.from({length:6},(_,i)=>{
    const palette=[[201,169,108],[201,169,108],[44,74,106],[26,14,28],[139,123,158],[180,130,80]];
    const c=palette[i];
    return{cx:0.2+Math.random()*0.6,cy:0.2+Math.random()*0.6,r:0.28+Math.random()*0.32,color:c,alphaBase:0.05+Math.random()*0.07,pulsePhase:Math.random()*Math.PI*2,pulseSpeed:0.00045+Math.random()*0.0003,pulseDepth:0.3+Math.random()*0.25,rPulsePhase:Math.random()*Math.PI*2,rPulseSpeed:0.00035+Math.random()*0.00025,speedX:(Math.random()-0.5)*0.0006,speedY:(Math.random()-0.5)*0.00045,drift:Math.random()*Math.PI*2,driftSpeed:0.000175+Math.random()*0.000125};
  });
  let last=0;
  function draw(ts){
    const dt=Math.min(ts-last,50);last=ts;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#0E0B09';ctx.fillRect(0,0,W,H);
    for(const o of orbs){
      o.drift+=o.driftSpeed*dt;o.pulsePhase+=o.pulseSpeed*dt;o.rPulsePhase+=o.rPulseSpeed*dt;
      o.cx+=o.speedX*dt+Math.sin(o.drift)*0.00009;
      o.cy+=o.speedY*dt+Math.cos(o.drift*0.6)*0.00007;
      if(o.cx<0.08||o.cx>0.92)o.speedX*=-0.98;
      if(o.cy<0.08||o.cy>0.92)o.speedY*=-0.98;
      o.cx=Math.max(0.08,Math.min(0.92,o.cx));
      o.cy=Math.max(0.08,Math.min(0.92,o.cy));
      const pulse=1+o.pulseDepth*Math.sin(o.pulsePhase);
      const rp=1+(0.08+Math.random()*0.01)*Math.sin(o.rPulsePhase);
      const alpha=o.alphaBase*pulse;
      const r=o.r*rp*Math.min(W,H);
      const x=o.cx*W,y=o.cy*H;
      const grd=ctx.createRadialGradient(x,y,0,x,y,r);
      const[R,G,B]=o.color;
      grd.addColorStop(0,`rgba(${R},${G},${B},${alpha})`);
      grd.addColorStop(0.45,`rgba(${R},${G},${B},${alpha*0.35})`);
      grd.addColorStop(1,`rgba(${R},${G},${B},0)`);
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=grd;ctx.fill();
    }
    const vig=ctx.createRadialGradient(W/2,H/2,H*0.1,W/2,H/2,H*0.8);
    vig.addColorStop(0,'rgba(14,11,9,0)');vig.addColorStop(0.7,'rgba(14,11,9,0.3)');vig.addColorStop(1,'rgba(14,11,9,0.7)');
    ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
    heroRaf(draw);
  }
  heroRaf(draw);
})();

/* HERO GLOW */
(function(){
  const canvas=document.getElementById('hero-glow-canvas');
  const ctx=canvas.getContext('2d');
  let W,H;
  function resize(){W=canvas.width=canvas.offsetWidth;H=canvas.height=canvas.offsetHeight;}
  resize();window.addEventListener('resize',resize);
  const orbs=[
    {ox:0.0,oy:0.0,r:0.55,phase:0.0,pSpeed:0.00066,drift:0.0,driftS:0.00036,color:[201,155,80],alpha:0.30},
    {ox:0.18,oy:0.10,r:0.50,phase:1.4,pSpeed:0.00084,drift:2.2,driftS:0.00027,color:[220,175,100],alpha:0.24},
    {ox:-0.2,oy:0.18,r:0.52,phase:2.8,pSpeed:0.00054,drift:4.0,driftS:0.00042,color:[180,120,60],alpha:0.26},
  ];
  let last=0;
  function draw(ts){
    const dt=Math.min(ts-last,50);last=ts;
    ctx.clearRect(0,0,W,H);
    const ax=W*0.5,ay=H*0.28;
    for(const o of orbs){
      o.phase+=o.pSpeed*dt;o.drift+=o.driftS*dt;
      const x=ax+o.ox*W*0.5+Math.sin(o.drift)*W*0.18;
      const y=ay+o.oy*H*0.5+Math.cos(o.drift*0.65)*H*0.12;
      const r=o.r*Math.min(W,H);
      const pulse=1+0.55*Math.sin(o.phase);
      const alpha=o.alpha*pulse;
      const grd=ctx.createRadialGradient(x,y,0,x,y,r);
      const[R,G,B]=o.color;
      grd.addColorStop(0,`rgba(${R},${G},${B},${alpha})`);
      grd.addColorStop(0.4,`rgba(${R},${G},${B},${alpha*0.5})`);
      grd.addColorStop(1,`rgba(${R},${G},${B},0)`);
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=grd;ctx.fill();
    }
    heroRaf(draw);
  }
  heroRaf(draw);
})();

(function () {
  /* NAV: blur on scroll, logo crossfade, Home CTA once past the hero */
  const nav = document.getElementById('main-nav');
  const navLogo = document.querySelector('.nav-logo');
  const navCta = document.querySelector('.nav-cta');
  const hero = document.getElementById('hero');
  if (nav) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      nav.classList.toggle('scrolled', y > 40);
      if (navLogo) navLogo.classList.toggle('scrolled', y > 60);
      if (navCta) navCta.classList.toggle('visible', y > (hero ? hero.offsetHeight * 0.8 : 300));
    }, { passive: true });
  }

})();
