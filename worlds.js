(() => {
  'use strict';
  const products = [...document.querySelectorAll('.app-world')];
  if (!products.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const collectionControl = document.querySelector('.collection-motion');
  const gameplay = [...document.querySelectorAll('.film-panel video')];
  const states = products.map(product => ({
    product, video: product.querySelector('.banner-motion'),
    button: product.querySelector('.banner-toggle'),
    visible: false, paused: false, failed: false
  }));
  let paused = false;
  const gamePlaying = () => gameplay.some(video => !video.paused && !video.ended);
  const reflect = state => {
    const stopped = paused || state.paused || state.video.paused;
    const name = state.product.querySelector('h3').textContent;
    state.button.setAttribute('aria-label', `${stopped ? 'Play' : 'Pause'} ${name} animation`);
    state.button.setAttribute('aria-pressed', String(paused || state.paused));
    state.button.querySelector('.banner-toggle-icon').textContent = stopped ? '▷' : 'Ⅱ';
    state.button.querySelector('.banner-toggle-label').textContent = stopped ? 'Play' : 'Pause';
    const hide = reduced.matches || state.failed;
    if (state.button.hidden !== hide) state.button.hidden = hide;
  };
  const sync = () => {
    collectionControl.hidden = reduced.matches;
    collectionControl.setAttribute('aria-pressed', String(paused));
    collectionControl.innerHTML = `${paused ? 'Resume' : 'Pause'} banner animations <span aria-hidden="true">${paused ? '▷' : 'Ⅱ'}</span>`;
    const blocked = paused || reduced.matches || document.hidden || gamePlaying();
    for (const state of states) {
      const canPlay = !blocked && state.visible && !state.paused && !state.failed && !state.product.hidden;
      if (!canPlay) state.video.pause();
      else {
        if (!state.video.getAttribute('src')) {
          state.video.src = state.video.dataset.src;
          state.video.muted = true;
          state.video.load();
        }
        state.video.play().catch(() => reflect(state));
      }
      reflect(state);
    }
  };
  for (const state of states) {
    state.video.addEventListener('playing', () => { state.video.classList.add('is-playing'); reflect(state); });
    state.video.addEventListener('pause', () => reflect(state));
    state.video.addEventListener('error', () => {
      state.failed = true;
      state.video.classList.remove('is-playing');
      reflect(state);
    });
    state.button.addEventListener('click', () => {
      if (paused) { paused = false; state.paused = false; }
      else state.paused = !state.paused;
      sync();
    });
    const details = state.product.querySelector('.product-details');
    const explore = state.product.querySelector('[data-open-app]');
    const watch = state.product.querySelector('[data-watch-app]');
    explore.hidden = false;
    const showDetails = (film = false) => {
      details.open = true;
      const target = film ? details.querySelector('.product-visual') : details;
      target.scrollIntoView({behavior: reduced.matches ? 'instant' : 'smooth', block:'start'});
    };
    explore.addEventListener('click', () => {
      showDetails();
      details.querySelector('summary').focus({preventScroll:true});
    });
    if (watch) {
      watch.hidden = false;
      watch.addEventListener('click', () => {
        showDetails(true);
        const tab = state.product.querySelector('[data-media="film"]');
        tab.click(); tab.focus({preventScroll:true});
      });
    }
    details.addEventListener('toggle', () => {
      explore.setAttribute('aria-expanded', String(details.open));
      if (!details.open) details.querySelectorAll('video').forEach(video => video.pause());
      sync();
    });
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const state = states.find(item => item.video === entry.target);
        state.visible = entry.isIntersecting && entry.intersectionRatio >= .08;
      }
      sync();
    }, {threshold:[0,.08]});
    states.forEach(state => observer.observe(state.video));
  } else {
    // Older browsers keep the still until the visitor deliberately chooses Play.
    states.forEach(state => {
      state.paused = true; state.visible = true;
    });
  }
  collectionControl.addEventListener('click', () => { paused = !paused; sync(); });
  document.addEventListener('visibilitychange', sync);
  gameplay.forEach(video => ['play','pause','ended'].forEach(event => video.addEventListener(event, sync)));
  reduced.addEventListener('change', sync);
  new MutationObserver(sync).observe(document.querySelector('.product-grid'), {subtree:true,attributes:true,attributeFilter:['hidden']});
  sync();
})();
