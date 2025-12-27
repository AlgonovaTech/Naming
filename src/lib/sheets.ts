import { google, sheets_v4 } from "googleapis";
import { config } from "./config";

// In-memory mutex for sequential ID generation
let isLocked = false;
const lockQueue: (() => void)[] = [];

async function acquireLock(): Promise<void> {
  return new Promise((resolve) => {
    if (!isLocked) {
      isLocked = true;
      resolve();
    } else {
      lockQueue.push(resolve);
    }
  });
}

function releaseLock(): void {
  if (lockQueue.length > 0) {
    const next = lockQueue.shift();
    next?.();
  } else {
    isLocked = false;
  }
}

function getAuth() {
  return new google.auth.JWT({
    email: config.googleServiceAccountEmail,
    key: config.googlePrivateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient(): sheets_v4.Sheets {
  const auth = getAuth();
  return google.sheets({ version: "v4", auth });
}

export async function getLastId(): Promise<number> {
  const sheets = getSheetsClient();
  
  // Get all values from column A (V_ID) to find the last ID
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${config.sheetName}!A:A`,
  });
  
  const values = response.data.values || [];
  
  // Find the last row with a numeric ID (skip header row)
  let lastId = 0;
  
  for (let i = values.length - 1; i >= 1; i--) {
    const cell = values[i]?.[0];
    if (cell) {
      const num = parseInt(String(cell), 10);
      if (!isNaN(num) && num > 0) {
        lastId = num;
        break;
      }
    }
  }
  
  return lastId;
}

export interface RowData {
  type: string;
  nameOfHypothesis: string;
  aiFlag: string;
  style: string;
  mainTon: string;
  mainObject: string;
  filename: string;
}

// Function to add creative with proper locking
export async function addCreative(data: RowData): Promise<{ creativeId: number; rowIndex: number }> {
  await acquireLock();
  
  try {
    const sheets = getSheetsClient();
    
    // Get current last ID to ensure sequential
    const lastId = await getLastId();
    const newId = lastId + 1;
    
    // Build the row based on column configuration
    // Find max column to size the array
    const maxColumn = Math.max(
      config.columns.vId,
      config.columns.link,
      config.columns.type,
      config.columns.nameOfHypothesis,
      config.columns.aiFlag,
      config.columns.style,
      config.columns.mainTon,
      config.columns.mainObject,
      config.columns.filename
    );
    
    // Create array with empty strings
    const row: string[] = new Array(maxColumn).fill("");
    
    // Build the link string format: V_id=<id>;type=<type>;NameHypoth=<hyp>
    const linkString = `V_id=${newId};type=${data.type};NameHypoth=${data.nameOfHypothesis}`;
    
    // Fill in the data at the correct column positions (0-indexed in array)
    row[config.columns.vId - 1] = String(newId);
    row[config.columns.link - 1] = linkString;
    row[config.columns.type - 1] = data.type;
    row[config.columns.nameOfHypothesis - 1] = data.nameOfHypothesis;
    row[config.columns.aiFlag - 1] = data.aiFlag;
    row[config.columns.style - 1] = data.style;
    row[config.columns.mainTon - 1] = data.mainTon;
    row[config.columns.mainObject - 1] = data.mainObject;
    row[config.columns.filename - 1] = data.filename;
    
    // Append the row
    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: `${config.sheetName}!A:A`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [row],
      },
    });
    
    // Parse the updated range to get row index
    const updatedRange = appendResponse.data.updates?.updatedRange || "";
    const rowMatch = updatedRange.match(/!A(\d+)/);
    const rowIndex = rowMatch ? parseInt(rowMatch[1], 10) : 0;
    
    return { creativeId: newId, rowIndex };
  } finally {
    releaseLock();
  }
}
