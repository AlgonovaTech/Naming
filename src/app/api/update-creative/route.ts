import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { config, validateConfig } from "@/lib/config";

export const runtime = "nodejs";

function getAuth() {
  return new google.auth.JWT({
    email: config.googleServiceAccountEmail,
    key: config.googlePrivateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

interface UpdateRequest {
  rowIndex: number;
  creativeId: number;
  type: string;
  nameOfHypothesis: string;
  aiFlag: string;
  style: string;
  mainTon: string;
  mainObject: string;
}

export async function POST(request: NextRequest) {
  try {
    const configErrors = validateConfig();
    if (configErrors.length > 0) {
      return NextResponse.json(
        { status: "error", error: `Configuration error: ${configErrors.join(", ")}` },
        { status: 500 }
      );
    }

    const data: UpdateRequest = await request.json();
    
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    
    // Build the updated link string
    const linkString = `V_id=${data.creativeId};type=${data.type};NameHypoth=${data.nameOfHypothesis}`;
    
    // Update the row (columns B-H, keeping A and I unchanged)
    const row = [
      linkString,           // B: link
      data.type,            // C: type
      data.nameOfHypothesis, // D: name_of_hypothesis
      data.aiFlag,          // E: made_ai
      data.style,           // F: style
      data.mainTon,         // G: main_ton
      data.mainObject,      // H: main_object
    ];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: `${config.sheetName}!B${data.rowIndex}:H${data.rowIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [row],
      },
    });
    
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { status: "error", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

