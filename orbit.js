(() => {
  'use strict';
  const hero = document.querySelector('.orbit-hero');
  if (!hero) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const overlay = document.querySelector('.intro-overlay');
  const opening = overlay.querySelector('video');
  const skip = overlay.querySelector('.skip-intro');
  const replays = [...document.querySelectorAll('.replay-intro')];
  const ambient = document.querySelector('.identity-loop');
  const control = document.querySelector('.motion-control');
  const canvas = document.querySelector('.star-field');
  const ctx = canvas?.getContext('2d');
  const gameFilms = [...document.querySelectorAll('.film-panel video')];
  let paused = reduced.matches, inView = true, introActive = false, finishing = false;
  let raf = 0, fallback = 0, closeTimer = 0, restoreFocus = null, width = 0, height = 0;
  let stars = [], pointer = {x:0, y:0};
  const backgrounds = [...document.querySelectorAll('body > header, body > footer, body > .skip-link, main > :not(.intro-overlay)')];
  const seenKey = 'chezik.orbit.opening.v17';
  const canAnimate = () => !paused && !reduced.matches && inView && !document.hidden && !introActive;
  const syncControl = () => {
    control.hidden = reduced.matches;
    control.setAttribute('aria-pressed', String(paused));
    control.querySelector('.motion-label').textContent = paused ? 'Resume motion' : 'Pause motion';
    control.querySelector('[aria-hidden]').textContent = paused ? '▷' : 'Ⅱ';
  };
  const loadAmbient = () => {
    if (!ambient.getAttribute('src')) { ambient.src = ambient.dataset.src; ambient.load(); }
  };
  const draw = time => {
    raf = 0;
    if (!ctx || !canAnimate()) return;
    ctx.clearRect(0,0,width,height);
    for (const star of stars) {
      const x = star.x + pointer.x * star.depth, y = star.y + pointer.y * star.depth;
      const opacity = .20 + .18 * Math.sin(time*.0005+star.phase);
      ctx.fillStyle = `rgba(193,236,211,${opacity})`;
      ctx.beginPath(); ctx.arc(x,y,star.radius,0,Math.PI*2); ctx.fill();
    }
    raf = requestAnimationFrame(draw);
  };
  const syncMotion = () => {
    syncControl();
    if (!canAnimate()) { ambient.pause(); cancelAnimationFrame(raf); raf=0; return; }
    if (gameFilms.some(v=>!v.paused && !v.ended)) return;
    loadAmbient(); ambient.play().catch(() => { /* The rendered still stays visible. */ });
    if (!raf && ctx) raf=requestAnimationFrame(draw);
  };
  const sizeCanvas = () => {
    if (!ctx) return;
    const rect=hero.getBoundingClientRect(), ratio=Math.min(window.devicePixelRatio||1,2);
    width=rect.width;height=rect.height;canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    let seed=173;
    const random=()=>{ seed=(seed*16807)%2147483647;return (seed-1)/2147483646; };
    stars=Array.from({length:Math.min(65,Math.floor(width/17))},()=>({x:random()*width,y:random()*height,radius:.4+random()*.65,depth:.005+random()*.016,phase:random()*7}));
    if (!raf && canAnimate()) raf=requestAnimationFrame(draw);
  };
  if ('ResizeObserver' in window) new ResizeObserver(sizeCanvas).observe(hero); else window.addEventListener('resize',sizeCanvas);
  sizeCanvas();
  if (window.matchMedia('(pointer:fine)').matches) hero.addEventListener('pointermove',event=>{
    const rect=hero.getBoundingClientRect();pointer.x=event.clientX-rect.left-width/2;pointer.y=event.clientY-rect.top-height/2;
  },{passive:true});
  ambient.addEventListener('playing',()=>ambient.classList.add('is-playing'));
  ambient.addEventListener('error',()=>ambient.classList.remove('is-playing'));
  control.addEventListener('click',()=>{paused=!paused;syncMotion();});
  if ('IntersectionObserver' in window) new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;syncMotion();},{threshold:.08}).observe(hero);
  gameFilms.forEach(video=>video.addEventListener('play',()=>{ambient.pause();cancelAnimationFrame(raf);raf=0;}));
  const finish = (immediate=false) => {
    if (!introActive || finishing) return;
    finishing=true;clearTimeout(fallback);overlay.classList.add('is-ending');
    document.querySelector('.hero-copy').classList.remove('is-arriving');
    // Restart the entrance on replay as well as the first visit.
    requestAnimationFrame(()=>document.querySelector('.hero-copy').classList.add('is-arriving'));
    closeTimer=window.setTimeout(()=>{
      opening.pause();overlay.hidden=true;overlay.classList.remove('is-ending','is-playing');
      document.documentElement.classList.remove('intro-active');
      backgrounds.forEach(el=>el.removeAttribute('inert'));introActive=false;finishing=false;
      (restoreFocus || document.querySelector('.wordmark')).focus({preventScroll:true});
      syncMotion();
    },immediate?0:750);
  };
  const startOpening = () => {
    if (reduced.matches || introActive) return;
    restoreFocus=document.activeElement instanceof HTMLElement && document.activeElement!==document.body ? document.activeElement : null;
    introActive=true;finishing=false;clearTimeout(closeTimer);
    overlay.hidden=false;overlay.classList.remove('is-ending','is-playing');
    backgrounds.forEach(el=>el.setAttribute('inert',''));document.documentElement.classList.add('intro-active');
    skip.focus({preventScroll:true});syncMotion();
    const source=window.matchMedia('(max-width:760px)').matches ? opening.dataset.srcMobile : opening.dataset.src;
    if (opening.getAttribute('src')!==source) opening.src=source;
    opening.currentTime=0;opening.muted=true;
    fallback=window.setTimeout(()=>finish(),8000);
    opening.play().then(()=>{if(introActive&&!finishing)overlay.classList.add('is-playing');}).catch(()=>finish());
    try { sessionStorage.setItem(seenKey,'1'); } catch { /* No storage is required. */ }
  };
  skip.addEventListener('click',()=>finish());
  overlay.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();finish();}
    if(event.key==='Tab'){event.preventDefault();skip.focus();}
  });
  opening.addEventListener('timeupdate',()=>{if(opening.currentTime>=4.25)finish();});
  opening.addEventListener('ended',()=>finish());
  opening.addEventListener('error',()=>finish());
  replays.forEach(button=>{button.hidden=reduced.matches;button.addEventListener('click',startOpening);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&introActive)finish(true);syncMotion();});
  reduced.addEventListener('change',()=>{
    paused=reduced.matches;replays.forEach(b=>b.hidden=reduced.matches);
    if(reduced.matches)finish(true);syncMotion();
  });
  // Decorative reveals never remove content from the document or keyboard navigation.
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.remove('is-pending');observer.unobserve(entry.target);}
    }),{threshold:.08});
    document.querySelectorAll('.manifesto,.collection-heading,.product,.about-intro').forEach(el=>{
      el.classList.add('reveal');
      if(el.getBoundingClientRect().top>window.innerHeight)el.classList.add('is-pending');
      observer.observe(el);
      el.addEventListener('focusin',()=>el.classList.remove('is-pending'));
    });
  }
  // Show the website immediately. The cinematic opening remains available on demand.
  syncMotion();
  document.querySelector('.hero-copy').classList.add('is-arriving');
})();
