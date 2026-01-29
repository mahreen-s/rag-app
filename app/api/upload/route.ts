import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getSupabaseAdmin } from "@/lib/supabase";
import { generateEmbedding, extractMetadata } from "@/lib/openai";
import { chunkText } from "@/lib/chunker";
import { parsePDF } from "@/lib/pdf";

// Prevent static generation during build
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Ingen fil lastet opp" }, { status: 400 });
    }

    // Parse PDF
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await parsePDF(buffer);
    const text = pdfData.text;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Kunne ikke trekke ut tekst fra PDF" },
        { status: 400 }
      );
    }

    // Extract metadata automatically using AI
    const metadata = await extractMetadata(text);

    // Upload original PDF to Supabase Storage
    let pdfUrl: string | null = null;
    const sanitizedCaseNumber = metadata.case_number.replace(/\//g, "-");
    const storagePath = `${sanitizedCaseNumber}.pdf`;

    const { error: storageError } = await getSupabaseAdmin()
      .storage.from("pdfs")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (storageError) {
      console.error("Storage upload error:", storageError);
      // Non-fatal: continue without PDF URL
    } else {
      const { data: urlData } = getSupabaseAdmin()
        .storage.from("pdfs")
        .getPublicUrl(storagePath);
      pdfUrl = urlData.publicUrl;
    }

    // Chunk text
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "Ingen tekstinnhold funnet i dokumentet" },
        { status: 400 }
      );
    }

    // Generate embeddings and prepare documents
    const documents = [];

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.content);

      documents.push({
        title: metadata.title,
        case_number: metadata.case_number,
        case_type: metadata.case_type || null,
        decision_date: metadata.decision_date || null,
        content: chunk.content,
        chunk_index: chunk.index,
        embedding,
        metadata: {
          filename: file.name,
          total_chunks: chunks.length,
          token_count: chunk.tokenCount,
          ...(pdfUrl && { pdf_url: pdfUrl }),
        },
      });
    }

    // Insert into Supabase
    const { error } = await supabaseAdmin.from("documents").insert(documents);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Kunne ikke lagre dokumentet i databasen" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      chunks_created: chunks.length,
      case_number: metadata.case_number,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "En feil oppstod under opplasting av dokumentet" },
      { status: 500 }
    );
  }
}
