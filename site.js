'use strict';
const dialog = document.querySelector('.lightbox');
if (dialog && typeof dialog.showModal === 'function') {
  const previewImage = dialog.querySelector('img');
  const previewTitle = dialog.querySelector('#preview-title');
  const previewCaption = dialog.querySelector('#preview-caption');
  const close = dialog.querySelector('.close-preview');
  let opener;
  document.querySelectorAll('[data-preview]').forEach(button => {
    button.addEventListener('click', () => {
      opener = button;
      const image = button.querySelector('img');
      previewImage.src = button.dataset.fullSrc || image.src;
      previewImage.alt = image.alt;
      previewTitle.textContent = `${button.dataset.name} preview`;
      previewCaption.textContent = button.dataset.previewCaption || '';
      previewCaption.hidden = !previewCaption.textContent;
      if (previewCaption.hidden) dialog.removeAttribute('aria-describedby');
      else dialog.setAttribute('aria-describedby', 'preview-caption');
      dialog.showModal();
      document.documentElement.classList.add('preview-open');
    });
  });
  close.addEventListener('click', () => dialog.close());
  // This image-only dialog has one interactive control.
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      event.preventDefault();
      close.focus();
    }
  });
  // Avoid dismissing a drag that starts inside the preview.
  let backdropStart = false;
  const outside = event => {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  dialog.addEventListener('pointerdown', event => { backdropStart = outside(event); });
  dialog.addEventListener('click', event => {
    if (backdropStart && outside(event)) dialog.close();
    backdropStart = false;
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('preview-open');
    opener?.focus({ preventScroll: true });
  });
}

// Load each film only when requested and retain native playback controls.
const films = [...document.querySelectorAll('.film-panel video')];
document.querySelectorAll('.product-visual').forEach(figure => {
  const tabs = [...figure.querySelectorAll('[role="tab"]')];
  const video = figure.querySelector('video');
  if (!video) return;
  function activate(tab, play = false) {
    const showFilm = tab.dataset.media === 'film';
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
    figure.querySelector('figcaption').hidden = showFilm;
    figure.querySelector('.film-caption').hidden = !showFilm;
    const fullScreenButton = figure.querySelector('.film-fullscreen');
    if (fullScreenButton) fullScreenButton.hidden = !showFilm;
    if (!showFilm) { video.pause(); return; }
    if (!video.getAttribute('src')) { video.src = video.dataset.src; video.load(); }
    if (play) video.play().catch(() => { /* Native controls remain available. */ });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab, true));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus(); activate(tabs[next]);
    });
  });
  const fullScreenButton = figure.querySelector('.film-fullscreen');
  fullScreenButton?.addEventListener('click', () => {
    video.tabIndex = 0; video.focus();
    if (video.requestFullscreen) video.requestFullscreen().catch(() => { window.open(video.currentSrc || video.dataset.src, '_blank', 'noopener'); });
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    else window.open(video.currentSrc || video.dataset.src, '_blank', 'noopener');
  });
  if (fullScreenButton) {
    video.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.fullscreenElement === video) { event.preventDefault(); document.exitFullscreen().catch(() => {}); }
    });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.activeElement === video) fullScreenButton.focus(); });
  }
  video.addEventListener('ended', () => video.load());
  video.addEventListener('play', () => films.forEach(other => { if (other !== video) other.pause(); }));
});
document.addEventListener('visibilitychange', () => { if (document.hidden) films.forEach(video => video.pause()); });

// Every app is present without JavaScript. Filtering only changes its visibility.
const filters = document.querySelector('.filters');
if (filters) {
  const products = [...document.querySelectorAll('.product')];
  const filterButtons = [...filters.querySelectorAll('[data-filter]')];
  const collectionStatus = document.querySelector('.collection-status');
  const labels = { all: 'all 10 apps', productivity: '2 productivity apps', arcade: '6 Mac games', android: '2 Android apps' };
  const setFilter = kind => {
    products.forEach(product => {
      product.hidden = kind !== 'all' && product.dataset.kind !== kind;
      if (product.hidden) product.querySelectorAll('video').forEach(video => video.pause());
    });
    filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === kind)));
    collectionStatus.textContent = `Showing ${labels[kind]}`;
  };
  filters.hidden = false;
  filterButtons.forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
  document.querySelectorAll('[data-collection-filter]').forEach(link => {
    link.addEventListener('click', () => setFilter(link.dataset.collectionFilter));
  });
  // Reveal an app before native anchor scrolling, including a repeated hash.
  const revealAnchor = hash => {
    const product = products.find(item => `#${item.id}` === hash);
    if (product?.hidden) setFilter('all');
    return product;
  };
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
    revealAnchor(link.hash);
    document.querySelector('.app-jump')?.removeAttribute('open');
  }));
  window.addEventListener('hashchange', () => {
    const target = revealAnchor(window.location.hash);
    target?.scrollIntoView({ block: 'start' });
  });
  const jumpMenu = document.querySelector('.app-jump');
  document.addEventListener('click', event => {
    if (jumpMenu?.open && !jumpMenu.contains(event.target)) jumpMenu.open = false;
  });
  jumpMenu?.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      jumpMenu.open = false;
      jumpMenu.querySelector('summary').focus();
    }
  });
}
