/* ============================================================================
 * AdoptCat – renderização de anúncios de adoção (cards responsivos)
 * - Intro global com descrição do score + "Entendi" (persistência em localStorage)
 * - Tooltip por badge (theme-aware) + links úteis
 * - Efeito ripple no clique do badge (usa a utility .ripple do Tailwind)
 * - Link no rodapé para reexibir a explicação (só aparece quando a intro está oculta)
 * - Correções de overflow (break-words/hyphens) e clamp (3 linhas mobile / 4 ≥sm)
 * ========================================================================== */

/* ------------------------------- Helpers ---------------------------------- */
function el(tag, className = '', text = '') {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null && text !== '') n.textContent = text;
  return n;
}

function hostname(url) {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : '';
  } catch {
    return '';
  }
}

function bestUrl(anuncio) {
  return anuncio?.url || anuncio?.link || anuncio?.href || '';
}

/** Clamp multi-linhas sem plugin. */
function clampLines(node, lines = 4) {
  if (!node) return;
  Object.assign(node.style, {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: String(lines),
    overflow: 'hidden'
  });
}

/** Debounce simples */
function debounce(fn, ms = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), ms);
  };
}

/** Normaliza qualquer score para 1–10. */
function normalizeScoreAnyTo10(raw) {
  let s = Number(raw);
  if (!isFinite(s)) return 0;
  if (s <= 1) s *= 10;         // 0–1
  else if (s <= 5) s *= 2;     // 1–5
  else if (s <= 10) s = s;     // 1–10
  else if (s <= 100) s /= 10;  // 0–100
  s = Math.max(1, Math.min(10, s));
  return Math.round(s);
}

/** Classifica nível + classes de cor. */
function scoreLevel(score10) {
  if (score10 >= 8) {
    return {
      label: 'Alto',
      ring: 'ring-emerald-400',
      pill: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
    };
  }
  if (score10 >= 5) {
    return {
      label: 'Médio',
      ring: 'ring-amber-400',
      pill: 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
    };
  }
  return {
    label: 'Baixo',
    ring: 'ring-rose-400',
    pill: 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
  };
}

/* ------------------------- Tooltip + Badge unificado ---------------------- */
let _tooltipIdSeq = 0;
function nextTooltipId() {
  _tooltipIdSeq += 1;
  return `ia-tooltip-${_tooltipIdSeq}`;
}

/** Conteúdo do tooltip (com links úteis) */
function buildTooltip(score10, lvl, tooltipId) {
  const tooltip = el(
    'div',
    [
      'absolute z-20 right-0 -top-2 translate-y-[-100%]',
      'max-w-[22rem] sm:max-w-xs px-3 py-2 rounded-lg',
      // cores por tema (claro/escuro)
      'bg-white text-zinc-900 ring-1 ring-zinc-200 shadow-md',
      'dark:bg-zinc-800 dark:text-white dark:ring-black/10 dark:shadow-lg',
      // transições e visibilidade
      'opacity-0 pointer-events-none translate-y-1',
      'transition',
      'group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0',
      'group-focus-within:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0'
    ].join(' ')
  );
  tooltip.id = tooltipId;
  tooltip.setAttribute('role', 'tooltip');
  tooltip.setAttribute('aria-hidden', 'true');

  const tipTitle = el('div', 'font-semibold mb-1', 'Como interpretar este score?');
  const tipText = el(
    'p',
    'text-zinc-600 dark:text-zinc-200',
    'Estimativa de confiabilidade da IA (1=baixo, 10=alto), combinando sinais como título, fonte e contexto do anúncio.'
  );
  const tipList = el('ul', 'mt-2 space-y-1 text-zinc-700 dark:text-zinc-100');
  tipList.appendChild(el('li', '', '• 8–10: Alta confiança (ex.: fontes reconhecidas, descrição clara).'));
  tipList.appendChild(el('li', '', '• 5–7: Média confiança (revise com cuidado).'));
  tipList.appendChild(el('li', '', '• 1–4: Baixa confiança (verifique antes de interagir).'));

  // Links úteis discretos
  const tipLinks = el('div', 'mt-3 space-y-1');
  // Link 1
  tipLinks.appendChild(el(
    'a',
    [
      'text-xs underline underline-offset-2',
      'text-sky-700 hover:text-sky-800',
      'dark:text-sky-300 dark:hover:text-sky-400',
      'block'
    ].join(' '),
    '10 coisas para saber antes de adotar um gato'
  ));
  tipLinks.lastChild.href = 'https://www.zooplus.pt/magazine/gatos/adotar-um-gato/10-coisas-que-deve-saber-antes-de-adotar-um-gato/';
  tipLinks.lastChild.target = '_blank';
  tipLinks.lastChild.rel = 'noopener noreferrer';
  // Link 2
  tipLinks.appendChild(el(
    'a',
    [
      'text-xs underline underline-offset-2',
      'text-sky-700 hover:text-sky-800',
      'dark:text-sky-300 dark:hover:text-sky-400',
      'block'
    ].join(' '),
    'Cuidados básicos antes de acolher um gato em casa'
  ));
  tipLinks.lastChild.href = 'https://omeuanimal.elanco.com/pt/tutores/cuidados-basicos-antes-de-acolher-um-gato-em-casa';
  tipLinks.lastChild.target = '_blank';
  tipLinks.lastChild.rel = 'noopener noreferrer';

  tooltip.appendChild(tipTitle);
  tooltip.appendChild(tipText);
  tooltip.appendChild(tipList);
  tooltip.appendChild(tipLinks);

  // Setinha (theme-aware)
  const arrow = el(
    'span',
    [
      'absolute -bottom-1 right-3 w-2.5 h-2.5 rotate-45',
      'bg-white ring-1 ring-zinc-200 shadow',
      'dark:bg-zinc-800 dark:ring-black/10 dark:shadow-[1px_1px_2px_rgba(0,0,0,0.20)]'
    ].join(' ')
  );
  tooltip.appendChild(arrow);

  return tooltip;
}

