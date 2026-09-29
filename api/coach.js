// Vercel serverless function: forwards the coach prompt to Claude.
// Set ANTHROPIC_API_KEY in Vercel > Project > Settings > Environment Variables.
// Optional: ANTHROPIC_MODEL to pick a different model.
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: "no_api_key" });
  const prompt = req.body && req.body.prompt;
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 8000) {
    return res.status(400).json({ error: "bad_prompt" });
  }
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt + "\n\nReply with the JSON object only." }],
      }),
    });
    if (!r.ok) return res.status(502).json({ error: "upstream", status: r.status });
    const data = await r.json();
    const text = (data.content || []).map((c) => c.text || "").join("");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return res.status(502).json({ error: "parse" });
    return res.status(200).json(JSON.parse(m[0]));
  } catch (e) {
    return res.status(502).json({ error: "upstream" });
  }
};
