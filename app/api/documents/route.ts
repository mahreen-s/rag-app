import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { DocumentGroup } from "@/types";

// Prevent static generation during build
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("case_number, title, case_type, decision_date")
      .order("decision_date", { ascending: false });

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Kunne ikke hente dokumentlisten" },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json([]);
    }

    // Group by case_number
    const grouped = data.reduce(
      (acc: Record<string, DocumentGroup>, doc) => {
        if (!acc[doc.case_number]) {
          acc[doc.case_number] = {
            case_number: doc.case_number,
            title: doc.title,
            case_type: doc.case_type,
            decision_date: doc.decision_date,
            chunk_count: 0,
          };
        }
        acc[doc.case_number].chunk_count++;
        return acc;
      },
      {} as Record<string, DocumentGroup>
    );

    // Sort by decision_date descending
    const result = Object.values(grouped).sort((a, b) => {
      if (!a.decision_date && !b.decision_date) return 0;
      if (!a.decision_date) return 1;
      if (!b.decision_date) return -1;
      return (
        new Date(b.decision_date).getTime() -
        new Date(a.decision_date).getTime()
      );
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Documents list error:", error);
    return NextResponse.json(
      { error: "En feil oppstod ved henting av dokumenter" },
      { status: 500 }
    );
  }
}
