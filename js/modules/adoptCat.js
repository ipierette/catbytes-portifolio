// Adaptado para usar Netlify Function + manter fallbacks existentes

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('adopt-cat-form');
  const resultsContainer = document.getElementById('adopt-results');

  if (!form || !resultsContainer) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const payload = {
      age: formData.get('age') || '',
      color: formData.get('color') || '',
      localizacao: formData.get('localizacao') || ''
    };

    resultsContainer.innerHTML = '<p>🔍 Buscando anúncios...</p>';

    try {
      // Chama a Netlify Function
      const resp = await fetch('/.netlify/functions/adote-gatinho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) throw new Error(`Erro na função: ${resp.status}`);
      const data = await resp.json();

      if (data?.sucesso && Array.isArray(data.anuncios) && data.anuncios.length) {
        renderAnuncios(data.anuncios, resultsContainer);
        // Se a função retornar onlyFallbacks, você ainda pode disparar suas buscas genéricas abaixo
        if (data.meta?.onlyFallbacks) {
          console.warn('Function retornou apenas fallbacks — mantendo buscas genéricas.');
          buscarFallbacksGoogleOlx(payload, resultsContainer);
        }
      } else {
        console.warn('Function não retornou anúncios válidos — usando buscas genéricas.');
        buscarFallbacksGoogleOlx(payload, resultsContainer);
      }

    } catch (err) {
      console.error('Erro ao buscar na Function:', err);
      buscarFallbacksGoogleOlx(payload, resultsContainer);
    }
  });

  /**
   * Renderiza lista de anúncios
   */
  function renderAnuncios(anuncios, container) {
    container.innerHTML = '';
    anuncios.forEach(a => {
      const card = document.createElement('div');
      card.classList.add('adopt-card');

      card.innerHTML = `
        <h3>${a.titulo}</h3>
        <p>${a.descricao}</p>
        <a href="${a.url}" target="_blank" rel="noopener noreferrer">🔗 Ver anúncio</a>
        <small>Fonte: ${a.fonte || 'desconhecida'}</small>
      `;

      container.appendChild(card);
    });
  }

  /**
   * Mantém as buscas genéricas Google + OLX (já existentes no seu código original)
   */
  function buscarFallbacksGoogleOlx({ color, localizacao }, container) {
    const termo = encodeURIComponent(`adoção de gatos ${color || ''} ${localizacao || ''}`.trim());

    const fallbacks = [
      {
        titulo: 'Resultados de adoção no Google',
        descricao: 'Busca direta com os melhores resultados próximos.',
        url: `https://www.google.com/search?q=${termo}`,
        fonte: 'google.com'
      },
      {
        titulo: 'Veja anúncios de adoção no OLX',
        descricao: 'Busca sugerida de gatos disponíveis para adoção no OLX.',
        url: `https://www.olx.com.br/brasil?q=${termo}`,
        fonte: 'olx.com.br'
      }
    ];

    renderAnuncios(fallbacks, container);
  }
});