/** Badge (Score 1–10 + nível) com tooltip + ripple (.ripple utility) */
function createScoreBadge(score10) {
  const lvl = scoreLevel(score10);
  const tooltipId = nextTooltipId();

  const wrapper = el('div', 'relative inline-flex items-start justify-end group');

  // Botão do badge
  const btn = el(
    'button',
    [
      'relative overflow-hidden', // ripple precisa de overflow hidden
      'inline-flex items-center gap-2 px-3 py-2 rounded-xl',
      'bg-white/80 dark:bg-zinc-950/70 backdrop-blur supports-[backdrop-filter]:backdrop-blur',
      'border border-zinc-200/70 dark:border-zinc-800',
      'shadow-sm hover:shadow-md transition-all',
      'hover:-translate-y-0.5',
      'focus-visible:outline-none focus-visible:ring-2',
      `focus-visible:${lvl.ring}`
    ].join(' ')
  );
  btn.type = 'button';
  btn.setAttribute('aria-describedby', tooltipId);
  btn.setAttribute('aria-label', `Score da IA: ${score10} de 10 (${lvl.label})`);

  // Legenda (some em telas muito pequenas)
  const legend = el(
    'span',
    [
      'text-[11px] font-semibold tracking-wide',
      'text-zinc-600 dark:text-zinc-300',
      'max-[360px]:hidden'
    ].join(' '),
    'Score da IA: 1–10'
  );

  // Número
  const circle = el(
    'span',
    [
      'inline-flex items-center justify-center',
      'w-8 h-8 sm:w-9 sm:h-9 rounded-full',
      'font-bold text-sm sm:text-base',
      'bg-white dark:bg-zinc-900',
      'ring-2', lvl.ring
    ].join(' ')
  );
  circle.textContent = String(score10);

  // Nível
  const level = el(
    'span',
    ['px-2 py-0.5 rounded-full text-[11px] font-medium', lvl.pill].join(' '),
    lvl.label
  );

  btn.appendChild(legend);
  btn.appendChild(circle);
  btn.appendChild(level);

  // Tooltip
  const tooltip = buildTooltip(score10, lvl, tooltipId);
  wrapper.appendChild(btn);
  wrapper.appendChild(tooltip);

  // Ripple effect (usa a utility .ripple que você definiu no Tailwind)
  btn.addEventListener('click', (e) => {
    const ripple = document.createElement('span');
    ripple.className = ['ripple', 'bg-zinc-400/30 dark:bg-zinc-200/20'].join(' ');

    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.8;
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });

  // Acessibilidade + interação (touch/teclado)
  let touchTimer = null;
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function showTip() {
    tooltip.style.opacity = '1';
    tooltip.style.pointerEvents = 'auto';
    tooltip.style.transform = 'translateY(0)';
    tooltip.setAttribute('aria-hidden', 'false');
  }
  function hideTip() {
    tooltip.style.opacity = '';
    tooltip.style.pointerEvents = '';
    tooltip.style.transform = '';
    tooltip.setAttribute('aria-hidden', 'true');
  }

  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    showTip();
    clearTimeout(touchTimer);
    touchTimer = setTimeout(hideTip, 2500);
  }, { passive: false });

  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const closed = tooltip.getAttribute('aria-hidden') === 'true';
      if (closed) showTip(); else hideTip();
    } else if (e.key === 'Escape') {
      hideTip();
      btn.blur();
    }
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) hideTip();
  });

  if (prefersReducedMotion) tooltip.classList.remove('transition');

  return wrapper;
}

