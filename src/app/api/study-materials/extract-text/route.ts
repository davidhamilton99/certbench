import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const SUPPORTED_EXTENSIONS = [
  "txt",
  "md",
  "csv",
  "tsv",
  "pdf",
  "docx",
  "png",
  "jpg",
  "jpeg",
  "webp",
];
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10 MB." },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !SUPPORTED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      {
        error: `Unsupported file type. Accepted: ${SUPPORTED_EXTENSIONS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  try {
    let text: string;

    if (["txt", "md", "csv", "tsv"].includes(ext)) {
      text = await file.text();
    } else if (ext === "docx") {
      text = await extractDocxText(file);
    } else if (ext === "pdf") {
      text = await extractPdfText(file);
    } else if (IMAGE_EXTENSIONS.includes(ext)) {
      text = await extractImageText(file);
    } else {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return NextResponse.json(
        {
          error:
            "No readable text found in the file. The file may be empty or the image too blurry. Try pasting the content instead.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      text: trimmed,
      fileName: file.name,
      charCount: trimmed.length,
    });
  } catch (error) {
    console.error("Text extraction error:", error);
    return NextResponse.json(
      {
        error:
          "Failed to extract text from the file. Try pasting the content instead.",
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DOCX text extraction using mammoth
// ---------------------------------------------------------------------------

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// ---------------------------------------------------------------------------
// PDF text extraction using pdf-parse
// ---------------------------------------------------------------------------

async function extractPdfText(file: File): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const buffer = Buffer.from(await file.arrayBuffer());

  const pdf = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await pdf.getText();
  return result.text;
}

// ---------------------------------------------------------------------------
// Image OCR text extraction using tesseract.js
// ---------------------------------------------------------------------------

async function extractImageText(file: File): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data } = await Tesseract.recognize(buffer, "eng");
  return data.text;
}
