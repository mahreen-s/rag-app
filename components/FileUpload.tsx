"use client";

import { useState, useCallback, useRef } from "react";

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  onFileRemove?: (index: number) => void;
  isUploading: boolean;
  progress: number;
  selectedFiles: File[];
}

export default function FileUpload({
  onFileSelect,
  onFileRemove,
  isUploading,
  progress,
  selectedFiles,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback(
    (fileList: FileList | File[]): File[] => {
      setError(null);
      const valid: File[] = [];
      const errors: string[] = [];

      for (const file of Array.from(fileList)) {
        if (file.type !== "application/pdf") {
          errors.push(`${file.name}: Kun PDF-filer er tillatt`);
        } else if (file.size > 50 * 1024 * 1024) {
          errors.push(`${file.name}: Filen er for stor (maks 50MB)`);
        } else {
          valid.push(file);
        }
      }

      if (errors.length > 0) {
        setError(errors.join("\n"));
      }

      return valid;
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = validateFiles(e.dataTransfer.files);
      if (files.length > 0) {
        onFileSelect(files);
      }
    },
    [validateFiles, onFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      const files = validateFiles(fileList);
      if (files.length > 0) {
        onFileSelect(files);
      }
    }
  };

  const handleClick = () => {
    if (!isUploading) {
      inputRef.current?.click();
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
          ${isDragging
            ? "border-accent bg-accent/5 scale-[1.02]"
            : "border-border hover:border-accent/40 hover:bg-surface/50"
          }
          ${isUploading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="spinner-dark" />
            </div>
            <p className="text-primary font-medium">
              Laster opp og behandler dokumenter...
            </p>
            <div className="w-full max-w-xs mx-auto bg-border/40 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-text-muted">{progress}%</p>
          </div>
        ) : selectedFiles.length > 0 ? (
          <div className="space-y-3">
            <div className="w-14 h-14 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
              <svg
                className="w-7 h-7 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-primary font-semibold text-lg">
              {selectedFiles.length} {selectedFiles.length === 1 ? "fil" : "filer"} valgt
            </p>
            <div className="text-sm text-text-muted space-y-1.5">
              {selectedFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-center gap-2">
                  <span>
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                  {onFileRemove && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileRemove(i);
                      }}
                      className="text-red-300 hover:text-red-500 transition-colors"
                      aria-label={`Fjern ${file.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted">
              Klikk for å velge andre filer
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-14 h-14 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
              <svg
                className="w-7 h-7 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-primary">Dra og slipp PDF-filer her</p>
            <p className="text-sm text-text-muted">eller klikk for å velge filer</p>
            <p className="text-xs text-text-muted/60">Maks 50MB per fil</p>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl text-red-700 text-sm whitespace-pre-line">
          {error}
        </div>
      )}
    </div>
  );
}
