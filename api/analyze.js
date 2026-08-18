export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { images, notes } = req.body || {};

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured on the server" });
    }

    // Build the parts for Gemini
    const parts = [
      {
        text: `You are a thrift store / resale expert helping someone decide whether to buy an item to flip for profit on Facebook Marketplace, Craigslist, or Vinted (local sales only, no shipping).

Analyze the photo(s) carefully. Look for:
- What the item is
- Brand / maker if visible
- Materials, style, era
- Condition (scratches, wear, missing parts, stains, etc.)
- Any tags, stamps, or labels

Then give a clear, practical response in this exact JSON format (no extra text outside the JSON):

{
  "identification": "Short clear name of the item + brand if known",
  "details": "2-4 sentences about style, material, condition, and any notable details",
  "quickFlipEstimate": number or null,
  "patientFlipEstimate": number or null,
  "verdictSuggestion": "BUY" | "MAYBE" | "SKIP",
  "reason": "One short sentence why"
}

Notes from the user: ${notes || "None"}

Be realistic about local LA / Southern California resale prices. If you can't see enough detail, say so.`
      }
    ];

    // Add up to 4 images
    for (const dataUrl of images.slice(0, 4)) {
      const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        parts.push({
          inline_data: {
            mime_type: matches[1],
            data: matches[2]
          }
        });
      }
    }

    if (parts.length === 1) {
      return res.status(400).json({ error: "Could not process any of the uploaded images" });
    }

    // Call Gemini REST API directly
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: parts
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(500).json({
        error: data.error?.message || "Gemini API returned an error",
        details: data
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let analysis;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: text };
    } catch (e) {
      analysis = { raw: text, error: "Could not parse structured response" };
    }

    return res.status(200).json({ analysis });
  } catch (err) {
    console.error("Analyze error:", err);
    return res.status(500).json({
      error: err.message || "Analysis failed",
      details: err.toString()
    });
  }
}
