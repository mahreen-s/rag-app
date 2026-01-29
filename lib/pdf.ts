import { extractText } from "unpdf";

interface PDFData {
  text: string;
  numpages: number;
}

export async function parsePDF(buffer: Buffer): Promise<PDFData> {
  const uint8Array = new Uint8Array(buffer);
  const result = await extractText(uint8Array, { mergePages: true });

  // text can be a string or array depending on mergePages option
  const text = Array.isArray(result.text)
    ? result.text.join("\n")
    : String(result.text || "");

  return {
    text,
    numpages: result.totalPages,
  };
}
