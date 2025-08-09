// POST /.netlify/functions/adote-gatinho
// Requer env SERPAPI_KEY

const SOURCE_SITES = [
  'olx.com.br',
  'adoteumgatinho.org.br',
  'catland.org.br',
  'adotepetz.com.br',
  'adotebicho.com.br',
  'paraisodosfocinhos.com.br',
  'adoteumpet.com.br'
];

const BAD_WORDS = [
  'venda', 'apenas venda', 'só venda', 'so venda', 'r$', 'preço',
  'doação com valor', 'doação com preço', 'doacao com valor',
  'doacao com preco', 'custo', 'taxa de entrega'
];

const isValidUrl = (u) => {
  try {
    new URL(u);
    return true;
  } catch {
    return false;
  }
};

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const SERPAPI_KEY = process.env.SERPAPI_KEY;
    if (!SERPAPI_KEY) {
      return { statusCode: 500, body: 'Faltando SERPAPI_KEY no ambiente.' };
    }

    const { age = '', color = '', localizacao = '' } = JSON.parse(event.body || '{}');

    // Monta a query (apenas termos úteis + restrição aos sites definidos)
    const terms = ['adoção de gatos'];
    if (color) terms.push(`gato ${color}`);
    if (age) terms.push(String(age));
    if (localizacao) terms.push(localizacao);

    const siteFilter = SOURCE_SITES.map(s => `site:${s}`).join(' OR ');
    const query = `${terms.join(' ')} ${siteFilter}`;

    // Chamada SerpAPI (Google)
    const serpUrl = new URL('https://serpapi.com/search');
    serpUrl.searchParams.set('engine', 'google');
    serpUrl.searchParams.set('hl', 'pt-BR');
    serpUrl.searchParams.set('gl', 'br');
    serpUrl.searchParams.set('num', '12');
    serpUrl.searchParams.set('q', query);
    serpUrl.searchParams.set('api_key', SERPAPI_KEY);

    const res = await fetch(serpUrl.toString());
    if (!res.ok) {
      const text = await res.text();
      return { statusCode: 502, body: `Erro SerpAPI: ${text}` };
    }
    const data = await res.json();

    // Normaliza resultados
    const raw = Array.isArray(data.organic_results) ? data.organic_results : [];
    let anuncios = raw.map(r => ({
      titulo: r.title || 'Anúncio de Adoção',
      descricao: r.snippet || '',
      url: r.link || '',
      fonte: r.displayed_link || r.source || 'desconhecida',
      score: 0
    }))
    .filter(a =>
      a.descricao &&
      a.descricao.length >= 30 &&
      !BAD_WORDS.some(w => a.descricao.toLowerCase().includes(w)) &&
      a.url && isValidUrl(a.url)
    );

    // Ordena por qualidade "simples": tamanho do snippet e se bate com cor/local
    const prefer = (a) => {
      let s = 0;
      if (color && a.descricao.toLowerCase().includes(color.toLowerCase())) s += 0.35;
      if (localizacao && a.descricao.toLowerCase().includes(localizacao.toLowerCase())) s += 0.35;
      s += Math.min(a.descricao.length / 220, 0.3);
      return s;
    };
    anuncios.forEach(a => a.score = prefer(a));
    anuncios.sort((a, b) => (b.score || 0) - (a.score || 0));
    anuncios = anuncios.slice(0, 6);

    // Fallback se nada passou no filtro
    if (!anuncios.length) {
      const qBase = encodeURIComponent(terms.join(' '));
      anuncios = [
        {
          titulo: 'Resultados de adoção no Google',
          descricao: 'Busca direta com os melhores resultados próximos.',
          url: `https://www.google.com/search?q=${qBase}`,
          fonte: 'google.com',
          score: 0
        }
      ];
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sucesso: true,
        quantidade: anuncios.length,
        anuncios,
        mensagem: anuncios.length > 1
          ? 'Veja os anúncios de adoção encontrados.'
          : 'Não achamos anúncios específicos; sugerimos uma busca direta.',
        meta: { engine: 'serpapi-google', terms, sites: SOURCE_SITES }
      })
    };
  } catch (err) {
    return { statusCode: 500, body: `Erro: ${err.message}` };
  }
};
