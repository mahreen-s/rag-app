"use client";

import { useState } from "react";
import Header from "@/components/Header";
import SearchBox from "@/components/SearchBox";
import AnswerCard from "@/components/AnswerCard";
import SourcesPanel from "@/components/SourcesPanel";
import type { DocumentWithSimilarity, QueryResponse } from "@/types";

const EXAMPLE_QUESTIONS = [
  "Hva er vilkårene for fortrinnsrett til utvidet stilling?",
  "Kan arbeidsgiver nekte redusert arbeidstid?",
  "Hva sier nemnda om midlertidig ansettelse?",
  "Hvilke rettigheter har deltidsansatte?",
];

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<DocumentWithSimilarity[]>([]);
  const [error, setError] = useState<string | null>(null);

  const hasResults = isLoading || answer;

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setQuestion(query);
    setAnswer(null);
    setSources([]);
    setError(null);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: query }),
      });

      const data: QueryResponse | { error: string } = await response.json();

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "En feil oppstod");
      }

      setAnswer(data.answer);
      setSources(data.sources);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "En uventet feil oppstod"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12">
        {/* Hero section */}
        <div
          className={`text-center transition-all duration-500 ${
            hasResults ? "mb-8" : "mb-12"
          }`}
        >
          <h1
            className={`font-heading font-bold text-primary transition-all duration-500 ${
              hasResults
                ? "text-2xl mb-2"
                : "text-4xl md:text-5xl lg:text-6xl mb-5"
            }`}
          >
            Søk i Tvisteløsningsnemndas avgjørelser
          </h1>
          {!hasResults && (
            <p className="text-text-muted text-lg md:text-xl max-w-2xl mx-auto animate-fade-in leading-relaxed">
              Still spørsmål om arbeidsrett og få svar med kildehenvisninger fra
              relevante avgjørelser.
            </p>
          )}
        </div>

        {/* Search box */}
        <div className="flex justify-center mb-12">
          <SearchBox onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Error message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50/80 backdrop-blur border border-red-200 rounded-2xl text-red-700 animate-fade-in">
            {error}
          </div>
        )}

        {/* Results section */}
        {hasResults && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Answer card */}
            <div className="lg:col-span-2">
              <AnswerCard
                question={question}
                answer={answer}
                isLoading={isLoading}
              />
            </div>

            {/* Sources panel */}
            <div className="lg:col-span-1">
              {isLoading && <SourcesPanel sources={[]} isLoading />}
              {!isLoading && sources.length > 0 && (
                <SourcesPanel sources={sources} />
              )}
              {!isLoading && answer && sources.length === 0 && (
                <div className="glass-card p-6 animate-fade-in">
                  <p className="text-text-muted text-sm">
                    Ingen kilder funnet for dette svaret.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state — example questions */}
        {!hasResults && !error && (
          <div className="text-center mt-8 animate-fade-in">
            <p className="text-text-muted mb-5 text-sm uppercase tracking-wider font-medium">
              Prøv et eksempelspørsmål
            </p>
            <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSearch(q)}
                  className="px-5 py-2.5 glass-card glass-card-hover text-sm
                             text-primary hover:bg-primary hover:text-background
                             transition-all cursor-pointer rounded-full"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
