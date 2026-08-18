import { GoogleGenerativeAI } from "@google/generative-ai";

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured on the server" });
    }

    // Trim just in case
    const cleanKey = apiKey.trim();

    const genAI = new GoogleGenerativeAI(cleanKey);
    // Use a currently stable flash model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a thrift store / resale expert helping someone decide whether to buy an item to flip for profit on Facebook Marketplace, Craigslist, or Vinted (local sales only, no shipping).

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

Be realistic about local LA / Southern California resale prices. If you can't see enough detail, say so.`;

    const imageParts = images.slice(0, 4).map((dataUrl) => {
      const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (!matches) return null;
      return {
        inlineData: {
          data: matches[2],
          mimeType: matches[1],
        },
      };
    }).filter(Boolean);

    if (imageParts.length === 0) {
      return res.status(400).json({ error: "Could not process any of the uploaded images" });
    }

    const result = await model.generateContent([prompt, ...imageParts]);
    const text = result.response.text();

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