/* -------------------- Intro + link "mostrar novamente" -------------------- */
const INTRO_STORAGE_KEY = 'adoptcat_intro_seen_v1';

/** Renderiza a intro no topo. Retorna true se foi exibida. */
function renderIntro(container) {
  const seen = localStorage.getItem(INTRO_STORAGE_KEY) === '1';
  if (seen) return false;

  const intro = el(
    'div',
    [
      'mb-3 sm:mb-4 px-3 py-2',
      'rounded-lg',
      'text-[13px] sm:text-sm leading-6',
      'bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200',
      'dark:bg-zinc-900/60 dark:text-zinc-200 dark:ring-zinc-800',
      'flex items-start justify-between gap-3'
    ].join(' ')
  );
  intro.setAttribute('data-intro', 'true');

  const text = el(
    'p',
    'flex-1',
    'Score da IA: cada anúncio recebe uma pontuação de 1 a 10, indicando a confiabilidade segundo sinais avaliados pela IA. Clique no badge para entender melhor como interpretar essa pontuação.'
  );

  const btn = el(
    'button',
    [
      'shrink-0 inline-flex items-center gap-1',
      'px-2.5 py-1.5 rounded-md text-[12px] font-semibold',
      'bg-zinc-900 text-white hover:bg-zinc-800',
      'dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white',
      'transition'
    ].join(' '),
    'Entendi'
  );

  btn.addEventListener('click', () => {
    localStorage.setItem(INTRO_STORAGE_KEY, '1');
    intro.remove();
    const footer = container.querySelector('[data-show-intro-link]');
    if (footer) footer.classList.remove('hidden');
  });

  intro.appendChild(text);
  intro.appendChild(btn);
  container.appendChild(intro);
  return true;
}

