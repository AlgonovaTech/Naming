import { NextRequest, NextResponse } from "next/server";
import { validateConfig } from "@/lib/config";
import { updateCreativeRow } from "@/lib/sheets";

export const runtime = "nodejs";

interface UpdateRequest {
  rowIndex: number;
  creativeId: number;
  type?: string;
  nameOfHypothesis?: string;
  aiFlag?: string;
  style?: string;
  mainTon?: string;
  mainObject?: string;
  headerText?: string;
  uvp?: string;
  product?: string;
  offer?: string;
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
    
    if (!data.rowIndex || !data.creativeId) {
      return NextResponse.json(
        { status: "error", error: "rowIndex and creativeId are required" },
        { status: 400 }
      );
    }
    
    await updateCreativeRow(data.rowIndex, data.creativeId, {
      type: data.type,
      nameOfHypothesis: data.nameOfHypothesis,
      aiFlag: data.aiFlag,
      style: data.style,
      mainTon: data.mainTon,
      mainObject: data.mainObject,
      headerText: data.headerText,
      uvp: data.uvp,
      product: data.product,
      offer: data.offer,
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
