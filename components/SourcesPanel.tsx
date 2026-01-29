"use client";

import { useState } from "react";
import type { DocumentWithSimilarity } from "@/types";

interface SourcesPanelProps {
  sources: DocumentWithSimilarity[];
  isLoading?: boolean;
}

function getRelevanceBadge(score: number): string {
  if (score >= 0.85) return "bg-emerald-100 text-emerald-800";
  if (score >= 0.75) return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-700";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function SourceSkeleton() {
  return (
    <div className="glass-card p-4 animate-pulse">
      <div className="flex justify-between items-start mb-2">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-border/60 rounded-full w-1/3" />
          <div className="h-3 bg-border/60 rounded-full w-2/3" />
        </div>
        <div className="h-5 bg-border/60 rounded-full w-20 ml-3" />
      </div>
      <div className="space-y-2 mt-3 mb-3">
        <div className="h-3 bg-border/60 rounded-full w-full" />
        <div className="h-3 bg-border/60 rounded-full w-5/6" />
        <div className="h-3 bg-border/60 rounded-full w-4/6" />
      </div>
      <div className="flex gap-3">
        <div className="h-3 bg-border/60 rounded-full w-20" />
        <div className="h-3 bg-border/60 rounded-full w-24" />
      </div>
    </div>
  );
}

function PdfModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-heading font-semibold text-primary">Vedtak</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-border/40 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <iframe
          src={url}
          className="w-full flex-1"
          title="PDF-visning"
        />
      </div>
    </div>
  );
}

function SourceCard({ source, index }: { source: DocumentWithSimilarity; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const pdfUrl = source.metadata?.pdf_url as string | undefined;

  return (
    <>
      <div
        className="glass-card glass-card-hover p-4"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-semibold text-primary">
              {source.case_number}
            </h4>
            {source.title && (
              <p className="text-sm text-text-muted">{source.title}</p>
            )}
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ml-3 ${getRelevanceBadge(source.similarity)}`}
          >
            {Math.round(source.similarity * 100)}%
          </span>
        </div>

        <p
          className={`text-sm text-foreground/80 mb-3 leading-relaxed ${expanded ? "" : "line-clamp-3"}`}
        >
          {source.content}
        </p>

        <div className="flex items-center justify-between text-xs text-text-muted">
          <div className="flex gap-2 items-center">
            {source.case_type && (
              <span className="bg-primary/5 text-primary/80 px-2 py-0.5 rounded-full">
                {source.case_type}
              </span>
            )}
            {source.decision_date && (
              <span className="py-0.5">{formatDate(source.decision_date)}</span>
            )}
            {pdfUrl && (
              <button
                onClick={() => setShowPdf(true)}
                className="text-accent hover:text-accent-light transition-colors cursor-pointer font-medium"
              >
                Se vedtak
              </button>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-accent hover:text-accent-light transition-colors cursor-pointer font-medium"
          >
            {expanded ? "Vis mindre \u2191" : "Vis mer \u2193"}
          </button>
        </div>
      </div>
      {showPdf && pdfUrl && (
        <PdfModal url={pdfUrl} onClose={() => setShowPdf(false)} />
      )}
    </>
  );
}

export default function SourcesPanel({ sources, isLoading }: SourcesPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="font-heading text-lg font-semibold text-primary">
          Kilder
        </h3>
        <SourceSkeleton />
        <SourceSkeleton />
        <SourceSkeleton />
      </div>
    );
  }

  if (sources.length === 0) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="font-heading text-lg font-semibold text-primary">
        Kilder ({sources.length})
      </h3>
      {sources.map((source, i) => (
        <SourceCard key={source.id} source={source} index={i} />
      ))}
    </div>
  );
}
