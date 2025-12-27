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
  // A: V_ID | B: link | C: type | D: name_of_hypothesis | E: made_ai | F: style | G: main_ton | H: main_object | I: filename
  columns: {
    vId: 1,              // A
    link: 2,             // B
    type: 3,             // C
    nameOfHypothesis: 4, // D
    aiFlag: 5,           // E
    style: 6,            // F
    mainTon: 7,          // G
    mainObject: 8,       // H
    filename: 9,         // I
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
