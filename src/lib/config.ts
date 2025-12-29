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
  
  // Title sheet column mapping (1-indexed)
  // A: Text_id | B: ID | C: RU | D: Eng | E: Header_text | F: UVP | G: Product | H: Offer
  titleColumns: {
    textId: 1,           // A - formula
    id: 2,               // B
    ru: 3,               // C - Google Translate formula
    eng: 4,              // D
    headerText: 5,       // E
    uvp: 6,              // F
    product: 7,          // G
    offer: 8,            // H
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
  uvp: ["прямая продажа", "через боль", "через выгоду", "FOMO", "социальное доказательство", "other"],
  product: ["курс математики", "курс программирования", "курс английского", "подписка", "other"],
  offer: ["бесплатный урок", "мастер-класс", "вебинар", "бесплатный курс", "скидка", "пробный период", "other"],
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
