const OpenAI = require("openai");

let client = null;

/**
 * Lazily initialize OpenAI client.
 */
function getClient() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      client = new OpenAI({ apiKey });
    } else {
      console.error("No OPENAI_API_KEY found in environment.");
    }
  }
  return client;
}

/**
 * Analyze an image using OpenAI GPT-4o-mini.
 * Accepts a base64 data URI string.
 * Returns: { category, color, brand, description, distinctive_features }
 */
async function analyzeImage(imageDataUri, userDescription = "") {
  const cli = getClient();
  if (!cli) {
    return fallbackResult(userDescription, "OpenAI client not initialized");
  }

  try {
    // Ensure we have a proper data URI
    let base64Image = imageDataUri;
    if (imageDataUri.startsWith("data:")) {
      base64Image = imageDataUri; // Already a data URI
    } else {
      base64Image = `data:image/jpeg;base64,${imageDataUri}`;
    }

    const prompt = `Analyze this image of a lost/found item. 
Return ONLY a raw JSON object (no markdown formatting) with the following fields:
- category: (e.g., Electronics, Clothing, Bottle, Keys)
- color: (Dominant color)
- brand: (Visible brand name or null)
- description: (A concise 1-sentence visual description)
- distinctive_features: (Array of strings listing unique scratches, stickers, or identifiers)`;

    const response = await cli.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: base64Image } },
          ],
        },
      ],
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);

    // Generate Vector Embedding based on the description and features
    const embeddingText = `${parsed.category || ""} ${parsed.brand || ""} ${parsed.color || ""} ${parsed.description || ""} ${(parsed.distinctive_features || []).join(" ")}`.trim();
    let embedding = [];
    if (embeddingText) {
      embedding = await generateEmbedding(embeddingText);
    }

    return { ...parsed, embedding };
  } catch (error) {
    console.error("OpenAI analysis failed:", error.message);
    if (error.message?.includes("429")) throw error; // Re-throw rate limits
    return fallbackResult(userDescription, error.message);
  }
}

/**
 * Generate a verification question for a Found item.
 */
async function generateVerificationQuestion(description, features) {
  const cli = getClient();
  if (!cli) {
    return { question: "Can you describe a unique feature of this item?", expected_answer_type: "text" };
  }

  try {
    const featuresStr = Array.isArray(features) ? features.join(", ") : "No specific features listed";

    const prompt = `I have found an item described as: "${description}".
It has these distinctive features: ${featuresStr}.

Generate a "Verification Question" that the true owner should be able to answer, but a stranger wouldn't know from just seeing a generic photo.
Focus on specific details like brands, scratches, wallpapers (if phone), or contents (if wallet).

Return JSON: { "question": "string", "expected_answer_type": "text" }`;

    const response = await cli.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Verification question generation failed:", error.message);
    return { question: "Please describe any unique markings on this item.", expected_answer_type: "text" };
  }
}

/**
 * Generate a vector embedding from text.
 */
async function generateEmbedding(text) {
  const cli = getClient();
  if (!cli || !text) return [];

  try {
    const response = await cli.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Embedding generation failed:", error.message);
    return [];
  }
}

/**
 * Fallback result when AI analysis fails.
 */
function fallbackResult(userDescription, errorMsg = "") {
  return {
    category: "General Item",
    color: "See image",
    brand: null,
    description: userDescription || "Check image for details",
    distinctive_features: [],
    embedding: [],
  };
}

module.exports = { analyzeImage, generateVerificationQuestion, generateEmbedding };
