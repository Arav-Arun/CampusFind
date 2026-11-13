const OpenAI = require("openai");

let client = null;
const getClient = () => {
  if (!client && process.env.OPENAI_API_KEY) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
};

const PROMPT = `Analyze this image of a lost/found item.
Return ONLY a raw JSON object (no markdown formatting) with the following fields:
- category: (e.g., Electronics, Clothing, Bottle, Keys)
- color: (Dominant color)
- brand: (Visible brand name or null)
- description: (A concise 1-sentence visual description)
- distinctive_features: (Array of strings listing unique scratches, stickers, or identifiers)`;

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

const fallback = (userDescription) => ({
  category: "",
  color: "",
  brand: "",
  description: userDescription || "Check image for details",
  distinctive_features: [],
});

async function analyzeImage(imageDataUri, userDescription = "") {
  const openai = getClient();
  if (!openai) return fallback(userDescription);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: imageDataUri } },
          ],
        },
      ],
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    return {
      category: text(parsed.category, 50),
      color: text(parsed.color, 50),
      brand: text(parsed.brand, 50),
      description: text(parsed.description, 500) || userDescription,
      distinctive_features: Array.isArray(parsed.distinctive_features)
        ? parsed.distinctive_features.map((f) => text(f, 80)).filter(Boolean).slice(0, 10)
        : [],
    };
  } catch (error) {
    console.error("OpenAI analysis failed:", error.message);
    return fallback(userDescription);
  }
}

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMS = 512;

async function embed(texts) {
  const openai = getClient();
  if (!openai) return null;
  const response = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: texts, dimensions: EMBEDDING_DIMS });
  return response.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

module.exports = { analyzeImage, embed, EMBEDDING_DIMS };
