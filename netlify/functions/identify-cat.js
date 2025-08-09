// netlify/functions/identify-cat.js
export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "missing_api_key" }) };
    }

    // Lê multipart
    const boundary = event.headers["content-type"]?.match(/boundary=(.*)$/)?.[1];
    if (!boundary) return { statusCode: 400, body: JSON.stringify({ error: "no_multipart" }) };

    const buf = Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
    const raw = buf.toString("binary");
    const parts = raw.split(`--${boundary}`);
    // acha o arquivo (campo "data")
    const filePart = parts.find(p => /name="data"/.test(p));
    if (!filePart) return { statusCode: 400, body: JSON.stringify({ error: "no_file" }) };

    const mime = (filePart.match(/Content-Type:\s*([^\r\n]+)/i) || [])[1] || "image/jpeg";
    const fileData = filePart.split("\r\n\r\n")[1].replace(/\r\n--$/, "");
    const b64 = Buffer.from(fileData, "binary").toString("base64");

    // ❗ Importante: role: "user"
    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: mime, data: b64 } },
            {
              text:
                "Analyze this cat photo and return ONLY JSON: " +
                "{age:'~X months/years (range)', breeds:['...'], personality:['...'], notes:'...'}"
            }
          ]
        }
      ]
    };

    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );

    const data = await resp.json();
    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify({ error: "gemini_request_failed", detail: data }) };
    }

    const txt =
      data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") ||
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "";

    let json;
    try {
      json = JSON.parse(txt);
    } catch {
      // tenta extrair bloco JSON
      const m = txt.match(/\{[\s\S]*\}/);
      json = m ? JSON.parse(m[0]) : { raw: txt };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json)
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: "server_error", message: e.message }) };
  }
}
