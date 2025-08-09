// js/modules/generateAd.js

const $ = (s) => document.querySelector(s);
const show = (el) => el && el.classList.remove('hidden');
const hide = (el) => el && el.classList.add('hidden');

async function callFunction(payload) {
  const res = await fetch('/.netlify/functions/generate-ad', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderOutput(container, data) {
  // limpa container e monta tudo por JS (sem tocar no HTML base)
  container.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.style.whiteSpace = 'pre-wrap';

  if (data?.title) {
    const h = document.createElement('h3');
    h.textContent = data.title;
    h.style.margin = '6px 0 10px';
    h.style.fontWeight = '700';
    wrap.appendChild(h);
  }

  if (data?.ad_copy) {
    const p = document.createElement('p');
    p.textContent = data.ad_copy;
    wrap.appendChild(p);
  }

  if (Array.isArray(data?.hashtags) && data.hashtags.length) {
    const tags = document.createElement('p');
    tags.style.marginTop = '10px';
    tags.textContent = data.hashtags.join(' ');
    wrap.appendChild(tags);
  }

  if (data?.posting_plan) {
    const plan = document.createElement('div');
    plan.style.marginTop = '14px';

    const title = document.createElement('p');
    title.style.fontWeight = '600';
    title.textContent = 'Estratégia de postagem (7 dias):';
    plan.appendChild(title);

    const ul = document.createElement('ul');
    ul.style.margin = '6px 0 0 16px';

    if (Array.isArray(data.posting_plan.when)) {
      const li = document.createElement('li');
      li.textContent = `Melhores horários: ${data.posting_plan.when.map(w => `${w.day} ${w.time}`).join(', ')}`;
      ul.appendChild(li);
    }
    if (Array.isArray(data.posting_plan.platforms)) {
      const li = document.createElement('li');
      li.textContent = `Plataformas: ${data.posting_plan.platforms.join(', ')}`;
      ul.appendChild(li);
    }
    if (Array.isArray(data.posting_plan.where_to_post)) {
      const li = document.createElement('li');
      li.textContent = `Onde postar: ${data.posting_plan.where_to_post.join(' • ')}`;
      ul.appendChild(li);
    }
    if (Array.isArray(data.posting_plan.who_to_tag)) {
      const li = document.createElement('li');
      li.textContent = `Quem marcar: ${data.posting_plan.who_to_tag.join(', ')}`;
      ul.appendChild(li);
    }
    if (Array.isArray(data.posting_plan.cta_tips)) {
      const li = document.createElement('li');
      li.textContent = `Dicas de mídia: ${data.posting_plan.cta_tips.join(' • ')}`;
      ul.appendChild(li);
    }
    if (Array.isArray(data.posting_plan.crosspost_tips)) {
      const li = document.createElement('li');
      li.textContent = `Crosspost: ${data.posting_plan.crosspost_tips.join(' • ')}`;
      ul.appendChild(li);
    }

    plan.appendChild(ul);
    wrap.appendChild(plan);
  }

  // Fallback: se a função devolveu texto cru
  if (!data?.title && !data?.ad_copy && data?.raw) {
    const pre = document.createElement('pre');
    pre.textContent = data.raw;
    wrap.appendChild(pre);
  }

  container.appendChild(wrap);
}

export function initGenerateAd() {
  const btn = $('#generate-ad-btn');
  if (!btn) return;

  const input = $('#cat-description');
  const box = $('#generated-ad-container');     // container onde vamos injetar
  const text = $('#generated-ad-text');         // se existir, usamos como fallback simples
  const loader = $('#loading-indicator');       // se existir

  btn.addEventListener('click', async () => {
    const description = (input?.value || '').trim();
    if (!description) {
      alert('Por favor, descreva o gatinho para gerar o anúncio.');
      return;
    }

    show(loader); if (box) hide(box);

    try {
      const { data } = await callFunction({ description });
      if (box) {
        renderOutput(box, data);
        show(box);
      } else if (text) {
        text.textContent = data?.ad_copy || 'Anúncio gerado.';
      }
    } catch (e) {
      console.error('[GenerateAd] erro:', e);
      if (text) text.textContent = 'Ocorreu um erro ao gerar o anúncio. Tente novamente.';
    } finally {
      hide(loader);
    }
  });
}
