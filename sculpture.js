(() => {
  'use strict';
  const hero = document.querySelector('.orbit-hero');
  const stage = hero?.querySelector('.sculpture-stage');
  if (!stage) return;
  const entrance = stage.querySelector('.sculpture-entrance');
  const ambient = stage.querySelector('.sculpture-ambient');
  const control = hero.querySelector('.motion-control');
  const replay = hero.querySelector('.replay-intro');
  const films = [...document.querySelectorAll('.film-panel video')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:760px)');
  const connection = navigator.connection;
  let paused = false;
  let visible = true;
  let phase = (!location.hash || location.hash === '#top') ? 'entrance' : 'ambient';
  let failed = false;
  let attempt = 0;
  let replayRequested = false;
  let warmupTimer;
  const restricted = () => reduced.matches || Boolean(connection?.saveData);
  const blocked = () => restricted() || paused || !visible || document.hidden || failed || films.some(v => !v.paused && !v.ended);
  const current = () => phase === 'entrance' ? entrance : ambient;
  const load = video => {
    if (video.hasAttribute('src')) return;
    video.src = mobile.matches ? video.dataset.srcMobile : video.dataset.src;
    video.load();
  };
  const reflect = () => {
    control.hidden = restricted() || failed;
    replay.hidden = restricted() || failed;
    control.setAttribute('aria-pressed', String(paused));
    control.querySelector('.motion-label').textContent = paused ? 'Resume motion' : 'Pause motion';
    control.querySelector('[aria-hidden]').textContent = paused ? '▷' : 'Ⅱ';
  };
  const show = video => {
    if (video !== current() || restricted() || failed) return;
    video.classList.add('is-visible');
    const other = video === entrance ? ambient : entrance;
    other.classList.remove('is-visible');
    other.pause();
  };
  const sync = () => {
    const generation = ++attempt;
    reflect();
    if (blocked()) {
      entrance.pause(); ambient.pause();
      if (restricted()) {
        stage.querySelectorAll('.is-visible').forEach(v => v.classList.remove('is-visible'));
        clearTimeout(warmupTimer);
      }
      return;
    }
    const video = current();
    load(video);
    if (video === entrance && replayRequested) {
      video.currentTime = 0;
      replayRequested = false;
    }
    video.play().then(() => {
      if (generation === attempt && !blocked()) show(video);
    }).catch(error => {
      if (generation !== attempt || error.name === 'AbortError' || blocked()) return;
      // A browser that disallows autoplay keeps the rendered poster and a Play control.
      paused = true;
      reflect();
    });
  };
  entrance.addEventListener('playing', () => {
    show(entrance);
    clearTimeout(warmupTimer);
    // Prepare the loop only after the entrance is actually playing.
    warmupTimer = setTimeout(() => { if (!restricted() && !failed) load(ambient); }, 200);
  });
  ambient.addEventListener('playing', () => show(ambient));
  entrance.addEventListener('ended', () => { phase = 'ambient'; sync(); });
  entrance.addEventListener('error', () => {
    entrance.classList.remove('is-visible');
    phase = 'ambient';
    sync();
  });
  ambient.addEventListener('error', () => {
    failed = true;
    entrance.pause(); ambient.pause();
    stage.querySelectorAll('.is-visible').forEach(v => v.classList.remove('is-visible'));
    reflect();
  });
  control.addEventListener('click', () => { paused = !paused; sync(); });
  replay.addEventListener('click', () => {
    paused = false;
    phase = 'entrance';
    replayRequested = true;
    ambient.pause();
    sync();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }, {threshold:0}).observe(stage);
  }
  document.addEventListener('visibilitychange', sync);
  films.forEach(video => ['play','pause','ended'].forEach(event => video.addEventListener(event, sync)));
  reduced.addEventListener('change', sync);
  connection?.addEventListener?.('change', sync);
  hero.querySelector('.hero-copy').classList.add('is-arriving');
  stage.classList.add('is-arriving');
  // Links and text stay available during the entrance, without an overlay or focus change.
  sync();
})();
