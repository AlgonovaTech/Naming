import { google, sheets_v4 } from "googleapis";
import { config } from "./config";

// In-memory mutex for sequential ID generation
let creativeIdLock = false;
let titleIdLock = false;
const creativeLockQueue: (() => void)[] = [];
const titleLockQueue: (() => void)[] = [];

async function acquireCreativeLock(): Promise<void> {
  return new Promise((resolve) => {
    if (!creativeIdLock) {
      creativeIdLock = true;
      resolve();
    } else {
      creativeLockQueue.push(resolve);
    }
  });
}

function releaseCreativeLock(): void {
  if (creativeLockQueue.length > 0) {
    const next = creativeLockQueue.shift();
    next?.();
  } else {
    creativeIdLock = false;
  }
}

async function acquireTitleLock(): Promise<void> {
  return new Promise((resolve) => {
    if (!titleIdLock) {
      titleIdLock = true;
      resolve();
    } else {
      titleLockQueue.push(resolve);
    }
  });
}

function releaseTitleLock(): void {
  if (titleLockQueue.length > 0) {
    const next = titleLockQueue.shift();
    next?.();
  } else {
    titleIdLock = false;
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

// Header row for Creative sheet
const CREATIVE_HEADER_ROW = [
  "V_ID",
  "preview",
  "link",
  "type",
  "name_of_hypothesis",
  "made_ai",
  "style",
  "main_ton",
  "main_object",
  "header_text",
  "uvp",
  "product",
  "offer",
  "filename",
];

// Header row for Title sheet (no RU column - English only)
const TITLE_HEADER_ROW = [
  "Text_id",
  "ID",
  "Eng",
  "Header_text",
  "UVP",
  "Product",
  "Offer",
];

async function ensureCreativeHeaderRow(): Promise<void> {
  const sheets = getSheetsClient();
  
  // Check if first row exists and has header
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${config.creativeSheetName}!A1:N1`,
  });
  
  const firstRow = response.data.values?.[0];
  
  // If no header or different header, set it
  if (!firstRow || firstRow[0] !== "V_ID") {
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: `${config.creativeSheetName}!A1:N1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [CREATIVE_HEADER_ROW],
      },
    });
  }
}

