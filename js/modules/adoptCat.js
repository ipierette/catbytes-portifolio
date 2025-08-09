// js/modules/adoptCat.js
// Autônomo: sem imports de utils.js
// Agora usando Netlify Function como fonte principal, mantendo fallbacks Google/OLX

const NETLIFY_FN = '/.netlify/functions/adopt-cat';

// Helpers DOM
const $ = (sel, root = document) => root.querySelector(sel);
function el(tag, className = '', text = '') {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text) n.textContent = text;
  return n;
}

// HTTP (substitui callN8nWebhook utils)
async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} ${t ? '· ' + t : ''}`);
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

function renderCards(anuncios, container) {
  container.innerHTML = '';
  if (!Array.isArray(anuncios) || !anuncios.length) {
    container.innerHTML = `<div class="text-sm text-gray-600">Não encontramos anúncios. Tente ajustar os filtros.</div>`;
    return;
  }

  anuncios.forEach((a) => {
    const url = bestUrl(a);
    const card = el('article', 'adopt-card p-4 rounded-xl shadow-sm border border-gray-200 mb-3 bg-white/70 dark:bg-zinc-900/50');
    const h = el('h3', 'font-semibold text-lg mb-1', a.titulo || 'Anúncio de Adoção');
    const p = el('p', 'text-sm text-gray-700 dark:text-gray-300 mb-2', a.descricao || '');
    const meta = el('div', 'text-xs text-gray-500 mb-2', `Fonte: ${a.fonte || 'desconhecida'}`);
    const link = el('a', 'inline-block underline text-blue-700 dark:text-blue-400');
    link.href = url || '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = '🔗 Ver anúncio';
    if (!url) link.setAttribute('aria-disabled', 'true');

    card.append(h, p, meta, link);
    container.appendChild(card);
  });
}

/**
 * Mantém as buscas genéricas Google + OLX (se a Function falhar ou só devolver fallbacks)
 */
function renderFallbacksGoogleOlx({ color, localizacao }, container, append = false) {
  const termo = encodeURIComponent(
    `adoção de gatos ${color || ''} ${localizacao || ''}`.trim(),
  );

  const fallbacks = [
    {
      titulo: 'Resultados de adoção no Google',
      descricao: 'Busca direta com os melhores resultados próximos.',
      url: `https://www.google.com/search?q=${termo}`,
      fonte: 'google.com',
    },
    {
      titulo: 'Veja anúncios de adoção no OLX',
      descricao: 'Busca sugerida de gatos disponíveis para adoção no OLX.',
      url: `https://www.olx.com.br/brasil?q=${termo}`,
      fonte: 'olx.com.br',
    },
  ];

  if (!append) container.innerHTML = '';
  renderCards(fallbacks, container);
}

function renderFromFunctionResponse(data, container, payload) {
  if (data?.sucesso && Array.isArray(data.anuncios) && data.anuncios.length) {
    renderCards(data.anuncios, container);

    // Se a function sinalizar que retornou só fallbacks internos,
    // mantemos também as buscas genéricas já existentes:
    if (data.meta?.onlyFallbacks) {
      // Mostra também os links Google/OLX sem apagar os cartões já renderizados
      const sep = el('div', 'my-3 text-xs uppercase tracking-wide text-gray-500', 'Outras buscas rápidas');
      container.appendChild(sep);
      renderFallbacksGoogleOlx(payload, container, /*append*/ true);
    }
    return true;
  }
  return false;
}

function initAdoptCat() {
  const form = document.getElementById('adopt-cat-form');
  const resultsContainer = document.getElementById('adopt-results');
  if (!form || !resultsContainer) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      age: $('#cat-age')?.value || '',
      color: $('#cat-color')?.value || '',
      localizacao: $('#cat-location')?.value || '',
    };

    resultsContainer.innerHTML = '<div class="text-sm text-gray-600">🔍 Buscando anúncios...</div>';

    try {
      // 1) Tenta a Netlify Function (SerpAPI)
      const data = await postJSON(NETLIFY_FN, payload);

      const ok = renderFromFunctionResponse(data, resultsContainer, payload);
      if (!ok) {
        // 2) Se não vierem anúncios úteis, renderiza as buscas genéricas já existentes
        console.warn('Function sem anúncios válidos — caindo para Google/OLX.');
        renderFallbacksGoogleOlx(payload, resultsContainer);
      }
    } catch (err) {
      console.error('Erro ao buscar na Function:', err);
      // 3) Em caso de erro na function, mantém fallbacks
      renderFallbacksGoogleOlx(payload, resultsContainer);
    }
  });
}

document.addEventListener('DOMContentLoaded', initAdoptCat);
