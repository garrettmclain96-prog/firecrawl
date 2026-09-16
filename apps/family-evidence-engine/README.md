# 🔥 Family Evidence Engine

An evidence-first genealogy, probate, land and mineral research layer built on Firecrawl.

The goal is not another family-tree website. The goal is a repeatable proof system:

**person → relationship → primary record → tract/legal description → conveyance/probate/partition → mineral reservation or disposition → current status**

## What it does

- Generates high-signal research campaigns from names, aliases, dates, places and record themes.
- Uses Firecrawl Search and captures returned source content.
- Deduplicates evidence deterministically by target + source URL + title.
- Classifies likely probate, deed, mineral, land, obituary, census, cemetery and general records.
- Grades results as Tier 1 lead, Tier 2 corroboration or Tier 3 primary-record candidate.
- Extracts dates, acreage, abstract/survey/section/tract clues, deed book/page and instrument-number clues.
- Flags simple contradictions instead of silently merging conflicting facts.
- Produces a Markdown research report, verification queue and standalone HTML dashboard.
- Uses only Node 20 built-ins at runtime.

## Evidence rule

**Crawler output is never automatically promoted to fact.**

Tier 1 = lead/search discovery.  
Tier 2 = corroborating/secondary evidence.  
Tier 3 = primary-record candidate from an official/record-like source.

Even Tier 3 remains `unverified` until a researcher checks the underlying record and confirms identity, date, jurisdiction and context.

## Privacy

This Firecrawl fork is public. Do **not** commit living-family information, private addresses, emails, case notes or claim-sensitive files here.

`data/targets.private.json` is git-ignored. Use it for living relatives and sensitive proof-chain work.

The committed historical campaign contains only public-source historical research targets.

## Quick start

Requires Node 20+.

```bash
cd apps/family-evidence-engine
cp .env.example .env
# add FIRECRAWL_API_KEY to .env
npm test
npm run queries
npm run research
npm run report
```

Outputs:

- `output/evidence.jsonl` — deduplicated evidence store
- `output/runs.jsonl` — run audit trail
- `output/report.md` — ranked research report + verification queue
- `output/dashboard.html` — standalone visual evidence board

Open `output/dashboard.html` in a browser after a research run.

## Private target file

```bash
cp data/targets.private.example.json data/targets.private.json
```

Edit it locally, then run:

```bash
npm run research -- --targets data/targets.private.json
npm run report -- --targets data/targets.private.json
```

## Historical McClung starter campaign

The committed starter campaign targets two high-value historical estate questions:

1. **Nathaniel M. McClung (d. 15 May 1915)** — probate/estate packet, heirs/children, obituary/probate notices, land/deed/partition references.
2. **Joseph Sidney/Sydney McClung (d. 23 Dec 1932)** — probate/estate packet, heirs/children, obituary/legal notices, and land-description tracing.

The engine deliberately searches spelling and indexing variants.

## Why tract-first searching matters

Once a legal description is discovered, the research unit changes from a surname to the land itself. `buildDescriptionQueries()` produces exact-description searches plus deed, mineral, royalty and partition terms. This lets the investigation continue after the family surname disappears from later instruments.

## Architecture

```text
targets JSON
   │
   ▼
query builder
   │
   ▼
Firecrawl Search
   │
   ▼
normalizer → classifier → clue extractor → contradiction flags
   │
   ▼
JSONL evidence store
   ├── report.md
   └── dashboard.html
```

## Cost control

`FAMILY_MAX_QUERIES_PER_TARGET` and `FAMILY_SEARCH_LIMIT` cap breadth. Start small, inspect hit quality, then expand. High-volume crawling should be source-targeted instead of blindly crawling entire government domains.

## Production roadmap

The MVP intentionally uses local JSONL storage to remain portable and dependency-free. The clean scale path is:

1. Supabase/Postgres tables for people, relationships, assertions, evidence, instruments and tracts.
2. Source/document hashing for provenance and chain-of-custody.
3. Page-level PDF/document citations.
4. Identity-resolution scoring across names, dates, places and relatives.
5. A tract graph connecting grantor → grantee → estate → partition → mineral reservations.
6. Scheduled re-crawl/watch jobs for newly indexed records.
