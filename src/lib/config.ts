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
  // Based on actual sheet structure:
  // A=V_ID, B=visual, C=link, D=#REF, E=type, F=hypothesis, G=version, H=AI, I=style, J=ton, K=object, L=comment/filename
  columns: {
    vId: parseInt(process.env.COLUMN_V_ID || "1"),           // A: V_ID number
    link: parseInt(process.env.COLUMN_LINK || "3"),          // C: formatted link string
    type: parseInt(process.env.COLUMN_TYPE || "5"),          // E: type
    nameOfHypothesis: parseInt(process.env.COLUMN_NAME_OF_HYPOTHESIS || "6"), // F: hypothesis
    hypothesisVersion: 7,                                     // G: version (always 1 for new)
    aiFlag: parseInt(process.env.COLUMN_AI_FLAG || "8"),     // H: AI flag
    style: parseInt(process.env.COLUMN_STYLE || "9"),        // I: style
    mainTon: parseInt(process.env.COLUMN_MAIN_TON || "10"),  // J: main ton
    mainObject: parseInt(process.env.COLUMN_MAIN_OBJECT || "11"), // K: main object
    filename: parseInt(process.env.COLUMN_FILENAME || "12"), // L: filename/comment
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
