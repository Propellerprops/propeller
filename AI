// netlify/functions/ai.js
// Server-side AI vision helper for the Propeller rename tool.
// Receives an item's photo URL + context, fetches the image, asks Claude for
// a name / subcategory / era, and returns clean JSON. Uses the ANTHROPIC_API_KEY
// stored as a Netlify environment variable (never exposed to the browser).

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async function (event) {
  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return json(500, { ok: false, error: "ANTHROPIC_API_KEY is not set in Netlify environment variables." });
  }

  try {
    // Accept params from POST body (preferred) or query string
    let p = {};
    if (event.body) {
      try { p = JSON.parse(event.body); } catch (e) { p = {}; }
    }
    const q = event.queryStringParameters || {};
    const photo = p.photo || q.photo || "";
    const name = p.name || q.name || "";
    const category = p.category || q.category || "";

    if (!photo) {
      return json(400, { ok: false, error: "Missing photo URL." });
    }

    // 1) Fetch the image server-side (Drive blocks some clients, but server fetch works)
    const imgResp = await fetch(photo);
    if (!imgResp.ok) {
      return json(502, { ok: false, error: "Could not fetch image (" + imgResp.status + ")." });
    }
    let mediaType = imgResp.headers.get("content-type") || "image/jpeg";
    if (mediaType.indexOf("image/") !== 0) mediaType = "image/jpeg";
    const buf = Buffer.from(await imgResp.arrayBuffer());
    const b64 = buf.toString("base64");

    // 2) Build the prompt
    const prompt =
      "You are cataloguing an item for a film & TV prop / costume / furniture rental catalogue in Tbilisi, Georgia. " +
      "Look at the photo and return three things:\n" +
      "1. name - ONE short, clear, professional catalogue name (about 3 to 6 words), describing material, colour and type. " +
      "Examples: 'Mid-Century Walnut Armchair', 'Blue Velvet 3-Seat Sofa', 'Brass Art Deco Floor Lamp'.\n" +
      "2. subcategory - the specific item type, 1 to 2 words. Examples: 'Sofa', 'Armchair', 'Coffee Table', 'Shelving', 'Floor Lamp', 'Mirror', 'Rug'.\n" +
      "3. era - the style or period. Examples: 'Mid-Century', 'Art Deco', 'Victorian', 'Industrial', 'Modern', 'Scandinavian', 'Rustic'. If unclear, use 'Modern'.\n" +
      "Describe what is actually in the photo. Do NOT invent brand names. Do NOT include dimensions. " +
      "The item's category is \"" + (category || "unknown") + "\" and its current name is \"" + (name || "(none)") + "\".\n" +
      "Respond with ONLY a JSON object, no markdown, no backticks: {\"name\":\"...\",\"subcategory\":\"...\",\"era\":\"...\"}";

    // 3) Call Claude
    const aiResp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });

    const data = await aiResp.json();
    if (!aiResp.ok) {
      return json(502, { ok: false, error: (data && data.error && data.error.message) || ("AI error " + aiResp.status) });
    }

    const text = (data.content || [])
      .filter(function (b) { return b.type === "text"; })
      .map(function (b) { return b.text; })
      .join("");

    const result = parseResult(text);
    return json(200, { ok: true, result: result });
  } catch (err) {
    return json(500, { ok: false, error: String(err && err.message ? err.message : err) });
  }
};

function clean1(s) {
  return String(s == null ? "" : s).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function parseResult(text) {
  const clean = String(text || "").replace(/```json|```/g, "").trim();
  let obj = null;
  try { obj = JSON.parse(clean); } catch (e) {}
  if (!obj || !obj.name) {
    const brace = clean.match(/\{[\s\S]*\}/);
    if (brace) { try { obj = JSON.parse(brace[0]); } catch (e) {} }
  }
  if (obj && obj.name) {
    return { name: clean1(obj.name), subcategory: clean1(obj.subcategory || ""), era: clean1(obj.era || "") };
  }
  const line = clean1(clean.split("\n")[0].replace(/^["']|["']$/g, ""));
  return { name: line, subcategory: "", era: "" };
}

function json(status, body) {
  return {
    statusCode: status,
    headers: Object.assign({ "Content-Type": "application/json" }, CORS),
    body: JSON.stringify(body),
  };
}