async function ensureTitleHeaderRow(): Promise<void> {
  const sheets = getSheetsClient();
  
  try {
    console.log(`Checking Title sheet header: ${config.titleSheetName}`);
    
    // Check if first row exists and has header
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `${config.titleSheetName}!A1:G1`,
    });
    
    const firstRow = response.data.values?.[0];
    console.log(`Title first row:`, firstRow);
    
    // If no header or different header, set it
    if (!firstRow || firstRow[0] !== "Text_id") {
      console.log("Setting Title header row");
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: `${config.titleSheetName}!A1:G1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [TITLE_HEADER_ROW],
        },
      });
    }
  } catch (error) {
    // Title sheet might not exist yet - try to create header anyway
    console.error("Error checking Title sheet:", error);
    throw new Error(`Title sheet "${config.titleSheetName}" not found. Please create it in Google Sheets.`);
  }
}

export async function getLastCreativeId(): Promise<number> {
  const sheets = getSheetsClient();
  
  // Ensure header row exists
  await ensureCreativeHeaderRow();
  
  // Get all values from column A (V_ID) to find the last ID
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${config.creativeSheetName}!A:A`,
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

export async function getLastTitleId(): Promise<number> {
  const sheets = getSheetsClient();
  
  try {
    // Ensure header row exists
    await ensureTitleHeaderRow();
    
    // Get all values from column B (ID) to find the last ID
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `${config.titleSheetName}!B:B`,
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
  } catch (error) {
    console.log("Title sheet might not exist:", error);
    return 0;
  }
}

// Backward compatibility
export const getLastId = getLastCreativeId;

export interface CreativeRowData {
  type: string;
  nameOfHypothesis: string;
  aiFlag: string;
  style: string;
  mainTon: string;
  mainObject: string;
  headerText: string;
  uvp: string;
  product: string;
  offer: string;
  filename: string;
  previewUrl: string; // URL from Google Drive
}

export interface TitleRowData {
  headerText: string;
  uvp: string;
  product: string;
  offer: string;
}

// Backward compatibility interface
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
export async function addCreative(data: CreativeRowData): Promise<{ creativeId: number; rowIndex: number }> {
  await acquireCreativeLock();
  
  try {
    const sheets = getSheetsClient();
    
    // Get current last ID to ensure sequential
    const lastId = await getLastCreativeId();
    const newId = lastId + 1;
    
    // Build the link string format: V_id=<id>;type=<type>;NameHypoth=<hyp>
    const linkString = `V_id=${newId};type=${data.type};NameHypoth=${data.nameOfHypothesis}`;
    
    // Build the preview formula for Google Sheets
    const previewFormula = data.previewUrl ? `=IMAGE("${data.previewUrl}")` : "";
    
    // Build row array (A-N = 14 columns)
    const row: string[] = [
      String(newId),                    // A: V_ID
      previewFormula,                   // B: preview (=IMAGE formula)
      linkString,                       // C: link
      data.type,                        // D: type
      data.nameOfHypothesis,            // E: name_of_hypothesis
      data.aiFlag,                      // F: made_ai
      data.style,                       // G: style
      data.mainTon,                     // H: main_ton
      data.mainObject,                  // I: main_object
      data.headerText,                  // J: header_text
      data.uvp,                         // K: uvp
      data.product,                     // L: product
      data.offer,                       // M: offer
      data.filename,                    // N: filename
    ];
    
    // Append the row
    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: `${config.creativeSheetName}!A:A`,
      valueInputOption: "USER_ENTERED", // Use USER_ENTERED to parse formulas
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
    releaseCreativeLock();
  }
}

// Function to add title row
export async function addTitle(data: TitleRowData): Promise<{ titleId: number; rowIndex: number }> {
  await acquireTitleLock();
  
  try {
    const sheets = getSheetsClient();
    
    console.log(`Adding title to sheet: ${config.titleSheetName}`);
    
    // Ensure header exists
    await ensureTitleHeaderRow();
    
    // Get current last ID to ensure sequential
    const lastId = await getLastTitleId();
    const newId = lastId + 1;
    
    console.log(`New title ID will be: ${newId}`);
    
    // Build row array (A-G = 7 columns, no RU column)
    // A: Text_id (formula) | B: ID | C: Eng | D: Header_text | E: UVP | F: Product | G: Offer
    const row: string[] = [
      "",                               // A: Text_id (formula added after)
      String(newId),                    // B: ID
      data.headerText,                  // C: Eng (original header text)
      data.headerText,                  // D: Header_text
      data.uvp,                         // E: UVP
      data.product,                     // F: Product
      data.offer,                       // G: Offer
    ];
    
    // Append the row
    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: `${config.titleSheetName}!A:A`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [row],
      },
    });
    
    console.log(`Title append response:`, appendResponse.data.updates);
    
    // Parse the updated range to get row index
    const updatedRange = appendResponse.data.updates?.updatedRange || "";
    const rowMatch = updatedRange.match(/!A(\d+)/);
    const rowIndex = rowMatch ? parseInt(rowMatch[1], 10) : 0;
    
    console.log(`Title row index: ${rowIndex}`);
    
    if (rowIndex > 0) {
      // Now set the Text_id formula
      // Format: ID_Header_UVP_Product_Offer
      const textIdFormula = `=B${rowIndex}&"_"&D${rowIndex}&"_"&E${rowIndex}&"_"&F${rowIndex}&"_"&G${rowIndex}`;
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: `${config.titleSheetName}!A${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[textIdFormula]],
        },
      });
      
      console.log(`Title formula set for row ${rowIndex}`);
    }
    
    return { titleId: newId, rowIndex };
  } catch (error) {
    console.error("Error adding title:", error);
    throw error;
  } finally {
    releaseTitleLock();
  }
}

// Update creative row (for chips editing)
export async function updateCreativeRow(
  rowIndex: number,
  creativeId: number,
  data: Partial<CreativeRowData>
): Promise<void> {
  const sheets = getSheetsClient();
  
  // First, get the current row to merge data
  const getResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${config.creativeSheetName}!A${rowIndex}:N${rowIndex}`,
  });
  
  const currentRow = getResponse.data.values?.[0] || [];
  
  // Merge with new data
  const type = data.type ?? currentRow[3] ?? "";
  const nameOfHypothesis = data.nameOfHypothesis ?? currentRow[4] ?? "";
  
  // Rebuild link string
  const linkString = `V_id=${creativeId};type=${type};NameHypoth=${nameOfHypothesis}`;
  
  // Build update row (columns C-N, skipping A and B)
  const updateRow = [
    linkString,                                           // C: link
    type,                                                 // D: type
    nameOfHypothesis,                                     // E: name_of_hypothesis
    data.aiFlag ?? currentRow[5] ?? "",                   // F: made_ai
    data.style ?? currentRow[6] ?? "",                    // G: style
    data.mainTon ?? currentRow[7] ?? "",                  // H: main_ton
    data.mainObject ?? currentRow[8] ?? "",               // I: main_object
    data.headerText ?? currentRow[9] ?? "",               // J: header_text
    data.uvp ?? currentRow[10] ?? "",                     // K: uvp
    data.product ?? currentRow[11] ?? "",                 // L: product
    data.offer ?? currentRow[12] ?? "",                   // M: offer
    // N: filename stays unchanged
  ];
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: `${config.creativeSheetName}!C${rowIndex}:M${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [updateRow],
    },
  });
}
