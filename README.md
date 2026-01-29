# LawAI

AI-drevet søkeapplikasjon for vedtak fra Tvisteløsningsnemnda. Last opp juridiske dokumenter og still spørsmål på naturlig språk — systemet finner relevante avgjørelser og genererer presise svar med kildehenvisninger.

## Teknologi

| | |
|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind CSS v4 |
| **Backend** | Next.js API Routes |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **AI** | OpenAI (gpt-5-mini, text-embedding-3-large) |
| **Lagring** | Supabase Storage |

## Hovedfunksjoner

- **Hybrid søk** — kombinerer semantisk vektorsøk med nøkkelordsøk (Reciprocal Rank Fusion)
- **AI-genererte svar** — svar basert på kontekst fra relevante vedtak, med kildehenvisninger
- **PDF-visning** — se originalvedtaket direkte i applikasjonen
- **Flerfilopplasting** — last opp flere PDF-er samtidig med statussporing per fil
- **Intelligent chunking** — setningsbasert tekstoppdeling med overlapp for bedre kontekst

## Kom i gang

```bash
# Installer avhengigheter
npm install

# Kopier miljøvariabler
cp .env.example .env.local
# Rediger .env.local med dine nøkler

# Start utviklingsserver
npm run dev
```

Applikasjonen kjører på [http://localhost:3000](http://localhost:3000).

## Oppsett

1. Opprett et [Supabase](https://supabase.com)-prosjekt
2. Kjør `supabase-setup.sql` i SQL-editoren
3. Kjør `supabase-hybrid-search.sql` for hybrid søk
4. Opprett en offentlig Storage-bucket kalt `pdfs`
5. Legg til nøkler i `.env.local` (se `.env.example`)

## Dokumentasjon

Se [DOKUMENTASJON.md](DOKUMENTASJON.md) for fullstendig teknisk dokumentasjon.
