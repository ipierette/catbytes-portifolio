// netlify/functions/generate-ad.js
// Requer: npm i @google/generative-ai
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const API_KEY = process.env.GEMINI_API_KEY;

function prompt(description) {
  return `
Você é um redator de social media para adoção de gatos no Brasil.
Com base na descrição abaixo, gere um PACOTE EM JSON PURO (sem markdown, sem comentários).

DESCRIÇÃO
"""${description}"""

INSTRUÇÕES
- Tom acolhedor e responsável (sem sensacionalismo).
- Título até 60 caracteres.
- Anúncio com 3–5 parágrafos curtos + call-to-action para contato.
- 8–12 hashtags (pt-BR).
- Plano de divulgação para 7 dias: horários sugeridos (2–4), plataformas, onde postar, quem marcar, dicas de mídia (fotos/vídeo), crosspost.

FORMATO JSON EXATO
{
  "title": "string",
  "ad_copy": "string",
  "hashtags": ["#tag1", "#tag2"],
  "posting_plan": {
    "when": [{"day": "qui", "time": "10:30"}, {"day": "dom", "time": "19:00"}],
    "platforms": ["Instagram","Facebook","WhatsApp","X/Twitter"],
    "where_to_post": [
      "Grupos locais de adoção (cidade/bairro)",
      "ONGs/Protetores (marcar nos comentários)",
      "Stories + Reels com fotos/vídeo curto"
    ],
    "who_to_tag": [
      "@prefeitura (bem-estar animal)",
      "@ongs_local_1",
      "@ongs_local_2",
      "amigos com alcance na cidade"
    ],
    "cta_tips": [
      "Use 3 fotos nítidas (rosto, corpo, brincando)",
      "Vídeo de 10–15s mostrando o temperamento",
      "Informe localização aproximada e requisitos de adoção responsável"
    ],
    "crosspost_tips": [
      "Reaproveitar texto no Facebook/grupos",
      "Repost no Stories pedindo compartilhamento"
    ]
  }
}
Se faltar algum dado importante, assuma de forma realista e deixe claro no texto.
Retorne SOMENTE o JSON.
`;
}

// pequena ajuda para quando o modelo devolve texto extra
function tryParseJSON(str) {
  try { return JSON.parse(str); } catch {}
  const first = str.indexOf("{");
  const last = str.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    try { return JSON.parse(str.slice(first, last + 1)); } catch {}
  }
  return null;
}

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), { status: 405 });
  }
  if (!API_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada" }), { status: 500 });
  }

  try {
    const { description } = await req.json();
    if (!description?.trim()) {
      return new Response(JSON.stringify({ error: "description é obrigatório" }), { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL });

    const result = await model.generateContent(prompt(description));
    const text = result.response.text();
    const data = tryParseJSON(text) ?? { raw: text };

    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  } catch (err) {
    console.error("[generate-ad] error:", err);
    return new Response(JSON.stringify({ error: "Falha ao gerar anúncio" }), { status: 500 });
  }
};
