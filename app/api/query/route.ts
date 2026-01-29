import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateEmbedding, generateAnswer } from "@/lib/openai";
import type { DocumentWithSimilarity } from "@/types";

// Prevent static generation during build
export const dynamic = "force-dynamic";

// Max chunks per case to ensure diversity across cases
const MAX_CHUNKS_PER_CASE = 2;
// Total chunks to use for context after deduplication
const TARGET_CONTEXT_CHUNKS = 6;
// Fetch more initially to allow for deduplication
const INITIAL_FETCH_COUNT = 15;
// Weight for text search in hybrid (0-1). Higher = more keyword influence.
const TEXT_SEARCH_WEIGHT = 0.3;

/**
 * Deduplicates chunks to ensure diverse case coverage.
 * Keeps max MAX_CHUNKS_PER_CASE chunks per case_number, prioritizing higher similarity.
 */
function deduplicateByCase(
  chunks: DocumentWithSimilarity[],
  maxPerCase: number,
  targetTotal: number
): DocumentWithSimilarity[] {
  const caseCount = new Map<string, number>();
  const result: DocumentWithSimilarity[] = [];

  for (const chunk of chunks) {
    const caseNum = chunk.case_number;
    const currentCount = caseCount.get(caseNum) || 0;

    if (currentCount < maxPerCase) {
      result.push(chunk);
      caseCount.set(caseNum, currentCount + 1);

      if (result.length >= targetTotal) {
        break;
      }
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json(
        { error: "Spørsmål er påkrevd" },
        { status: 400 }
      );
    }

    const trimmedQuestion = question.trim();

    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(trimmedQuestion);

    // Use hybrid search combining vector similarity + keyword matching
    const { data: matches, error } = await supabase.rpc("hybrid_search", {
      query_text: trimmedQuestion,
      query_embedding: questionEmbedding,
      match_count: INITIAL_FETCH_COUNT,
      text_weight: TEXT_SEARCH_WEIGHT,
    });

    if (error) {
      console.error("Hybrid search error:", error);
      // Fallback to vector-only search if hybrid fails (e.g., function not created yet)
      console.log("Falling back to vector-only search...");
      const { data: fallbackMatches, error: fallbackError } = await supabase.rpc(
        "match_documents",
        {
          query_embedding: questionEmbedding,
          match_threshold: 0.4,
          match_count: INITIAL_FETCH_COUNT,
        }
      );

      if (fallbackError) {
        console.error("Fallback search error:", fallbackError);
        return NextResponse.json(
          { error: "Kunne ikke søke i dokumentene: " + fallbackError.message },
          { status: 500 }
        );
      }

      if (!fallbackMatches || fallbackMatches.length === 0) {
        return NextResponse.json({
          answer:
            "Beklager, jeg fant ingen relevante dokumenter som kan besvare dette spørsmålet. Prøv å omformulere spørsmålet eller søk etter andre termer.",
          sources: [],
        });
      }

      // Process fallback results
      const diverseMatches = deduplicateByCase(
        fallbackMatches as DocumentWithSimilarity[],
        MAX_CHUNKS_PER_CASE,
        TARGET_CONTEXT_CHUNKS
      );

      const context = diverseMatches
        .map(
          (m) =>
            `[Sak ${m.case_number}${m.case_type ? ` - ${m.case_type}` : ""}]:\n${m.content}`
        )
        .join("\n\n---\n\n");

      const answer = await generateAnswer(trimmedQuestion, context);

      const sources: DocumentWithSimilarity[] = diverseMatches.map((m) => ({
        id: m.id,
        title: m.title,
        case_number: m.case_number,
        case_type: m.case_type,
        decision_date: m.decision_date,
        content: m.content.length > 300 ? m.content.substring(0, 300) + "..." : m.content,
        chunk_index: m.chunk_index,
        metadata: m.metadata,
        similarity: Math.round(m.similarity * 100) / 100,
      }));

      return NextResponse.json({ answer, sources });
    }

    console.log("Hybrid search results:", matches?.length || 0, "documents found");

    // If no matches found
    if (!matches || matches.length === 0) {
      return NextResponse.json({
        answer:
          "Beklager, jeg fant ingen relevante dokumenter som kan besvare dette spørsmålet. Prøv å omformulere spørsmålet eller søk etter andre termer.",
        sources: [],
      });
    }

    // Deduplicate to ensure diverse case coverage
    const diverseMatches = deduplicateByCase(
      matches as DocumentWithSimilarity[],
      MAX_CHUNKS_PER_CASE,
      TARGET_CONTEXT_CHUNKS
    );

    const uniqueCases = new Set(diverseMatches.map((m) => m.case_number)).size;
    console.log(
      "After deduplication:",
      diverseMatches.length,
      "chunks from",
      uniqueCases,
      "unique cases"
    );

    // Build context from matched documents
    const context = diverseMatches
      .map(
        (m: DocumentWithSimilarity) =>
          `[Sak ${m.case_number}${m.case_type ? ` - ${m.case_type}` : ""}]:\n${m.content}`
      )
      .join("\n\n---\n\n");

    // Generate answer using OpenAI
    const answer = await generateAnswer(trimmedQuestion, context);

    // Prepare sources with truncated content for display
    const sources: DocumentWithSimilarity[] = diverseMatches.map(
      (m: DocumentWithSimilarity) => ({
        id: m.id,
        title: m.title,
        case_number: m.case_number,
        case_type: m.case_type,
        decision_date: m.decision_date,
        content:
          m.content.length > 300
            ? m.content.substring(0, 300) + "..."
            : m.content,
        chunk_index: m.chunk_index,
        metadata: m.metadata,
        similarity: Math.round(m.similarity * 100) / 100,
      })
    );

    return NextResponse.json({
      answer,
      sources,
    });
  } catch (error) {
    console.error("Query error:", error);
    return NextResponse.json(
      { error: "En feil oppstod under behandling av spørsmålet" },
      { status: 500 }
    );
  }
}
