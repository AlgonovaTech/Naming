import { NextRequest, NextResponse } from "next/server";
import { validateConfig } from "@/lib/config";
import { addCreative } from "@/lib/sheets";
import { analyzeCreative } from "@/lib/openrouter";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds timeout for processing

interface FileData {
  name: string;
  type: string;
  base64: string;
}

interface UploadResult {
  name: string;
  creativeId: number;
  rowIndex: number;
}

export async function POST(request: NextRequest) {
  try {
    // Validate configuration
    const configErrors = validateConfig();
    if (configErrors.length > 0) {
      return NextResponse.json(
        { status: "error", error: `Configuration error: ${configErrors.join(", ")}` },
        { status: 500 }
      );
    }
    
    // Parse FormData
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { status: "error", error: "No files provided" },
        { status: 400 }
      );
    }
    
    if (files.length > 20) {
      return NextResponse.json(
        { status: "error", error: "Maximum 20 files allowed" },
        { status: 400 }
      );
    }
    
    // Convert files to base64
    const fileDataArray: FileData[] = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return {
          name: file.name,
          type: file.type,
          base64,
        };
      })
    );
    
    // Process files sequentially to maintain ID order
    const results: UploadResult[] = [];
    
    for (const fileData of fileDataArray) {
      try {
        // Analyze with AI
        const analysis = await analyzeCreative(
          fileData.base64,
          fileData.type,
          fileData.name
        );
        
        // Add to Google Sheets with sequential ID
        const { creativeId, rowIndex } = await addCreative({
          type: analysis.type,
          nameOfHypothesis: analysis.name_of_hypothesis,
          aiFlag: analysis.made_ai,
          style: analysis.style,
          mainTon: analysis.main_ton,
          mainObject: analysis.main_object,
          filename: fileData.name,
        });
        
        results.push({
          name: fileData.name,
          creativeId,
          rowIndex,
        });
      } catch (fileError) {
        console.error(`Error processing file ${fileData.name}:`, fileError);
        // Continue with next file, but log the error
        // For now, we'll skip failed files
      }
    }
    
    if (results.length === 0) {
      return NextResponse.json(
        { status: "error", error: "Failed to process any files" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      status: "ok",
      results,
    });
    
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { 
        status: "error", 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      },
      { status: 500 }
    );
  }
}

