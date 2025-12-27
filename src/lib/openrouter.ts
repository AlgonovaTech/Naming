import { config } from "./config";

const SYSTEM_PROMPT = `You assist a User Acquisition manager filling a creative naming table.

Your task is to describe the visual concept of the creative, not its message or marketing meaning.

Follow these rules:
– Prefer short reusable category labels.
– Do not invent narrative or emotional interpretations.
– Describe what is visually depicted, not what it "communicates".
– If the concept matches no existing category, suggest a NEW short tag (2–3 words max).

Produce values that are easy to standardize across many creatives.
Avoid synonyms and stylistic variations.

Return JSON ONLY with EXACTLY these fields:

• type — "static" or "video"
• name_of_hypothesis — short conceptual label (e.g. city, paper, kids, statue, banner, offline, etc.)
• made_ai — "made AI" or "not AI"
• style — Real / 3D / Illustration / Minecraft style / Pixar style / Cartoon / Other
• main_ton — bright / light / dark / soft / neutral
• main_object — city / boy / girl / boy_girl / statue / building / object / people / offline / none / other

If uncertain — choose the simplest closest category.
If you must propose a new tag — keep it short and generic.`;

export interface AIAnalysisResult {
  type: "static" | "video";
  name_of_hypothesis: string;
  made_ai: "made AI" | "not AI";
  style: string;
  main_ton: string;
  main_object: string;
}

export async function analyzeCreative(
  base64Data: string,
  mimeType: string,
  filename: string
): Promise<AIAnalysisResult> {
  // Determine if it's a video based on mime type
  const isVideo = mimeType.startsWith("video/");
  
  // For videos, we'll just analyze based on filename and return defaults
  // since Haiku Vision doesn't support video frame extraction
  if (isVideo) {
    return {
      type: "video",
      name_of_hypothesis: "video content",
      made_ai: "not AI",
      style: "Real",
      main_ton: "neutral",
      main_object: "other",
    };
  }
  
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://creative-naming.vercel.app",
      "X-Title": "Creative Naming Tool",
    },
    body: JSON.stringify({
      model: config.openRouterModel,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`,
              },
            },
            {
              type: "text",
              text: `Analyze this creative image. Filename: ${filename}. Return JSON only.`,
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  
  // Parse JSON from response
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    
    const parsed = JSON.parse(jsonMatch[0]) as AIAnalysisResult;
    
    // Normalize and validate fields
    return normalizeAnalysisResult(parsed);
  } catch (parseError) {
    console.error("Failed to parse AI response:", content);
    // Return defaults if parsing fails
    return {
      type: "static",
      name_of_hypothesis: "unknown",
      made_ai: "not AI",
      style: "Other",
      main_ton: "neutral",
      main_object: "other",
    };
  }
}

function normalizeAnalysisResult(result: AIAnalysisResult): AIAnalysisResult {
  // Normalize type
  const type = result.type?.toLowerCase() === "video" ? "video" : "static";
  
  // Normalize made_ai
  const madeAiLower = String(result.made_ai || "").toLowerCase();
  const made_ai = madeAiLower.includes("made") && madeAiLower.includes("ai") 
    ? "made AI" 
    : "not AI";
  
  // Normalize style
  const validStyles = ["Real", "3D", "Illustration", "Minecraft style", "Pixar style", "Cartoon", "Other"];
  const styleLower = String(result.style || "").toLowerCase();
  let style = "Other";
  for (const vs of validStyles) {
    if (styleLower.includes(vs.toLowerCase())) {
      style = vs;
      break;
    }
  }
  
  // Normalize main_ton
  const validTons = ["bright", "light", "dark", "soft", "neutral"];
  const tonLower = String(result.main_ton || "").toLowerCase();
  let main_ton = "neutral";
  for (const vt of validTons) {
    if (tonLower.includes(vt)) {
      main_ton = vt;
      break;
    }
  }
  
  // Normalize main_object
  const validObjects = ["city", "boy", "girl", "boy_girl", "statue", "building", "object", "people", "offline", "none", "other"];
  const objectLower = String(result.main_object || "").toLowerCase().replace(/\s+/g, "_");
  let main_object = "other";
  for (const vo of validObjects) {
    if (objectLower.includes(vo)) {
      main_object = vo;
      break;
    }
  }
  
  return {
    type,
    name_of_hypothesis: String(result.name_of_hypothesis || "unknown").toLowerCase().trim(),
    made_ai,
    style,
    main_ton,
    main_object,
  };
}

