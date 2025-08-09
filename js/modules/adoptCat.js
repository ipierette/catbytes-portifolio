// public/js/modules/adoptCat.js
// Fonte principal: Netlify Function (SerpAPI)
// Mantém fallbacks Google/OLX e aviso de qualidade
// Exporta initAdoptCat() para ser chamado no main.js

const NETLIFY_FN = '/.netlify/functions/adote-gatinho';

// ---------------- Helpers ----------------
const $ = (sel, root = document) => root.querySelector(sel);

function el(tag, className = '', text = '') {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text) n.textContent = text;
  return n;
}

async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}${t ? ` · ${t}` : ''}`);
  }
  return res.json();
}

function bestUrl(anuncio) {
  try {
    const raw = anuncio?.url || anuncio?.link || '';
    if (!raw) return null;
    const hasProto = /^https?:\/\//i.test(raw);
    return new URL(hasProto ? raw : `https://${raw}`).toString();
  } catch {
    return null;
  }
}

function hostname(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return 'desconhecida';
  }
}

// ---------------- UI extras ----------------
function renderSadNotice(container) {
  const box = el(
    'div',
    'rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 p-3 my-3'
  );
  const p = el(
    'p',
    'text-sm',
    '😿 Ops! Apesar da quantidade enorme de fofuras sem lar, ainda não conseguimos selecionar anúncios confiáveis via automação agora. ' +
      'Por favor, use os links genéricos abaixo para ao menos dar uma olhadinha.'
  );
  box.appendChild(p);
  container.appendChild(box);
}

// ---------------- Render principal ----------------
export function renderAdoptionResults(container, data) {
  container.innerHTML = '';

  if (data?.mensagem) {
    container.appendChild(
      el('div', 'mb-4 font-semibold text-green-700', data.mensagem)
    );
  }

  let anuncios = Array.isArray(data?.anuncios) ? data.anuncios : [];
  const onlyFallbacks = Boolean(data?.meta?.onlyFallbacks);

  // Se veio vazio, cria fallbacks genéricos
  if (!anuncios.length) {
    anuncios = [
      {
        titulo: 'Resultados de adoção perto de você (Google)',
        descricao: 'Busca sugerida de adoção de gatos.',
        url: 'https://www.google.com/search?q=ado%C3%A7%C3%A3o+de+gatos',
        fonte: 'google.com',
        score: 0.8,
      },
      {
        titulo: 'Veja anúncios de adoção no OLX',
        descricao: 'Busca sugerida de gatos disponíveis para adoção no OLX.',
        url: 'https://www.olx.com.br/brasil?q=ado%C3%A7%C3%A3o+de+gatos',
        fonte: 'olx.com.br',
        score: 0.7,
      },
    ];
  }

  // Lista
  const list = el('div', 'space-y-3');
  container.appendChild(list);

  anuncios.forEach((anuncio) => {
    const href = bestUrl(anuncio);
    const card = el(
      'article',
      'flex items-start gap-3 p-4 rounded-xl shadow-sm border border-gray-200 bg-white/70 dark:bg-zinc-900/50'
    );

    // Badge score
    const badgeWrap = el('div', 'w-[70px] shrink-0 text-center');
    badgeWrap.appendChild(
      el('div', 'text-xs font-semibold text-yellow-700 mb-1', 'Score da IA')
    );
    const scoreRaw =
      typeof anuncio.score === 'number'
        ? anuncio.score
        : Number(anuncio.score) || 0;
    const shown = scoreRaw > 1 ? Math.round(scoreRaw) : Math.round(scoreRaw * 100);
    const badge = el(
      'span',
      'inline-flex items-center justify-center w-12 h-12 rounded-full border-2 border-yellow-500 text-sm font-bold cursor-help select-none',
      String(shown || 0)
    );
    badge.title =
      'Selo de confiabilidade: quanto maior o score, mais confiável o anúncio segundo a IA.';
    badgeWrap.appendChild(badge);

    // Conteúdo
    const content = el('div', 'flex-1 w-full');
    const titleText = anuncio.titulo || 'Anúncio de Adoção';
    const titleEl = href
      ? (() => {
          const a = el(
            'a',
            'text-lg font-bold text-blue-700 group hover:underline focus:outline-green-500 mr-2 break-normal',
            titleText
          );
          a.href = href;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          return a;
        })()
      : el('span', 'text-lg font-bold', titleText);

    const source = el(
      'span',
      'text-xs text-gray-500 align-middle',
      `(${anuncio.fonte || hostname(href)})`
    );
    const desc = el(
      'p',
      'text-sm text-gray-700 dark:text-gray-300 mt-1',
      anuncio.descricao || ''
    );

    content.appendChild(titleEl);
    content.appendChild(source);
    content.appendChild(desc);

    card.appendChild(badgeWrap);
    card.appendChild(content);
    list.appendChild(card);
  });

  // Aviso quando só há fallbacks
  if (onlyFallbacks) renderSadNotice(container);
}

// ---------------- Entry point usado pelo main.js ----------------
export function initAdoptCat() {
  // O formulário fica dentro da seção #adopt-cat
  const form = document.querySelector('#adopt-cat form');
  if (!form) return;

  // Garante container de resultados
  let resultsContainer = document.querySelector('#adopt-results-container');
  if (!resultsContainer) {
    resultsContainer = el('div', 'mt-8');
    resultsContainer.id = 'adopt-results-container';
    resultsContainer.setAttribute('aria-live', 'polite');
    form.parentNode.appendChild(resultsContainer);
  }

  // Habilita botão no load
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      age: $('#cat-age', form)?.value || '',
      color: $('#cat-color', form)?.value || '',
      localizacao: $('#cat-location', form)?.value || '',
    };

    resultsContainer.innerHTML =
      '<div class="text-sm text-gray-600">🔍 Buscando anúncios...</div>';

    try {
      const data = await postJSON(NETLIFY_FN, payload);
      renderAdoptionResults(resultsContainer, data);
    } catch (err) {
      console.error('Erro ao buscar anúncios:', err);
      // Renderiza apenas os fallbacks genéricos
      renderAdoptionResults(resultsContainer, { anuncios: [] });
      resultsContainer.appendChild(
        el(
          'div',
          'text-red-600 mt-2',
          'Erro ao buscar anúncios. Tente novamente em instantes.'
        )
      );
    }
  });
}
