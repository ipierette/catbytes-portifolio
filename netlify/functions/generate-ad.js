const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const API_KEY = process.env.GEMINI_API_KEY;

function makePrompt(description) {
  return `
Você é um redator de social media para adoção de gatos no Brasil.
Com base na descrição abaixo, gere um PACOTE EM JSON PURO (sem markdown, sem comentários).

DESCRIÇÃO
"""${description}"""

INSTRUÇÕES
- Tom acolhedor e responsável (sem sensacionalismo).
- Título até 60 caracteres.
- Anúncio com 3–5 parágrafos curtos + call-to-action.
- 8–12 hashtags (pt-BR).
- Plano de divulgação para 7 dias: horários, plataformas, onde postar, quem marcar, dicas de mídia, crosspost.

FORMATO JSON EXATO
{
  "title": "string",
  "ad_copy": "string",
  "hashtags": ["#tag1", "#tag2"],
  "posting_plan": {
    "when": [{"day":"qui","time":"10:30"},{"day":"dom","time":"19:00"}],
    "platforms": ["Instagram","Facebook","WhatsApp","X/Twitter"],
    "where_to_post": ["Grupos locais de adoção","ONGs (marcar nos comentários)","Stories + Reels"],
    "who_to_tag": ["@prefeitura (bem-estar animal)","@ongs_local_1","@ongs_local_2","amigos com alcance"],
    "cta_tips": ["3 fotos nítidas","vídeo 10–15s","localização e requisitos"],
    "crosspost_tips": ["Reaproveitar texto no Facebook/grupos","Repost no Stories pedindo compartilhamento"]
  }
}
Se faltar algum dado, assuma de forma realista e deixe claro no texto.
Retorne SOMENTE o JSON.
`;
}

function tryParseJSON(str) {
  try { return JSON.parse(str); } catch {}
  const a = str.indexOf("{"), b = str.lastIndexOf("}");
  if (a !== -1 && b !== -1 && b > a) {
    try { return JSON.parse(str.slice(a, b + 1)); } catch {}
  }
  return null;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Use POST" }) };
  }
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "GEMINI_API_KEY não configurada" }) };
  }

  try {
    const { description } = JSON.parse(event.body || "{}");
    if (!description?.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: "description é obrigatório" }) };
    }

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL });

    const result = await model.generateContent(makePrompt(description));
    const text = result.response.text();
    const data = tryParseJSON(text) ?? { raw: text };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, data })
    };
  } catch (err) {
    console.error("[generate-ad] error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Falha ao gerar anúncio" }) };
  }
}
