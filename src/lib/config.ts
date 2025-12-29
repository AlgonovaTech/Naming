// Configuration loaded from environment variables

export const config = {
  // Google Sheets
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
  googlePrivateKey: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || "",
  
  // Sheet names
  creativeSheetName: process.env.GOOGLE_SHEET_NAME || "Creative",
  titleSheetName: process.env.GOOGLE_TITLE_SHEET_NAME || "Title",
  adsNamingSheetName: process.env.GOOGLE_ADS_NAMING_SHEET_NAME || "Ads_naming",
  
  // OpenRouter
  openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
  openRouterModel: process.env.OPENROUTER_MODEL || "anthropic/claude-3-haiku",
  
  // Creative sheet column mapping (1-indexed)
  // A: V_ID | B: preview | C: link | D: type | E: name_of_hypothesis | F: made_ai 
  // G: style | H: main_ton | I: main_object | J: header_text | K: uvp | L: product | M: offer | N: filename
  creativeColumns: {
    vId: 1,              // A
    preview: 2,          // B - =IMAGE(url) formula
    link: 3,             // C
    type: 4,             // D
    nameOfHypothesis: 5, // E
    aiFlag: 6,           // F
    style: 7,            // G
    mainTon: 8,          // H
    mainObject: 9,       // I
    headerText: 10,      // J
    uvp: 11,             // K
    product: 12,         // L
    offer: 13,           // M
    filename: 14,        // N
  },
  
  // Title sheet column mapping (1-indexed) - English only, no RU column
  // A: Text_id | B: ID | C: Eng | D: Header_text | E: UVP | F: Product | G: Offer
  titleColumns: {
    textId: 1,           // A - formula
    id: 2,               // B
    eng: 3,              // C
    headerText: 4,       // D
    uvp: 5,              // E
    product: 6,          // F
    offer: 7,            // G
  },
  
  // Backward compatibility alias
  get sheetName() {
    return this.creativeSheetName;
  },
  get columns() {
    return this.creativeColumns;
  },
};

// Options for fields (used for chips UI and AI suggestions)
export const OPTIONS = {
  type: ["static", "video"],
  aiFlag: ["made AI", "not AI"],
  style: ["Real", "3D", "Illustration", "Minecraft style", "Pixar style", "Cartoon", "Other"],
  mainTon: ["bright", "light", "dark", "soft", "neutral"],
  mainObject: ["city", "boy", "girl", "boy_girl", "statue", "building", "object", "people", "offline", "none", "other"],
  uvp: ["direct_sale", "pain_point", "benefit", "FOMO", "social_proof", "other"],
  product: ["math_course", "programming_course", "english_course", "subscription", "other"],
  offer: ["free_lesson", "masterclass", "webinar", "free_course", "discount", "trial", "other"],
};

export function validateConfig(): string[] {
  const errors: string[] = [];
  
  if (!config.googleServiceAccountEmail) {
    errors.push("GOOGLE_SERVICE_ACCOUNT_EMAIL is required");
  }
  if (!config.googlePrivateKey) {
    errors.push("GOOGLE_PRIVATE_KEY is required");
  }
  if (!config.spreadsheetId) {
    errors.push("GOOGLE_SPREADSHEET_ID is required");
  }
  if (!config.openRouterApiKey) {
    errors.push("OPENROUTER_API_KEY is required");
  }
  
  return errors;
}
