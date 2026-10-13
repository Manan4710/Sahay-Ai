// Backend function: runs on Netlify's server, NOT in the browser.
// The API key lives in an environment variable, so nobody can steal it from your website.

const SYSTEM_PROMPT =
  "You are Sahay, a friendly AI assistant for college students. " +
  "Explain things clearly and simply. Use Markdown: short headings, bullet points, " +
  "and fenced code blocks (with the language name) for any code. Keep answers focused.";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(500, { error: "Server is missing GEMINI_API_KEY. Add it in Netlify > Site settings > Environment variables." });
  }
  // "gemini-flash-latest" always points to the current Flash model.
  // If it ever errors, set GEMINI_MODEL in Netlify to a model name from ai.google.dev.
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

  let messages;
  try {
    messages = JSON.parse(event.body).messages;
  } catch {
    return json(400, { error: "Bad request." });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(400, { error: "No messages received." });
  }

  // Keep only the last 20 messages and convert to Gemini's format
  const contents = messages.slice(-20).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content).slice(0, 8000) }],
  }));

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
        }),
      }
    );
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 429) {
        return json(429, { error: "Too many requests right now. Wait a few seconds and try again." });
      }
      console.error("Gemini error:", JSON.stringify(data));
      return json(502, { error: data?.error?.message || "The AI service returned an error." });
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const reply = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join("");
    if (!reply) {
      return json(502, { error: "The AI did not return an answer. Try rephrasing your question." });
    }
    return json(200, { reply });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Could not reach the AI service. Please try again." });
  }
};

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
