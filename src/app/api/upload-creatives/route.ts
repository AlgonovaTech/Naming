import { NextRequest, NextResponse } from "next/server";
import { validateConfig } from "@/lib/config";
import { addCreative, addTitle } from "@/lib/sheets";
import { analyzeCreative } from "@/lib/openrouter";
import { uploadToDrive } from "@/lib/drive";

export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds timeout for processing

interface CreativeData {
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
}

interface UploadResult {
  name: string;
  creativeId: number;
  rowIndex: number;
  titleId?: number;
  data: CreativeData;
}

export async function POST(request: NextRequest) {
  try {
    // Validate configuration
    const configErrors = validateConfig();
    if (configErrors.length > 0) {
      console.error("Config errors:", configErrors);
      return NextResponse.json(
        { status: "error", error: `Configuration error: ${configErrors.join(", ")}` },
        { status: 500 }
      );
    }
    
    // Parse FormData
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e) {
      console.error("FormData parse error:", e);
      return NextResponse.json(
        { status: "error", error: "Failed to parse form data" },
        { status: 400 }
      );
    }
    
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
    
    // Check file sizes (max 10MB per file)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { status: "error", error: `File ${file.name} is too large (max 10MB)` },
          { status: 400 }
        );
      }
    }
    
    // Process files sequentially to maintain ID order
    const results: UploadResult[] = [];
    const errors: string[] = [];
    
    for (const file of files) {
      try {
        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        
        // Upload to Google Drive first (for preview)
        let previewUrl = "";
        try {
          const driveResult = await uploadToDrive(base64, file.type, file.name);
          previewUrl = driveResult.thumbnailLink;
          console.log(`Uploaded to Drive: ${driveResult.fileId}`);
        } catch (driveError) {
          console.error(`Drive upload error for ${file.name}:`, driveError);
          // Continue without preview if Drive upload fails
        }
        
        // Analyze with AI
        let analysis;
        try {
          analysis = await analyzeCreative(base64, file.type, file.name);
        } catch (aiError) {
          console.error(`AI analysis error for ${file.name}:`, aiError);
          // Use defaults if AI fails
          analysis = {
            type: file.type.startsWith("video/") ? "video" : "static",
            name_of_hypothesis: "unknown",
            made_ai: "not AI",
            style: "Other",
            main_ton: "neutral",
            main_object: "other",
            header_text: "none",
            uvp: "other",
            product: "other",
            offer: "other",
          };
        }
        
        // Prepare data for Creative sheet
        const creativeData: CreativeData = {
          type: analysis.type,
          nameOfHypothesis: analysis.name_of_hypothesis,
          aiFlag: analysis.made_ai,
          style: analysis.style,
          mainTon: analysis.main_ton,
          mainObject: analysis.main_object,
          headerText: analysis.header_text,
          uvp: analysis.uvp,
          product: analysis.product,
          offer: analysis.offer,
        };
        
        // Add to Creative sheet with sequential ID
        const { creativeId, rowIndex } = await addCreative({
          ...creativeData,
          filename: file.name,
          previewUrl,
        });
        
        // Also add to Title sheet (auto-populate)
        let titleId: number | undefined;
        try {
          const titleResult = await addTitle({
            headerText: analysis.header_text,
            uvp: analysis.uvp,
            product: analysis.product,
            offer: analysis.offer,
          });
          titleId = titleResult.titleId;
        } catch (titleError) {
          console.error(`Title sheet error for ${file.name}:`, titleError);
          // Continue without title if it fails
        }
        
        results.push({
          name: file.name,
          creativeId,
          rowIndex,
          titleId,
          data: creativeData,
        });
      } catch (fileError) {
        const errorMsg = fileError instanceof Error ? fileError.message : "Unknown error";
        console.error(`Error processing file ${file.name}:`, errorMsg);
        errors.push(`${file.name}: ${errorMsg}`);
      }
    }
    
    if (results.length === 0) {
      return NextResponse.json(
        { status: "error", error: errors.length > 0 ? errors.join("; ") : "Failed to process any files" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      status: "ok",
      results,
      ...(errors.length > 0 && { warnings: errors }),
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
