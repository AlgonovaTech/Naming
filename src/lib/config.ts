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
  
  // Column mapping (1-indexed)
  // A: V_ID | C: link | E: type | F: name_of_hypothesis | H: made_ai | I: style | J: main_ton | K: main_object | L: filename
  columns: {
    vId: parseInt(process.env.COLUMN_V_ID || "1"),
    link: parseInt(process.env.COLUMN_LINK || "3"),
    type: parseInt(process.env.COLUMN_TYPE || "5"),
    nameOfHypothesis: parseInt(process.env.COLUMN_NAME_OF_HYPOTHESIS || "6"),
    aiFlag: parseInt(process.env.COLUMN_AI_FLAG || "8"),
    style: parseInt(process.env.COLUMN_STYLE || "9"),
    mainTon: parseInt(process.env.COLUMN_MAIN_TON || "10"),
    mainObject: parseInt(process.env.COLUMN_MAIN_OBJECT || "11"),
    filename: parseInt(process.env.COLUMN_FILENAME || "12"),
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
