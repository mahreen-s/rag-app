export interface Document {
  id: string;
  title: string;
  case_number: string;
  case_type: string | null;
  decision_date: string | null;
  content: string;
  chunk_index: number;
  metadata: Record<string, unknown>;
  created_at?: string;
}

export interface DocumentWithSimilarity extends Document {
  similarity: number;
}

export interface QueryResponse {
  answer: string;
  sources: DocumentWithSimilarity[];
}

export interface UploadMetadata {
  title: string;
  case_number: string;
  case_type?: string;
  decision_date?: string;
}

export interface UploadResponse {
  success: boolean;
  chunks_created: number;
  case_number: string;
}

export interface DocumentGroup {
  case_number: string;
  title: string;
  case_type: string | null;
  decision_date: string | null;
  chunk_count: number;
}

export type CaseType =
  | "Fortrinnsrett"
  | "Redusert arbeidstid"
  | "Utdanningspermisjon"
  | "Fleksibel arbeidstid"
  | "Annet";