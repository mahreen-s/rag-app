export interface Chunk {
  content: string;
  index: number;
  tokenCount: number;
}

/**
 * Splits text into chunks optimized for embedding and retrieval.
 * Uses sentence-aware splitting to preserve context.
 *
 * @param text - The full text to chunk
 * @param targetTokens - Target tokens per chunk (default 1000)
 * @param maxTokens - Maximum tokens per chunk (default 1200)
 * @param overlapTokens - Overlap between chunks (default 150)
 * @returns Array of chunks with content, index, and token count
 */
export function chunkText(
  text: string,
  targetTokens: number = 1200,
  maxTokens: number = 1500,
  overlapTokens: number = 200
): Chunk[] {
  // Approximate: 1 token ≈ 4 characters for Norwegian/English text
  const charPerToken = 4;
  const targetChars = targetTokens * charPerToken;
  const maxChars = maxTokens * charPerToken;
  const overlapChars = overlapTokens * charPerToken;

  // Clean and normalize text
  const cleanedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanedText) {
    return [];
  }

  // Split by sentences (handle Norwegian punctuation patterns)
  // Preserves legal citations like "§ 1-2" and "Rt. 2020 s. 123"
  const sentenceRegex = /(?<=[.!?])\s+(?=[A-ZÆØÅ])|(?<=\n\n)/g;
  const sentences = cleanedText.split(sentenceRegex).filter((s) => s.trim());

  const chunks: Chunk[] = [];
  let currentChunk = "";
  let chunkIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();

    if (!sentence) continue;

    // Check if adding this sentence would exceed max
    if (
      currentChunk.length + sentence.length + 1 > maxChars &&
      currentChunk.length > 0
    ) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex++,
        tokenCount: Math.ceil(currentChunk.length / charPerToken),
      });

      // Create overlap from end of previous chunk
      const words = currentChunk.split(" ");
      const overlapWords: string[] = [];
      let overlapLen = 0;

      for (let j = words.length - 1; j >= 0 && overlapLen < overlapChars; j--) {
        overlapWords.unshift(words[j]);
        overlapLen += words[j].length + 1;
      }

      currentChunk = overlapWords.join(" ") + " ";
    }

    currentChunk += sentence + " ";
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      tokenCount: Math.ceil(currentChunk.length / charPerToken),
    });
  }

  return chunks;
}

/**
 * Estimates token count for a given text.
 * Uses approximate ratio of 4 characters per token.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
