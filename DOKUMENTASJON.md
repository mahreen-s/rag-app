# LawAI - Dokumentasjon

## Innholdsfortegnelse

1. [Introduksjon](#1-introduksjon)
2. [Systemarkitektur](#2-systemarkitektur)
3. [Mappestruktur](#3-mappestruktur)
4. [API-endepunkter](#4-api-endepunkter)
5. [Komponenter](#5-komponenter)
6. [Biblioteker](#6-biblioteker)
7. [Database](#7-database)
8. [Dataflyt](#8-dataflyt)
9. [Konfigurasjon](#9-konfigurasjon)
10. [Installasjon og oppsett](#10-installasjon-og-oppsett)

---

## 1. Introduksjon

### Hva er LawAI?

Applikasjonen lar brukere laste opp vedtak fra Tvisteløsningsnemnda og stille spørsmål på naturlig språk. Systemet bruker RAG-arkitektur (Retrieval-Augmented Generation) for å finne relevante dokumenter og generere presise svar med kildehenvisninger.

### Hovedfunksjoner

- **Dokumentopplasting**: Last opp PDF-filer med vedtak fra Tvisteløsningsnemnda
- **Intelligent søk**: Kombiner semantisk søk (vektorer) med nøkkelordsøk
- **AI-genererte svar**: Få presise svar basert på innholdet i dokumentene
- **Kildehenvisninger**: Se hvilke dokumenter svaret er basert på
- **PDF-visning**: Se originalvedtaket direkte i applikasjonen

### Teknologistabel

| Kategori | Teknologi |
|----------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL + pgvector) |
| AI/ML | OpenAI (gpt-5-mini, text-embedding-3-large) |
| Fillagring | Supabase Storage |
| PDF-parsing | unpdf |

---

## 2. Systemarkitektur

### RAG-arkitektur (Retrieval-Augmented Generation)
Applikasjonen bruker en RAG-arkitektur som kombinerer dokumentgjenfinning med AI-tekstgenerering:

```
┌─────────────────────────────────────────────────────────────────┐
│                         BRUKERGRENSESNITT                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  Søkeside   │    │ Opplasting  │    │   Resultat  │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API-ENDEPUNKTER                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ /api/query  │    │ /api/upload │    │/api/documents│        │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BIBLIOTEKER (lib/)                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   openai    │    │   chunker   │    │    pdf      │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    documents-tabell                      │   │
│  │  • Vektorembeddings (2000 dimensjoner)                  │   │
│  │  • Full-tekst søkeindeks (norsk)                        │   │
│  │  • Hybrid søkefunksjon (RRF)                            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Hybrid søk

Systemet kombinerer to søkemetoder:

1. **Vektorsøk (semantisk)**: Finner dokumenter med lignende betydning
2. **Full-tekst søk (nøkkelord)**: Finner dokumenter med eksakte termer

Resultatene kombineres med **Reciprocal Rank Fusion (RRF)** for rettferdig rangering.

---

## 3. Mappestruktur

```
lawai-rag-case/
├── app/                          # Next.js App Router
│   ├── api/                      # API-endepunkter
│   │   ├── documents/route.ts    # Liste dokumenter
│   │   ├── query/route.ts        # Spørsmål og svar
│   │   └── upload/route.ts       # Dokumentopplasting
│   ├── upload/                   # Opplastingsside
│   │   └── page.tsx
│   ├── globals.css               # Globale stiler
│   ├── layout.tsx                # Rotlayout
│   └── page.tsx                  # Hovedside (søk)
│
├── components/                   # React-komponenter
│   ├── AnswerCard.tsx           # Viser AI-svar
│   ├── FileUpload.tsx           # Dra-og-slipp opplasting
│   ├── Footer.tsx               # Bunntekst
│   ├── Header.tsx               # Navigasjon
│   ├── SearchBox.tsx            # Søkefelt
│   └── SourcesPanel.tsx         # Kildeliste
│
├── lib/                          # Hjelpefunksjoner
│   ├── chunker.ts               # Tekstoppdeling
│   ├── openai.ts                # OpenAI-integrasjon
│   ├── pdf.ts                   # PDF-parsing
│   └── supabase.ts              # Database-klient
│
├── types/                        # TypeScript-typer
│   └── index.ts
│
├── supabase-setup.sql           # Database-oppsett
├── supabase-hybrid-search.sql   # Hybrid søk-oppsett
├── package.json                 # Avhengigheter
└── tsconfig.json                # TypeScript-konfig
```

---

## 4. API-endepunkter

### 4.1 POST /api/upload

Laster opp og behandler PDF-dokumenter.

**Forespørsel:**
```
Content-Type: multipart/form-data
Body: file (PDF-fil)
```

**Behandlingsflyt:**
1. Mottar PDF-fil
2. Parser tekst fra PDF
3. Ekstraherer metadata med AI (tittel, saksnummer, sakstype, dato)
4. Lagrer original-PDF i Supabase Storage (`pdfs`-bucket)
5. Deler teksten i overlappende deler (chunks)
6. Genererer vektorembeddings for hver del
7. Lagrer i Supabase med `pdf_url` i metadata

**Respons:**
```json
{
  "success": true,
  "chunks_created": 12,
  "case_number": "2024/1234"
}
```

**Feilkoder:**
- `400`: Ingen fil lastet opp, eller filen er ikke en PDF
- `500`: Serverfeil under behandling

---

### 4.2 POST /api/query

Besvarer spørsmål basert på opplastede dokumenter.

**Forespørsel:**
```json
{
  "question": "Hva er vilkårene for fortrinnsrett?"
}
```

**Behandlingsflyt:**
1. Genererer embedding for spørsmålet
2. Utfører hybrid søk (vektor + nøkkelord)
3. Deduplikerer resultater (maks 2 deler per sak)
4. Bygger kontekst fra de 6 mest relevante delene
5. Genererer svar med OpenAI
6. Returnerer svar med kildehenvisninger

**Respons:**
```json
{
  "answer": "Vilkårene for fortrinnsrett er...",
  "sources": [
    {
      "id": "uuid",
      "title": "Vedtak om fortrinnsrett",
      "case_number": "2024/1234",
      "case_type": "Fortrinnsrett",
      "decision_date": "2024-01-15",
      "content": "Utdrag fra dokumentet...",
      "chunk_index": 2,
      "similarity": 0.89
    }
  ]
}
```

**Konfigurasjonskonstanter:**
| Konstant | Verdi | Beskrivelse |
|----------|-------|-------------|
| `MAX_CHUNKS_PER_CASE` | 2 | Maks deler per sak |
| `TARGET_CONTEXT_CHUNKS` | 6 | Totalt antall deler i kontekst |
| `INITIAL_FETCH_COUNT` | 15 | Antall deler å hente først |
| `TEXT_SEARCH_WEIGHT` | 0.3 | Vekt for nøkkelordsøk (0-1) |

---

### 4.3 GET /api/documents

Returnerer liste over alle opplastede dokumenter.

**Respons:**
```json
[
  {
    "case_number": "2024/1234",
    "title": "Vedtak om fortrinnsrett",
    "case_type": "Fortrinnsrett",
    "decision_date": "2024-01-15",
    "chunk_count": 12
  }
]
```

---

## 5. Komponenter

### 5.1 Header

**Fil:** `components/Header.tsx`

Navigasjonsbar med glass-effekt som vises øverst på alle sider.

**Funksjoner:**
- LawAI-logo med stilisert tekst
- Navigasjonslenker til Søk og Last opp
- Aktiv lenke-indikator (understrekning)
- Sticky posisjonering ved scrolling

---

### 5.2 SearchBox

**Fil:** `components/SearchBox.tsx`

Søkefelt for å stille spørsmål.

**Props:**
| Prop | Type | Beskrivelse |
|------|------|-------------|
| `onSearch` | `(query: string) => void` | Callback ved søk |
| `isLoading` | `boolean` | Deaktiverer input under søk |

**Funksjoner:**
- Tekstinput med søkeikon
- Send-knapp med lastespinner
- Validering (tom streng forhindres)

---

### 5.3 AnswerCard

**Fil:** `components/AnswerCard.tsx`

Viser AI-generert svar med lastestatus.

**Props:**
| Prop | Type | Beskrivelse |
|------|------|-------------|
| `question` | `string \| null` | Brukerens spørsmål |
| `answer` | `string \| null` | AI-generert svar (markdown) |
| `isLoading` | `boolean` | Viser lastesteg |

**Lastesteg (ThinkingSteps):**
1. "Søker i dokumenter" - Finner relevante avgjørelser
2. "Analyserer relevans" - Rangerer treff
3. "Genererer svar" - Formulerer svar

Stegene animeres sekvensielt med 2,5 sekunders mellomrom.

---

### 5.4 SourcesPanel

**Fil:** `components/SourcesPanel.tsx`

Viser kildeliste med relevanspoeng.

**Props:**
| Prop | Type | Beskrivelse |
|------|------|-------------|
| `sources` | `DocumentWithSimilarity[]` | Kildeliste |
| `isLoading` | `boolean` | Viser skjelettlasting |

**Funksjoner:**
- Fargekodet relevansmerke (grønn >85%, gul >75%, grå <75%)
- Utvidbar innholdsvisning ("Vis mer" / "Vis mindre")
- Saksnummer, type og dato
- Animerte skjelettkort under lasting
- **PDF-visning**: "Se vedtak"-knapp åpner originalvedtaket i en modal med iframe (vises kun når `pdf_url` finnes i metadata)

---

### 5.5 FileUpload

**Fil:** `components/FileUpload.tsx`

Dra-og-slipp filopplaster for PDF-filer.

**Props:**
| Prop | Type | Beskrivelse |
|------|------|-------------|
| `onFileSelect` | `(files: File[]) => void` | Callback ved filvalg |
| `onFileRemove` | `(index: number) => void` | Fjern enkeltfil |
| `isUploading` | `boolean` | Opplastingsstatus |
| `progress` | `number` | Fremdrift (0-100%) |
| `selectedFiles` | `File[]` | Valgte filer |

**Validering:**
- Kun PDF-filer tillatt
- Maksimal filstørrelse: 50 MB

---

### 5.6 Footer

**Fil:** `components/Footer.tsx`

Bunntekst med ansvarsfraskrivelse.

**Innhold:**
- LawAI-merke
- Tekst: "Drevet av AI — ikke juridisk rådgivning"

---

## 6. Biblioteker

### 6.1 lib/supabase.ts

Database-klient for Supabase.

**Eksporterte funksjoner:**

| Funksjon | Beskrivelse |
|----------|-------------|
| `getSupabase()` | Offentlig klient (kun lesing) |
| `getSupabaseAdmin()` | Admin-klient (skriving) |
| `supabase` | Proxy for offentlig klient |
| `supabaseAdmin` | Proxy for admin-klient |

**Miljøvariabler:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SECRET_KEY`

---

### 6.2 lib/openai.ts

OpenAI API-integrasjon.

**Funksjoner:**

#### `generateEmbedding(text: string): Promise<number[]>`

Genererer vektorembedding for tekst.
- **Modell:** text-embedding-3-large
- **Dimensjoner:** 2000
- **Returverdi:** Array med 2000 tall

#### `extractMetadata(text: string): Promise<ExtractedMetadata>`

Ekstraherer metadata fra dokumenttekst.
- **Modell:** gpt-5-mini
- **Returverdi:**
  ```typescript
  {
    title: string,
    case_number: string,
    case_type: string | null,
    decision_date: string | null  // YYYY-MM-DD
  }
  ```

#### `generateAnswer(question: string, context: string): Promise<string>`

Genererer svar basert på kontekst.
- **Modell:** gpt-5-mini
- **Maks tokens:** 2000
- **Systeminstruksjoner:**
  - Svar kun basert på gitt kontekst
  - Referer til spesifikke saksnumre
  - Bruk samme språk som spørsmålet
  - Vær presis og objektiv

---

### 6.3 lib/chunker.ts

Intelligent tekstoppdeling.

**Funksjon:**

```typescript
chunkText(
  text: string,
  targetTokens: number = 1200,
  maxTokens: number = 1500,
  overlapTokens: number = 200
): Chunk[]
```

**Algoritme:**
1. Normaliserer tekst (linjeskift, mellomrom)
2. Deler ved setningsgrenser
3. Bevarer juridiske referanser (§, Rt., etc.)
4. Skaper overlappende deler for kontekst

**Standardverdier:**
| Parameter | Verdi | Beskrivelse |
|-----------|-------|-------------|
| `targetTokens` | 1200 | Målstørrelse per del |
| `maxTokens` | 1500 | Maksimal størrelse |
| `overlapTokens` | 200 | Overlapp mellom deler |

---

### 6.4 lib/pdf.ts

PDF-parsing.

**Funksjon:**

```typescript
parsePDF(buffer: Buffer): Promise<{ text: string, numpages: number }>
```

Bruker `unpdf`-biblioteket for å ekstrahere tekst fra PDF-filer.

---

## 7. Database

### 7.1 Tabellstruktur

**Tabell: `documents`**

| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| `id` | UUID | Unik identifikator |
| `title` | TEXT | Dokumenttittel |
| `case_number` | TEXT | Saksnummer |
| `case_type` | TEXT | Sakstype (valgfri) |
| `decision_date` | DATE | Vedtaksdato (valgfri) |
| `content` | TEXT | Tekstinnhold |
| `chunk_index` | INTEGER | Delnummer |
| `embedding` | VECTOR(2000) | Vektorembedding |
| `fts` | TSVECTOR | Full-tekst søkevektor |
| `metadata` | JSONB | Ekstra metadata (inkl. `pdf_url`) |
| `created_at` | TIMESTAMPTZ | Opprettelsestidspunkt |
| `updated_at` | TIMESTAMPTZ | Sist oppdatert |

### 7.2 Indekser

```sql
idx_documents_case_number        -- Oppslag på saksnummer
idx_documents_case_type          -- Filter på sakstype
idx_documents_decision_date      -- Sortering på dato
idx_documents_embedding          -- HNSW vektorindeks
idx_documents_fts                -- GIN full-tekst indeks
```

### 7.3 Database-funksjoner

#### `match_documents`

Ren vektorsøk-funksjon.

```sql
match_documents(
  query_embedding VECTOR(2000),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5
)
```

#### `hybrid_search`

Kombinert vektor- og nøkkelordsøk.

```sql
hybrid_search(
  query_text TEXT,
  query_embedding VECTOR(2000),
  match_count INT DEFAULT 10,
  text_weight FLOAT DEFAULT 0.3,
  rrf_k INT DEFAULT 60
)
```

**Parametere:**
| Parameter | Standardverdi | Beskrivelse |
|-----------|---------------|-------------|
| `text_weight` | 0.3 | Vekt for nøkkelordsøk (0-1) |
| `rrf_k` | 60 | RRF-konstant for rangering |

**Reciprocal Rank Fusion (RRF):**
```
score = (1 - text_weight) * 1/(k + vector_rank) + text_weight * 1/(k + text_rank)
```

#### `keyword_search`

Ren nøkkelordsøk-funksjon.

```sql
keyword_search(
  query_text TEXT,
  match_count INT DEFAULT 10
)
```

### 7.4 Full-tekst søkekonfigurasjon

Søkevektoren `fts` er konfigurert med vektede felt:

| Vekt | Felt | Beskrivelse |
|------|------|-------------|
| A (høyest) | title, case_number | Tittel og saksnummer |
| B (medium) | case_type | Sakstype |
| C (lavest) | content | Innhold |

Bruker norsk språkbehandling (`'norwegian'`) for korrekt stemming.

---

## 8. Dataflyt

### 8.1 Dokumentopplasting

```
Bruker velger PDF-fil(er)
        │
        ▼
┌─────────────────────────────┐
│   Validering (klient)       │
│   • Kun PDF                 │
│   • Maks 50 MB              │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│   POST /api/upload          │
│   (FormData)                │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│   parsePDF()                │
│   Ekstraher tekst           │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│   extractMetadata()         │
│   AI-ekstraksjon            │
│   • Tittel                  │
│   • Saksnummer              │
│   • Sakstype                │
│   • Vedtaksdato             │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│   Supabase Storage          │
│   Lagre original-PDF        │
│   → pdfs/{saksnummer}.pdf   │
│   → Hent offentlig URL      │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│   chunkText()               │
│   Del i ~1200 tokens        │
│   med 200 tokens overlapp   │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│   generateEmbedding()       │
│   For hver del              │
│   2000-dim vektor           │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│   Supabase INSERT           │
│   Lagre i documents         │
└─────────────────────────────┘
        │
        ▼
Respons: suksess, antall deler, saksnummer
```

### 8.2 Spørsmål og svar

```
Bruker stiller spørsmål
        │
        ▼
┌─────────────────────────────┐
│   POST /api/query           │
│   { question: "..." }       │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│   generateEmbedding()       │
│   Spørsmålsvektor           │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│   hybrid_search()           │
│   Vektor + nøkkelord        │
│   Hent 15 deler             │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│   deduplicateByCase()       │
│   Maks 2 deler per sak      │
│   Totalt 6 deler            │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│   Bygg kontekst             │
│   [Sak X]: innhold          │
│   ---                       │
│   [Sak Y]: innhold          │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│   generateAnswer()          │
│   AI-generert svar          │
└─────────────────────────────┘
        │
        ▼
Respons: svar + kilder
```

---

## 9. Konfigurasjon

### 9.1 Env. variables 

Opprett en `.env.local`-fil i prosjektroten:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[prosjekt].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_[nøkkel]
SUPABASE_SECRET_KEY=sb_secret_[nøkkel]

# OpenAI
OPENAI_API_KEY=sk-proj-[nøkkel]
```

**Merk:**
- `NEXT_PUBLIC_*`-variabler eksponeres til nettleseren
- Andre variabler er kun tilgjengelige på serveren

### 9.2 package.json-skript

| Kommando | Beskrivelse |
|----------|-------------|
| `npm run dev` | Start utviklingsserver |
| `npm run build` | Bygg for produksjon |
| `npm run start` | Start produksjonsserver |
| `npm run lint` | Kjør ESLint |

### 9.3 TypeScript-konfigurasjon

Prosjektet bruker streng TypeScript med følgende innstillinger:
- Streng modus aktivert
- Stialias: `@/*` → `./*`
- JSX: react-jsx
- Mål: ES2017

---

## 10. Installasjon og oppsett

### 10.1 Forutsetninger

- Node.js 18+
- npm eller yarn
- Supabase-konto
- OpenAI API-nøkkel

### 10.2 Lokalt oppsett

```bash
# 1. Klon prosjektet
git clone [repo-url]
cd lawai-rag-case

# 2. Installer avhengigheter
npm install

# 3. Opprett .env.local
cp .env.example .env.local
# Rediger filen med dine nøkler

# 4. Start utviklingsserver
npm run dev
```

### 10.3 Database-oppsett

1. Opprett et nytt Supabase-prosjekt
2. Aktiver pgvector-utvidelsen:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Kjør `supabase-setup.sql` i SQL-editoren
4. Kjør `supabase-hybrid-search.sql` for hybrid søk

### 10.4 Storage-oppsett

1. Gå til Supabase Dashboard → Storage
2. Opprett en ny bucket med navn `pdfs`
3. Sett bucketen som **Public** (offentlig tilgang for lesing)

Opplastede PDF-filer lagres automatisk i denne bucketen og kan vises direkte i applikasjonen via "Se vedtak"-knappen i kildepanelet.

### 10.5 Verifisering

1. Åpne http://localhost:3000
2. Gå til "Last opp" og last opp en PDF
3. Gå tilbake til søk og still et spørsmål
4. Verifiser at du får svar med kilder
5. Klikk "Se vedtak" på en kilde for å se original-PDF

---

## Vedlegg: TypeScript-typer

```typescript
// Grunnleggende dokumenttype
interface Document {
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

// Dokument med likhetspoeng
interface DocumentWithSimilarity extends Document {
  similarity: number;  // 0-1
}

// Svar fra spørring
interface QueryResponse {
  answer: string;
  sources: DocumentWithSimilarity[];
}

// Metadata fra opplasting
interface UploadMetadata {
  title: string;
  case_number: string;
  case_type?: string;
  decision_date?: string;
}

// Svar fra opplasting
interface UploadResponse {
  success: boolean;
  chunks_created: number;
  case_number: string;
}

// Grupperte dokumenter
interface DocumentGroup {
  case_number: string;
  title: string;
  case_type: string | null;
  decision_date: string | null;
  chunk_count: number;
}

// Sakstyper
export type CaseType =
  | "Fortrinnsrett"
  | "Redusert arbeidstid"
  | "Utdanningspermisjon"
  | "Fleksibel arbeidstid"
  | "Annet";
```

---

## Feilsøking

### Vanlige problemer

**Problem:** "Kunne ikke søke i dokumentene"
- **Årsak:** Database-funksjoner mangler
- **Løsning:** Kjør SQL-oppsettfilene i Supabase

**Problem:** "Beklager, jeg fant ingen relevante dokumenter"
- **Årsak:** Ingen dokumenter er lastet opp, eller spørsmålet matcher ikke
- **Løsning:** Last opp relevante dokumenter først

**Problem:** Opplasting feiler
- **Årsak:** Ugyldig PDF eller manglende API-nøkler
- **Løsning:** Sjekk at filen er en gyldig PDF og at miljøvariabler er satt

**Problem:** Svar tar lang tid
- **Årsak:** AI-generering tar tid
- **Løsning:** Normal ventetid er 5-15 sekunder

---

*Sist oppdatert: Januar 2026*
