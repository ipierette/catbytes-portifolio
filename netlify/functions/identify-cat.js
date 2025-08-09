// netlify/functions/identify-cat.js
export default async (request) => {
  try {
    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Use POST' }), { status: 405 });
    }

    const form = await request.formData();
    const file = form.get('data');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return new Response(JSON.stringify({ error: 'Envie a imagem no campo "data"' }), { status: 400 });
    }

    // Limite seguro pro free tier
    if (file.size > 8 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Imagem acima de 8MB' }), { status: 413 });
    }

    const buf  = Buffer.from(await file.arrayBuffer());
    const base64 = buf.toString('base64');
    const mime = file.type || 'image/jpeg';

    const prompt = `
Você é um assistente especialista em felinos. Analise APENAS o gato na imagem.
Tarefa:
1) Estimar faixa etária (filhote|jovem_adulto|adulto|idoso) e idade aproximada (anos).
2) Sugerir possíveis raças (ou SRD) top 3 com porcentagens.
3) Indícios de temperamento (ex.: curioso, relaxado, alerta) e justificativa.
4) Nota de confiança geral (0–1).
5) Responda ESTRITAMENTE em JSON:
{
  "age": {"bucket": "filhote|jovem_adulto|adulto|idoso", "yearsApprox": number},
  "breedCandidates": [{"label": string, "confidence": number}],
  "personalityCues": [{"trait": string, "evidence": string, "confidence": number}],
  "overallConfidence": number,
  "safety": {"isHuman": boolean, "hasMultipleAnimals": boolean, "notes": string}
}
Regras:
- Se houver humanos, defina safety.isHuman = true e NÃO infira nada sobre pessoas.
- Se não for gato, explique em safety.notes e mantenha campos vazios apropriados.
`.trim();

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY não configurada' }), { status: 500 });
    }

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
    const body = {
      contents: [
        { parts: [{ inline_data: { mime_type: mime, data: base64 } }] },
        { parts: [{ text: prompt }] },
      ],
    };

    const r = await fetch(`${url}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return new Response(JSON.stringify({ error: 'gemini_request_failed', detail }), { status: 502 });
    }

    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let json;
    try { json = JSON.parse(text); }
    catch {
      return new Response(JSON.stringify({ error: 'gemini_parse_failed', raw: text }), { status: 502 });
    }

    // Saneamento leve
    const clamp = (n) => Math.max(0, Math.min(1, Number(n) || 0));
    json.overallConfidence = clamp(json.overallConfidence);
    if (Array.isArray(json.breedCandidates)) {
      json.breedCandidates = json.breedCandidates.slice(0,3).map(b => ({
        label: String(b.label || 'desconhecido'),
        confidence: clamp(b.confidence),
      }));
    }
    if (Array.isArray(json.personalityCues)) {
      json.personalityCues = json.personalityCues.slice(0,5).map(p => ({
        trait: String(p.trait || ''), evidence: String(p.evidence || ''), confidence: clamp(p.confidence),
      }));
    }

    return new Response(JSON.stringify(json), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 });
  }
};
