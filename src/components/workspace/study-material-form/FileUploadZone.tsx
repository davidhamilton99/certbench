"use client";

import { useCallback, useRef } from "react";
import {
  ACCEPTED_FILE_TYPES,
  ALL_EXTENSIONS,
  MAX_FILE_SIZE,
  PLAIN_TEXT_EXTENSIONS,
  SERVER_PARSED_EXTENSIONS,
} from "./types";

interface FileUploadZoneProps {
  content: string;
  uploadedFileName: string | null;
  uploadedFileSize: number | null;
  dragOver: boolean;
  fileLoading: boolean;
  onContentChange: (content: string) => void;
  onFileUploaded: (fileName: string, fileSize: number, content: string) => void;
  onClearFile: () => void;
  onDragOverChange: (dragOver: boolean) => void;
  onFileLoadingChange: (loading: boolean) => void;
  onError: (error: string) => void;
  autoFillTitle: (fileName: string) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadZone({
  content,
  uploadedFileName,
  uploadedFileSize,
  dragOver,
  fileLoading,
  onContentChange,
  onFileUploaded,
  onClearFile,
  onDragOverChange,
  onFileLoadingChange,
  onError,
  autoFillTitle,
}: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      onError("");

      if (file.size > MAX_FILE_SIZE) {
        onError("File is too large. Maximum size is 10 MB.");
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !ALL_EXTENSIONS.includes(ext)) {
        onError(
          "Unsupported file type. Accepted: .txt, .md, .csv, .tsv, .pdf, .docx, .png, .jpg, .webp"
        );
        return;
      }

      // Plain text files — read client-side
      if (PLAIN_TEXT_EXTENSIONS.includes(ext)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result;
          if (typeof text === "string") {
            onFileUploaded(file.name, file.size, text);
            autoFillTitle(file.name);
          }
        };
        reader.onerror = () => {
          onError("Failed to read file. Please try again.");
        };
        reader.readAsText(file);
        return;
      }

      // PDF/DOCX/images — send to server for text extraction
      if (SERVER_PARSED_EXTENSIONS.includes(ext)) {
        onFileLoadingChange(true);
        try {
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("/api/study-materials/extract-text", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();

          if (!res.ok) {
            onError(data.error || "Failed to extract text from file.");
            return;
          }

          onFileUploaded(file.name, file.size, data.text);
          autoFillTitle(file.name);
        } catch {
          onError("Network error. Please try again.");
        } finally {
          onFileLoadingChange(false);
        }
      }
    },
    [autoFillTitle, onContentChange, onError, onFileLoadingChange, onFileUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDragOverChange(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile, onDragOverChange]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [handleFile]
  );

  const hasContent = content.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleFileInput}
        className="hidden"
        disabled={fileLoading}
      />

      {uploadedFileName ? (
        <div className="flex items-center gap-4 px-4 py-4 bg-green-50 border border-success/20 rounded-lg">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[14px] font-medium text-text-primary truncate">
              {uploadedFileName}
            </span>
            <span className="text-[12px] text-text-secondary">
              {uploadedFileSize != null && formatFileSize(uploadedFileSize)}
              {" \u00b7 "}
              {content.length.toLocaleString()} characters extracted
            </span>
          </div>
          <button
            type="button"
            onClick={onClearFile}
            className="text-[13px] text-text-muted hover:text-danger transition-colors shrink-0 px-2 py-1 rounded hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            onDragOverChange(true);
          }}
          onDragLeave={() => onDragOverChange(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center gap-3 py-10 px-6 border-2 border-dashed rounded-lg transition-all ${
            fileLoading
              ? "border-primary bg-blue-50/50 cursor-wait"
              : dragOver
                ? "border-primary bg-blue-50/50 scale-[1.01]"
                : "border-border hover:border-primary/40 hover:bg-blue-50/30 bg-bg-surface cursor-pointer"
          }`}
          onClick={() => !fileLoading && fileInputRef.current?.click()}
        >
          {fileLoading ? (
            <>
              <svg className="animate-spin w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-[14px] text-text-secondary font-medium">
                Extracting text from file...
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-[14px] text-text-primary font-medium">
                  <span className="text-primary">Click to upload</span>{" "}or drag and drop
                </p>
                <p className="text-[12px] text-text-muted">
                  PDF, DOCX, TXT, MD, CSV, PNG, JPG, WEBP &mdash; up to 10 MB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 border-t border-border" />
        <span className="text-[12px] font-medium text-text-muted uppercase tracking-wider">or paste text</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <div className="flex flex-col gap-1.5">
        <textarea
          value={content}
          onChange={(e) => {
            onContentChange(e.target.value);
          }}
          placeholder="Paste your notes, textbook text, or any study material here..."
          rows={6}
          className="w-full px-3 py-3 text-[15px] text-text-primary bg-bg-surface border border-border rounded-md placeholder:text-text-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50 focus:border-primary resize-y"
          style={{ minHeight: "140px" }}
        />
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-text-muted">
            {content.length.toLocaleString()} characters
          </p>
          {hasContent && (
            <span className="flex items-center gap-1 text-[12px] text-success">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Content ready
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
