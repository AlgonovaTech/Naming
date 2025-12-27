// Configuration loaded from environment variables

export const config = {
  // Google Sheets
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
  googlePrivateKey: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || "",
  sheetName: process.env.GOOGLE_SHEET_NAME || "ads_naming",
  
  // OpenRouter
  openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
  openRouterModel: process.env.OPENROUTER_MODEL || "anthropic/claude-3-haiku",
  
  // Column mapping (1-indexed, matches Google Sheets columns)
  // Sheet structure:
  // A: V_ID (число)
  // B: visual (ссылка на figma — не заполняем)
  // C: link (V_id=XXX;type=YYY;NameHypoth=ZZZ)
  // D: (не используется)
  // E: type (static / video)
  // F: name_of_hypothesis
  // G: hypothesis_version (не используется)
  // H: made_ai (made AI / not AI)
  // I: style
  // J: main_ton
  // K: main_object
  // L: filename
  columns: {
    vId: parseInt(process.env.COLUMN_V_ID || "1"),                    // A: V_ID
    link: parseInt(process.env.COLUMN_LINK || "3"),                   // C: link
    type: parseInt(process.env.COLUMN_TYPE || "5"),                   // E: type (static/video)
    nameOfHypothesis: parseInt(process.env.COLUMN_NAME_OF_HYPOTHESIS || "6"), // F: name_of_hypothesis
    aiFlag: parseInt(process.env.COLUMN_AI_FLAG || "8"),              // H: made_ai
    style: parseInt(process.env.COLUMN_STYLE || "9"),                 // I: style
    mainTon: parseInt(process.env.COLUMN_MAIN_TON || "10"),           // J: main_ton
    mainObject: parseInt(process.env.COLUMN_MAIN_OBJECT || "11"),     // K: main_object
    filename: parseInt(process.env.COLUMN_FILENAME || "12"),          // L: filename
  },
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
