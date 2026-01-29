"use client";

import { useState } from "react";

interface SearchBoxProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export default function SearchBox({ onSearch, isLoading }: SearchBoxProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex gap-3 search-glow rounded-xl transition-shadow duration-300">
        <div className="relative flex-1">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Still et spørsmål om arbeidsrett..."
            className="w-full pl-12 pr-4 py-3.5 border border-border bg-surface rounded-l-xl
                       focus:outline-none focus:border-accent/40
                       text-foreground placeholder:text-text-muted text-base"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="btn-primary rounded-l-none rounded-r-xl px-7 flex items-center gap-2 text-base"
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Søker...
            </>
          ) : (
            "Søk"
          )}
        </button>
      </div>
    </form>
  );
}
