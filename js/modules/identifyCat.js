// js/modules/identifyCat.js
export function initIdentifyCat() {
  const API_URL = '/.netlify/functions/identify-cat'; // ajuste se necessário

  // --- Seletores existentes no seu HTML ---
  const section = document.querySelector('#identify-cat');
  if (!section) return;

  const form = section.querySelector('form');
  const fileInput = section.querySelector('#cat-photo');
  const submitBtn = form?.querySelector('button[type="submit"]');

  const resultsBox = section.querySelector('#identification-results');
  const spanAge = section.querySelector('#result-age');
  const spanBreed = section.querySelector('#result-breed');
  const spanPersonality = section.querySelector('#result-personality');

  // cria "Observações" se ainda não existe
  let notesRow = resultsBox?.querySelector('[data-notes-row]');
  if (!notesRow && resultsBox) {
    notesRow = document.createElement('p');
    notesRow.setAttribute('data-notes-row', '');
    notesRow.innerHTML = `<strong>Observações:</strong> <span id="result-notes">--</span>`;
    resultsBox.appendChild(notesRow);
  }
  const spanNotes = section.querySelector('#result-notes');

  // --- Barra de mensagens (inline, sem CSS externo) ---
  let msgBar = section.querySelector('#ic-msgbar');
  if (!msgBar) {
    msgBar = document.createElement('div');
    msgBar.id = 'ic-msgbar';
    Object.assign(msgBar.style, {
      marginTop: '8px', padding: '10px 12px', borderRadius: '10px',
      fontSize: '14px', lineHeight: '1.45', display: 'none'
    });
    form?.insertAdjacentElement('afterend', msgBar);
  }

  const SIZE_WARN = 2 * 1024 * 1024;  // 2 MB
  const SIZE_MAX  = 8 * 1024 * 1024;  // 8 MB

  const setMsg = (type, text) => {
    msgBar.style.display = 'block';
    msgBar.style.border = '1px solid transparent';
    msgBar.style.background = '#e8f0fe';
    msgBar.style.borderColor = '#c6dafc';
    msgBar.style.color = '#111';
    if (type === 'warn') { msgBar.style.background = '#fff4e5'; msgBar.style.borderColor = '#ffd9a8'; }
    else if (type === 'error') { msgBar.style.background = '#fdecea'; msgBar.style.borderColor = '#f5c2c0'; }
    else if (type === 'success') { msgBar.style.background = '#e6f4ea'; msgBar.style.borderColor = '#b7e1c1'; }
    msgBar.textContent = text;
  };
  const clearMsg = () => { msgBar.style.display = 'none'; msgBar.textContent = ''; };

  // habilita/desabilita o botão trocando classes Tailwind visuais
  const setBtnEnabled = (enabled) => {
    if (!submitBtn) return;
    submitBtn.disabled = !enabled;
    submitBtn.classList.toggle('opacity-50', !enabled);
    submitBtn.classList.toggle('cursor-not-allowed', !enabled);
    submitBtn.classList.toggle('hover:bg-purple-600', enabled);
  };

  const setLoading = (is) => {
    if (!submitBtn) return;
    submitBtn.textContent = is ? 'Analisando…' : 'Analisar Foto';
    setBtnEnabled(!is); // durante loading fica desabilitado
  };

  // ============ HEIC → JPEG e otimização ============
  let heicLibPromise = null;
  function ensureHeic2Any() {
    if (!heicLibPromise) {
      heicLibPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
        s.async = true;
        s.onload = () => resolve(window.heic2any);
        s.onerror = () => reject(new Error('Falha ao carregar heic2any'));
        document.head.appendChild(s);
      });
    }
    return heicLibPromise;
  }

  async function convertHeicToJpeg(file, quality = 0.9) {
    const heic2any = await ensureHeic2Any();
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality });
    const blob = out instanceof Blob ? out : out[0];
    return new File([blob], (file.name.replace(/\.(heic|heif)$/i, '') || 'foto') + '.jpg', { type: 'image/jpeg' });
  }

  async function toJpegUnder2MB(file, qualityStart = 0.92) {
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width; canvas.height = bmp.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    let q = qualityStart, blob;
    for (let i = 0; i < 5; i++) {
      blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', q));
      if (blob && blob.size <= 2 * 1024 * 1024) break;
      q -= 0.12;
      if (q < 0.4) break;
    }
    return blob ? new File([blob], (file.name || 'foto.jpg'), { type: 'image/jpeg' }) : file;
  }

  const isHeicLike = (file) => {
    const t = (file.type || '').toLowerCase();
    const n = (file.name || '').toLowerCase();
    return t.includes('heic') || t.includes('heif') || /\.hei[cf]$/.test(n);
  };

  // --- Progressive enhancement do "Como funciona" ---
  (function enhanceHowItWorks() {
    const alertBox = section.querySelector('[role="alert"]');
    if (!alertBox) return;

    const titleEl = alertBox.querySelector('p.font-bold');
    const longText = titleEl ? titleEl.nextElementSibling : null;

    if (longText) {
      longText.style.display = 'none';
      longText.setAttribute('aria-hidden', 'true');
    }

    const summary = document.createElement('p');
    Object.assign(summary.style, { marginTop: '6px', fontSize: '14px', fontWeight: '600' });
    summary.textContent = 'Feito com Netlify Functions e Google Gemini. Veja limites, privacidade e dicas no guia “Como funciona”.';
    if (titleEl) titleEl.insertAdjacentElement('afterend', summary); else alertBox.prepend(summary);

    const btnWrap = document.createElement('div');
    Object.assign(btnWrap.style, {
      display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '10px'
    });
    alertBox.appendChild(btnWrap);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Como funciona';
    btn.setAttribute('aria-haspopup', 'dialog');
    Object.assign(btn.style, {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      padding: '12px 22px', borderRadius: '9999px', fontWeight: '700', fontSize: '16px',
      border: 'none', cursor: 'pointer', color: '#fff',
      backgroundImage: 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
      boxShadow: '0 8px 18px rgba(124,58,237,.25)', transform: 'translateZ(0)',
    });
    const icon = document.createElement('span'); icon.setAttribute('aria-hidden', 'true'); icon.textContent = 'ℹ️';
    btn.prepend(icon);
    btnWrap.appendChild(btn);

    const overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', 'Como funciona');
    Object.assign(overlay.style, { position: 'fixed', inset: '0', background: 'rgba(0,0,0,.45)', display: 'none', zIndex: '9999', padding: '16px' });

    const modal = document.createElement('div');
    Object.assign(modal.style, {
      maxWidth: '720px', margin: '40px auto', background: '#fff', color: '#111',
      borderRadius: '16px', padding: '20px 22px',
      boxShadow: '0 12px 40px rgba(0,0,0,.25)', fontSize: '15px', lineHeight: '1.6'
    });

    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <h3 id="ic-modal-title" style="margin:0;font-size:20px;font-weight:800">Como funciona</h3>
        <button id="ic-close-modal" aria-label="Fechar" style="
          background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;padding:6px 10px;cursor:pointer;font-weight:700">Fechar</button>
      </div>
      <div style="margin-top:12px">
        <ul style="padding-left:18px;display:grid;gap:8px">
          <li><strong>Execução sob demanda:</strong> usamos Netlify Function com o modelo Gemini. A <strong>primeira chamada</strong> do dia pode levar alguns segundos.</li>
          <li><strong>Tamanho da imagem:</strong> <em>ideal</em> 1–2 MB; <em>máximo</em> 8 MB. Formatos: JPG/PNG/WEBP/HEIC (convertido automaticamente).</li>
          <li><strong>Privacidade:</strong> a imagem é processada temporariamente e <strong>não é armazenada</strong>.</li>
          <li><strong>Limites & ética:</strong> os resultados são <strong>estimativas</strong> (idade aproximada, possíveis raças, indícios de temperamento). <strong>Não é diagnóstico veterinário.</strong></li>
          <li><strong>Segurança:</strong> se houver humanos ou não for um gato, a análise é interrompida.</li>
          <li><strong>Dica de qualidade:</strong> boa iluminação e enquadramento melhoram o resultado.</li>
          <li><strong>Se falhar:</strong> tente novamente ou envie uma imagem <strong>menor que 2 MB</strong>.</li>
        </ul>
      </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    let lastFocused = null;
    const closeBtn = modal.querySelector('#ic-close-modal');

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {
        const focusables = modal.querySelectorAll('button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        const list = Array.from(focusables);
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    const open = () => {
      lastFocused = document.activeElement;
      overlay.style.display = 'block';
      overlay.setAttribute('aria-labelledby', 'ic-modal-title');
      closeBtn?.focus();
      document.addEventListener('keydown', onKeyDown, true);
    };
    const close = () => {
      overlay.style.display = 'none';
      document.removeEventListener('keydown', onKeyDown, true);
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    };

    btn.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  })();

  // --- Estado inicial do botão ---
  setBtnEnabled(false);

  // --- Arquivo selecionado (pode ser convertido/otimizado) ---
  let selectedFile = null;

  // --- Validação + conversão HEIC + otimização ---
  fileInput?.addEventListener('change', async () => {
    clearMsg();
    resultsBox?.classList.add('hidden');
    selectedFile = null;

    if (!fileInput.files?.[0]) { setBtnEnabled(false); return; }
    let file = fileInput.files[0];

    try {
      if (isHeicLike(file)) {
        setMsg('info', 'Convertendo HEIC/HEIF para JPEG…');
        file = await convertHeicToJpeg(file, 0.9);
        setMsg('success', 'Imagem convertida para JPEG automaticamente ✅');
      }

      if (['image/jpeg','image/png','image/webp'].includes((file.type||'').toLowerCase()) && file.size > SIZE_WARN) {
        setMsg('info', 'Otimizando a imagem para envio…');
        file = await toJpegUnder2MB(file);
      }

      if (file.size > SIZE_MAX) {
        setMsg('error', 'Arquivo grande demais. Reduza para no máximo 8 MB.');
        fileInput.value = '';
        setBtnEnabled(false);
        selectedFile = null;
        return;
      }
      if (file.size > SIZE_WARN) setMsg('warn', 'Vai funcionar, mas pode demorar um pouco (imagem acima de 2 MB).');
      else setMsg('success', 'Imagem ok para análise.');

      selectedFile = file;
      setBtnEnabled(true);
    } catch (err) {
      console.error(err);
      setMsg('error', 'Não foi possível preparar a imagem. Tente outra foto ou converta para JPG/PNG/WebP.');
      fileInput.value = '';
      setBtnEnabled(false);
    }
  });

  // --- Submissão ---
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMsg();
    resultsBox?.classList.add('hidden');

    if (!selectedFile) {
      setMsg('error', 'Selecione uma imagem primeiro.');
      setBtnEnabled(false);
      return;
    }

    const file = selectedFile;
    if (file.size > SIZE_MAX) {
      setMsg('error', 'Arquivo grande demais. Reduza para no máximo 8 MB.');
      setBtnEnabled(false);
      return;
    }
    if (file.size > SIZE_WARN) setMsg('warn', 'Vai funcionar, mas pode demorar um pouco (imagem acima de 2 MB).');

    const fd = new FormData();
    fd.append('data', file, file.name || 'foto.jpg'); // backend espera 'data'

    setLoading(true);
    setMsg('info', 'Analisando… ⏳');

    try {
      const res = await fetch(API_URL, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // ===== NORMALIZADOR (PT/EN) =====
      const toArray = (v) =>
        Array.isArray(v) ? v :
        (typeof v === 'string' && v.trim() ? [v.trim()] : []);

      const normalized = {
        idade:
          json?.idade ??
          json?.age?.bucket ??
          (typeof json?.age === 'string' ? json.age : null) ??
          '--',
        racas:
          (json?.racas ? toArray(json.racas)
            : Array.isArray(json?.breedCandidates)
              ? json.breedCandidates.map(b => b.label).filter(Boolean)
              : []),
        personalidade:
          (json?.personalidade ? toArray(json.personalidade)
            : Array.isArray(json?.personalityCues)
              ? json.personalityCues.map(c => c.trait).filter(Boolean)
              : []),
        observacoes:
          json?.observacoes ??
          json?.notes ??
          ''
      };

      // checagem de segurança (mantida)
      if (json?.safety?.isHuman) {
        setMsg('error', 'Parece haver humanos na imagem; por segurança não analisamos pessoas. Envie apenas fotos de gatinhos. 😺');
        return;
      }

      // Preenche UI com o normalizado + fallback
      if (spanAge) spanAge.textContent = normalized.idade || '--';
      if (spanBreed) {
        if (normalized.racas.length) {
          spanBreed.textContent = normalized.racas.join(', ');
        } else if (Array.isArray(json?.breedCandidates) && json.breedCandidates.length) {
          spanBreed.textContent = json.breedCandidates
            .slice(0, 3)
            .map(b => `${b.label} (${Math.round((b.confidence || 0) * 100)}%)`)
            .join(', ');
        } else {
          spanBreed.textContent = '--';
        }
      }
      if (spanPersonality) {
        if (normalized.personalidade.length) {
          spanPersonality.textContent = normalized.personalidade.join(', ');
        } else if (Array.isArray(json?.personalityCues) && json.personalityCues.length) {
          spanPersonality.textContent = json.personalityCues
            .slice(0, 5)
            .map(c => `${c.trait} (${Math.round((c.confidence || 0) * 100)}%)`)
            .join(', ');
        } else {
          spanPersonality.textContent = '--';
        }
      }
      if (spanNotes) spanNotes.textContent = normalized.observacoes || '--';

      // valida resultado mínimo
      if (
        (spanAge?.textContent === '--') &&
        (spanBreed?.textContent === '--') &&
        (spanPersonality?.textContent === '--') &&
        (spanNotes?.textContent === '--')
      ) {
        setMsg('error', 'Não conseguimos analisar agora. Tente novamente em alguns segundos ou envie uma imagem menor que 2 MB.');
        return;
      }

      resultsBox?.classList.remove('hidden');
      setMsg('success', 'Prontinho! Veja o resultado abaixo.');
    } catch (err) {
      console.error(err);
      setMsg('error', 'Não conseguimos analisar agora. Isso pode ocorrer na primeira chamada do dia ou por tamanho/conexão. Tente novamente em alguns segundos ou envie uma imagem menor que 2 MB.');
    } finally {
      setLoading(false);
    }
  });
}
