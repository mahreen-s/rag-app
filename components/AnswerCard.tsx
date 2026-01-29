"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface AnswerCardProps {
  question: string | null;
  answer: string | null;
  isLoading: boolean;
}

const THINKING_STEPS = [
  { label: "Søker i dokumenter", description: "Finner relevante avgjørelser..." },
  { label: "Analyserer relevans", description: "Rangerer treff etter relevans..." },
  { label: "Genererer svar", description: "Formulerer svar basert på kildene..." },
];

function ThinkingSteps() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => Math.min(prev + 1, THINKING_STEPS.length - 1));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      {THINKING_STEPS.map((step, i) => {
        const isDone = i < activeStep;
        const isActive = i === activeStep;
        const isPending = i > activeStep;

        return (
          <div
            key={i}
            className={`flex items-start gap-3 transition-opacity duration-300 ${
              isPending ? "opacity-40" : "opacity-100"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isDone ? (
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : isActive ? (
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-border" />
              )}
            </div>
            <div>
              <p className={`text-sm font-medium ${isActive ? "text-primary" : isDone ? "text-emerald-700" : "text-text-muted"}`}>
                {step.label}
              </p>
              {(isActive || isDone) && (
                <p className="text-xs text-text-muted mt-0.5">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnswerCard({
  question,
  answer,
  isLoading,
}: AnswerCardProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-6">
        {question && (
          <div className="mb-5 pb-4 border-b border-border/50">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-accent mb-1.5">
              Ditt spørsmål
            </h3>
            <p className="text-foreground text-lg">{question}</p>
          </div>
        )}
        <ThinkingSteps />
      </div>
    );
  }

  if (!answer) return null;

  return (
    <div className="glass-card p-6 animate-fade-in">
      {question && (
        <div className="mb-5 pb-4 border-b border-border/50">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-accent mb-1.5">
            Ditt spørsmål
          </h3>
          <p className="text-foreground text-lg">{question}</p>
        </div>
      )}
      <div>
        <h2 className="font-heading text-xl font-semibold text-primary mb-3">
          Svar
        </h2>
        <div className="prose-answer">
          <ReactMarkdown>{answer}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
