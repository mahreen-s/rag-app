import OpenAI from "openai";

// Lazy initialization to avoid errors during build time
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing OPENAI_API_KEY environment variable. " +
          "Please check your .env.local file."
      );
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
    dimensions: 2000, // Max supported by pgvector HNSW index
  });
  return response.data[0].embedding;
}

export interface ExtractedMetadata {
  title: string;
  case_number: string;
  case_type: string | null;
  decision_date: string | null;
}

export async function extractMetadata(text: string): Promise<ExtractedMetadata> {
  const openai = getOpenAI();
  // Use first ~3000 chars which typically contains the header info
  const headerText = text.substring(0, 3000);

  const response = await openai.responses.create({
    model: "gpt-5-mini",
    instructions: `Du er en ekspert på å analysere juridiske dokumenter fra Tvisteløsningsnemnda i Norge.

Ekstraher følgende informasjon fra dokumentet:
- title: En kort beskrivende tittel for saken (f.eks. "Avgjørelse om fortrinnsrett til utvidet stilling")
- case_number: Saksnummeret (VEDTAK NR XX/XX)
- case_type: Type sak (f.eks. "Fortrinnsrett", "Redusert arbeidstid", "Utdanningspermisjon", etc.)
- decision_date: Dato for avgjørelsen i format YYYY-MM-DD

Returner BARE et JSON-objekt uten markdown formatering.`,
    input: `Ekstraher metadata fra følgende dokument og returner som JSON:\n\n${headerText}`,
    text: { format: { type: "json_object" } },
  });

  const content = response.output_text || "{}";
  const parsed = JSON.parse(content);

  return {
    title: parsed.title || "",
    case_number: parsed.case_number || "",
    case_type: parsed.case_type || null,
    decision_date: parsed.decision_date || null,
  };
}

export async function generateAnswer(
  question: string,
  context: string
): Promise<string> {
  const openai = getOpenAI();
  const response = await openai.responses.create({
    model: "gpt-5-mini",
    instructions: `Du er en juridisk forskningsassistent som spesialiserer seg på norsk arbeidsrett og avgjørelser fra Tvisteløsningsnemnda.

Retningslinjer:
- Svar kun basert på konteksten som er gitt
- Hvis konteksten ikke inneholder relevant informasjon, si dette tydelig
- Referer til spesifikke saksnummer når du siterer kilder
- Svar på samme språk som spørsmålet
- Vær presis og objektiv i dine svar
- Unngå å spekulere utover det som står i kildene`,
    input: `Kontekst fra relevante avgjørelser:\n\n${context}\n\nSpørsmål: ${question}`,
    max_output_tokens: 2000,
  });

  return response.output_text || "";
}
