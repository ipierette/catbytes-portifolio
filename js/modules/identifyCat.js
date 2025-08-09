// js/modules/identifyCat.js
// Integra a UI do Identificador de Gatinhos com a Netlify Function (Gemini)

export function initIdentifyCat() {
  const form = document.querySelector('#identify-cat form');
  if (!form) return; // seção não está no DOM

  const fileInput = document.getElementById('cat-photo');
  const resultsBox = document.getElementById('identification-results');
  const ageEl = document.getElementById('result-age');
  const breedEl = document.getElementById('result-breed');
  const personalityEl = document.getElementById('result-personality');

  // 👉 cria o parágrafo "Observações" dinamicamente se não existir
  let notesRow = resultsBox?.querySelector('[data-notes-row]');
  if (!notesRow && resultsBox) {
    notesRow = document.createElement('p');
    notesRow.setAttribute('data-notes-row', '');
    notesRow.innerHTML = `<strong>Observações:</strong> <span id="result-notes">--</span>`;
    resultsBox.appendChild(notesRow);
  }
  const notesEl = document.getElementById('result-notes');

  // feedback (mensagem abaixo do botão)
  let feedback = document.getElementById('identify-feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.id = 'identify-feedback';
    feedback.className = 'mt-4 text-center text-sm hidden';
    form.parentElement.insertBefore(feedback, form.nextSibling);
  }

  const submitBtn = form.querySelector('button[type="submit"]');

  const API_URL = '/.netlify/functions/identify-cat';
  const MAX_MB = 8;  // bloqueia acima de 8 MB
  const SOFT_MB = 2; // alerta acima de 2 MB

  const setBtn = (loading) => {
    if (loading) {
      submitBtn.textContent = 'Analisando...';
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      submitBtn.textContent = 'Analisar Foto';
      submitBtn.disabled = !(fileInput && fileInput.files && fileInput.files[0]);
      submitBtn.classList.toggle('opacity-50', submitBtn.disabled);
      submitBtn.classList.toggle('cursor-not-allowed', submitBtn.disabled);
    }
  };

  const showFeedback = (msg, type = 'info') => {
    feedback.textContent = msg;
    feedback.classList.remove('hidden');
    feedback.classList.remove('text-red-600', 'bg-red-50', 'text-green-700', 'bg-green-50', 'text-gray-600', 'bg-gray-50');
    if (type === 'error') feedback.classList.add('text-red-600', 'bg-red-50');
    else if (type === 'success') feedback.classList.add('text-green-700', 'bg-green-50');
    else feedback.classList.add('text-gray-600', 'bg-gray-50');
    feedback.classList.add('p-3', 'rounded');
  };

  const clearResults = () => {
    ageEl.textContent = '--';
    breedEl.textContent = '--';
    personalityEl.textContent = '--';
    if (notesEl) notesEl.textContent = '--';
    resultsBox?.classList.add('hidden');
  };

  // Habilita/desabilita botão ao escolher arquivo + validações
  fileInput.addEventListener('change', () => {
    clearResults();
    const f = fileInput.files?.[0];
    if (!f) return setBtn(false);

    const mb = f.size / (1024 * 1024);
    if (mb > MAX_MB) {
      showFeedback('Arquivo grande demais. Reduza para no máximo 8 MB.', 'error');
      setBtn(false);
      return;
    }

    if (mb > SOFT_MB) {
      showFeedback('Vai funcionar, mas pode demorar um pouco (imagem > 2 MB).', 'info');
    } else {
      feedback.classList.add('hidden');
    }

    setBtn(false); // reabilita botão
  });

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearResults();

    const f = fileInput.files?.[0];
    if (!f) {
      showFeedback('Selecione uma imagem primeiro.', 'error');
      return;
    }

    const mb = f.size / (1024 * 1024);
    if (mb > MAX_MB) {
      showFeedback('Arquivo grande demais. Reduza para no máximo 8 MB.', 'error');
      return;
    }

    try {
      setBtn(true);
      showFeedback('Enviando imagem para análise...', 'info');

      const fd = new FormData();
      // o backend espera o campo "data"
      fd.append('data', f, f.name);

      const res = await fetch(API_URL, { method: 'POST', body: fd });

      if (!res.ok) {
        const dbg = await safeReadText(res);
        console.error('Function error body:', dbg);
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      // Normaliza chaves (pt/en)
      const result = {
        idade: data.idade || data.age || '--',
        racas: Array.isArray(data.racas) ? data.racas : Array.isArray(data.breeds) ? data.breeds : [],
        personalidade: Array.isArray(data.personalidade)
          ? data.personalidade
          : Array.isArray(data.personality)
          ? data.personality
          : [],
        observacoes: data.observacoes || data.notes || '',
      };

      // Preenche UI
      ageEl.textContent = result.idade || '--';
      breedEl.textContent = result.racas?.join(', ') || '--';
      personalityEl.textContent = result.personalidade?.join(', ') || '--';
      if (notesEl) notesEl.textContent = result.observacoes || '--';

      resultsBox?.classList.remove('hidden');
      showFeedback('Prontinho! Veja o resultado abaixo.', 'success');
    } catch (err) {
      console.error(err);
      showFeedback(
        'Não conseguimos analisar agora. Isso pode ocorrer na primeira chamada do dia ou por tamanho/conexão. Tente novamente em alguns segundos ou envie uma imagem menor que 2 MB.',
        'error'
      );
    } finally {
      setBtn(false);
    }
  });

  // Estado inicial
  setBtn(false);

  async function safeReadText(res) {
    try {
      return await res.text();
    } catch {
      return '<no-body>';
    }
  }
}