/** Link de rodapé para reexibir a intro. Visível apenas quando a intro está oculta. */
function renderShowIntroLink(container, introVisible) {
  // remove versão antiga em re-render
  const old = container.querySelector('[data-show-intro-link]');
  if (old) old.remove();

  const wrap = el('div', 'mt-3 sm:mt-4 flex justify-end');
  wrap.setAttribute('data-show-intro-link', 'true');

  const link = el(
    'button',
    [
      'text-xs underline underline-offset-2',
      'text-zinc-600 hover:text-zinc-800',
      'dark:text-zinc-300 dark:hover:text-white'
    ].join(' '),
    'Mostrar explicação do score novamente'
  );
  link.type = 'button';

  if (introVisible) wrap.classList.add('hidden');

  link.addEventListener('click', () => {
    localStorage.removeItem(INTRO_STORAGE_KEY);

    // se já não existe intro visível, inserir no topo
    const already = container.querySelector('[data-intro="true"]');
    if (!already) {
      const first = container.firstChild;
      const introShown = renderIntro(container);
      if (introShown && first) {
        // move a intro recém-criada para o topo caso necessário
        container.insertBefore(container.lastChild, first);
      }
    }

    // esconder o link enquanto a intro estiver visível
    wrap.classList.add('hidden');

    // scroll suave para o topo
    if ('scrollTo' in window) window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  wrap.appendChild(link);
  container.appendChild(wrap);
}

/* ------------------------------ Renderização ------------------------------ */
/**
 * Renderiza uma lista de anúncios no container.
 * @param {HTMLElement} container
 * @param {Array<Object>} data (titulo, descricao, url, fonte, score)
 */
export function renderAdoptionResults(container, data) {
  if (!container) return;
  container.textContent = '';

  // Intro global
  const introVisible = renderIntro(container);

  const anuncios = Array.isArray(data) ? data : (data?.items || data?.results || []);

  const list = el('div', 'flex flex-col gap-3 sm:gap-4');
  container.appendChild(list);

  // Reaplicadores de clamp (um listener global)
  const reapplyClampFns = [];

  anuncios.forEach((anuncio) => {
    const href = bestUrl(anuncio);

    // Card
    const card = el(
      'article',
      [
        'rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70',
        'bg-white/80 dark:bg-zinc-900/60',
        'backdrop-blur supports-[backdrop-filter]:backdrop-blur',
        'shadow-sm hover:shadow-md transition-shadow'
      ].join(' ')
    );

    // Cabeçalho
    const header = el('div', 'flex items-start justify-between gap-3 p-3 sm:p-4');

    const titleText = anuncio.titulo || anuncio.title || 'Anúncio de Adoção';
    const titleEl = href
      ? (() => {
          const a = el(
            'a',
            [
              'text-base sm:text-lg font-semibold text-blue-600 dark:text-blue-400',
              'underline-offset-2 hover:underline focus-visible:outline-none',
              'focus-visible:ring-2 focus-visible:ring-blue-400 rounded',
              'break-words hyphens-auto',
              'min-w-0 flex-1'
            ].join(' '),
            titleText
          );
          a.href = href;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          return a;
        })()
      : el('span', 'text-base sm:text-lg font-semibold break-words hyphens-auto min-w-0 flex-1', titleText);

    const rawScore = anuncio?.score ?? anuncio?.pontuacao ?? anuncio?.relevancia;
    const score10 = normalizeScoreAnyTo10(rawScore || 0);
    const badge = createScoreBadge(score10);

    header.appendChild(titleEl);
    header.appendChild(badge);

    // Corpo
    const body = el('div', 'px-3 pb-3 sm:px-4 sm:pb-4');

    const fonteTxt = anuncio.fonte || anuncio.source || hostname(href) || 'fonte desconhecida';
    const chip = el(
      'span',
      [
        'inline-flex max-w-full items-center gap-1',
        'px-2 py-0.5 rounded-full',
        'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
        'text-[11px] font-medium break-words hyphens-auto'
      ].join(' '),
      fonteTxt
    );

    const descTxt = anuncio.descricao || anuncio.description || '';
    const desc = el(
      'p',
      [
        'mt-2 text-sm sm:text-[15px]',
        'text-zinc-700 dark:text-zinc-200',
        'leading-6 break-words hyphens-auto'
      ].join(' '),
      descTxt
    );

    const applyClamp = () =>
      clampLines(desc, window.matchMedia('(min-width: 640px)').matches ? 4 : 3);
    applyClamp();
    reapplyClampFns.push(applyClamp);

    body.appendChild(chip);
    body.appendChild(desc);

    card.appendChild(header);
    card.appendChild(body);
    list.appendChild(card);
  });

  // Rodapé com link para reexibir a intro (aparece só quando a intro está oculta)
  renderShowIntroLink(container, introVisible);

  // Listener global para reaplicar clamp ao redimensionar
  const onResize = debounce(() => reapplyClampFns.forEach((fn) => fn()), 150);
  window.addEventListener('resize', onResize, { passive: true });
}

/** Inicializador opcional (puxar direto da Function) */
export async function initAdoptCat(options = {}) {
  const {
    containerSelector = '#adopt-results',
    endpoint = '/.netlify/functions/adopt-cat',
    transform
  } = options;

  const container = document.querySelector(containerSelector);
  if (!container) return;

  try {
    container.setAttribute('aria-busy', 'true');

    const res = await fetch(endpoint, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const items = transform ? transform(json) : (json?.items || json?.results || json);
    renderAdoptionResults(container, items);
  } catch (err) {
    console.error('[AdoptCat] erro ao buscar/renderizar]:', err);
    container.innerHTML = `
      <div class="p-4 rounded-2xl border border-red-300/60 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200">
        Não foi possível carregar os anúncios agora. Tente novamente em instantes.
      </div>`;
  } finally {
    container.removeAttribute('aria-busy');
  }
}
