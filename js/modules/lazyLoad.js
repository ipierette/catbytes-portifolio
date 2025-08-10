// js/modules/lazyLoad.js
let observer;

/** Observa <img data-src> e só troca para src quando entrar na viewport */
export function initLazyLoad(root = document) {
  const imgs = root.querySelectorAll('img[data-src]');
  if (!('IntersectionObserver' in window)) {
    imgs.forEach(img => hydrate(img));
    return;
  }
  if (!observer) {
    observer = new IntersectionObserver(onIntersect, {
      rootMargin: '200px 0px',   // carrega um pouco antes de aparecer
      threshold: 0.01
    });
  }
  imgs.forEach(img => observer.observe(img));
}

function onIntersect(entries) {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const img = entry.target;
    hydrate(img);
    observer.unobserve(img);
  });
}

function hydrate(img) {
  if (img.dataset.src) {
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
  }
  img.addEventListener('load', () => img.classList.add('lazy-loaded'), { once: true });
}

/** Use quando criar imagens dinamicamente via JS (ex.: slides da galeria) */
export function registerLazy(img) {
  if (observer) observer.observe(img);
  else hydrate(img);
}
