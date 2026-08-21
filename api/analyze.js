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
    // Properly parse body for pure Vercel functions
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }
    if (!body || typeof body !== "object") {
      // Fallback for some Vercel runtimes
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString();
      try {
        body = JSON.parse(raw);
      } catch (e) {
        return res.status(400).json({ error: "Could not parse request body" });
      }
    }

    const { images, notes } = body || {};

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    const apiKey = (process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY not configured on the server" });
    }

    // Build content array for OpenAI vision
    const content = [
      {
        type: "text",
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
      if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
        content.push({
          type: "image_url",
          image_url: {
            url: dataUrl,
            detail: "low"
          }
        });
      }
    }

    if (content.length === 1) {
      return res.status(400).json({ error: "Could not process any of the uploaded images" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: content
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", JSON.stringify(data));
      return res.status(500).json({
        error: data.error?.message || "OpenAI API returned an error",
        details: data
      });
    }

    const text = data.choices?.[0]?.message?.content || "";

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
      details: String(err)
    });
  }
}
