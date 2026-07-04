import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/server/supabase/server";
import { rateLimiter } from "@/server/rate-limit";

/**
 * File-to-text extraction for the study-set import wizard. Multipart
 * form-data upload, so this is the third documented exception to the
 * defineEndpoint factory (with the AI SSE stream and the Stripe webhook).
 * Extraction logic ported verbatim from the previous app.
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const SUPPORTED_EXTENSIONS = [
  "txt",
  "md",
  "csv",
  "tsv",
  "docx",
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
];
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("unauthorized", "Unauthorized", 401);

  const allowed = await rateLimiter.check(
    `/api/study-sets/extract-text:${user.id}`,
    { limit: 20, windowSeconds: 3600 }
  );
  if (!allowed)
    return jsonError("rate_limited", "Too many requests. Please try again later.", 429);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError("validation_failed", "Invalid form data", 400);
  }

  const file = formData.get("file") as File | null;
  if (!file) return jsonError("validation_failed", "No file provided", 400);
  if (file.size > MAX_FILE_SIZE)
    return jsonError("validation_failed", "File too large. Maximum size is 10 MB.", 400);

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !SUPPORTED_EXTENSIONS.includes(ext)) {
    return jsonError(
      "validation_failed",
      `Unsupported file type. Accepted: ${SUPPORTED_EXTENSIONS.join(", ")}`,
      400
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
      return jsonError("validation_failed", "Unsupported file type", 400);
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return jsonError(
        "validation_failed",
        "No readable text found in the file. The file may be empty or the image too blurry. Try pasting the content instead.",
        400
      );
    }

    return NextResponse.json({
      text: trimmed,
      fileName: file.name,
      charCount: trimmed.length,
    });
  } catch (error) {
    console.error("Text extraction error:", error);
    return jsonError(
      "internal",
      "Failed to extract text from the file. Try pasting the content instead.",
      500
    );
  }
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractPdfText(file: File): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const buffer = Buffer.from(await file.arrayBuffer());
  const pdf = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await pdf.getText();
  return result.text;
}

async function extractImageText(file: File): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const buffer = Buffer.from(await file.arrayBuffer());
  const { data } = await Tesseract.recognize(buffer, "eng");
  return data.text;
}
