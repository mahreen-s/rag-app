"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import FileUpload from "@/components/FileUpload";
import type { UploadResponse } from "@/types";

interface FileStatus {
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  result?: UploadResponse;
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files);
    setError(null);
    setFileStatuses([]);
  };

  const handleFileRemove = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      setError("Vennligst velg minst en fil");
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setError(null);

    const statuses: FileStatus[] = selectedFiles.map((f) => ({
      name: f.name,
      status: "pending" as const,
    }));
    setFileStatuses([...statuses]);

    for (let i = 0; i < selectedFiles.length; i++) {
      statuses[i].status = "uploading";
      setFileStatuses([...statuses]);
      setProgress(Math.round((i / selectedFiles.length) * 100));

      try {
        const formData = new FormData();
        formData.append("file", selectedFiles[i]);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data: UploadResponse | { error: string } = await response.json();

        if (!response.ok || "error" in data) {
          statuses[i].status = "error";
          statuses[i].error =
            "error" in data ? data.error : "Opplasting feilet";
        } else {
          statuses[i].status = "done";
          statuses[i].result = data;
        }
      } catch (err) {
        statuses[i].status = "error";
        statuses[i].error =
          err instanceof Error ? err.message : "En uventet feil oppstod";
      }

      setFileStatuses([...statuses]);
    }

    setProgress(100);
    setIsUploading(false);
    setSelectedFiles([]);
  };

  const hasResults = fileStatuses.length > 0 && !isUploading;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-primary mb-3">
              Last opp dokumenter
            </h1>
            <p className="text-text-muted text-lg">
              Last opp avgjørelser fra Tvisteløsningsnemnda. Metadata hentes
              automatisk fra dokumentene.
            </p>
          </div>

          {/* Results */}
          {hasResults && (
            <div className="mb-8 space-y-3 animate-fade-in">
              {fileStatuses.map((fs, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-2xl border backdrop-blur ${
                    fs.status === "done"
                      ? "bg-emerald-50/80 border-emerald-200"
                      : "bg-red-50/80 border-red-200"
                  }`}
                >
                  {fs.status === "done" && fs.result ? (
                    <div>
                      <h3 className="font-semibold text-emerald-800">
                        {fs.name}
                      </h3>
                      <p className="text-emerald-700 text-sm">
                        Sak {fs.result.case_number} ble lagret med{" "}
                        {fs.result.chunks_created} tekstsegmenter.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-semibold text-red-800">{fs.name}</h3>
                      <p className="text-red-700 text-sm">{fs.error}</p>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex gap-4 pt-3">
                <button
                  onClick={() => setFileStatuses([])}
                  className="text-sm text-accent hover:text-accent-light font-medium transition-colors"
                >
                  Last opp flere
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="text-sm text-accent hover:text-accent-light font-medium transition-colors"
                >
                  Gå til søk →
                </button>
              </div>
            </div>
          )}

          {/* Per-file status during upload */}
          {isUploading && fileStatuses.length > 0 && (
            <div className="mb-6 glass-card p-4 space-y-2.5">
              {fileStatuses.map((fs, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm"
                >
                  {fs.status === "done" ? (
                    <span className="text-emerald-500 text-base">&#10003;</span>
                  ) : fs.status === "error" ? (
                    <span className="text-red-500 text-base">&#10007;</span>
                  ) : fs.status === "uploading" ? (
                    <span className="inline-block w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-border text-base">&#9679;</span>
                  )}
                  <span
                    className={
                      fs.status === "uploading"
                        ? "text-primary font-medium"
                        : "text-text-muted"
                    }
                  >
                    {fs.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-8 p-4 bg-red-50/80 border border-red-200 rounded-2xl text-red-700">
              {error}
            </div>
          )}

          {/* Upload form */}
          {!hasResults && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <FileUpload
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                isUploading={isUploading}
                progress={progress}
                selectedFiles={selectedFiles}
              />

              <button
                type="submit"
                disabled={isUploading || selectedFiles.length === 0}
                className="btn-primary w-full py-3.5 rounded-xl text-base"
              >
                {isUploading
                  ? "Laster opp og behandler..."
                  : selectedFiles.length > 1
                    ? `Last opp ${selectedFiles.length} dokumenter`
                    : "Last opp dokument"}
              </button>

              {isUploading && (
                <p className="text-center text-sm text-text-muted">
                  Dokumentene analyseres og metadata hentes automatisk...
                </p>
              )}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
