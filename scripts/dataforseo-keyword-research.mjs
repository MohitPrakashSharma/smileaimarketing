// SEO keyword research pull from DataForSEO for Smile AI Marketing (dental
// clinic marketing agency). Run with:
//   node --env-file=.env.local scripts/dataforseo-keyword-research.mjs
//
// Writes seo/keyword-research.csv (full raw pull) and
// seo/keyword-research-top-picks.csv (best 5 per topic, ranked by
// volume/difficulty) for use in the content plan sheet.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const LOGIN = process.env.DATAFORSEO_LOGIN;
const PASSWORD = process.env.DATAFORSEO_PASSWORD;

if (!LOGIN || !PASSWORD) {
  console.error("Missing DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD env vars.");
  process.exit(1);
}

const AUTH = Buffer.from(`${LOGIN}:${PASSWORD}`).toString("base64");
const LOCATION_CODE = 2840; // United States
const LANGUAGE_CODE = "en";
const RESULTS_PER_SEED = 20;

// topic -> seed keywords. Covers the homepage plus likely future pages, so
// this research doubles as the site's content plan.
const TOPICS = [
  { type: "page", slug: "home", seeds: ["dental marketing", "dental marketing agency", "marketing for dentists"] },
  { type: "page", slug: "local-seo", seeds: ["dental SEO", "local SEO for dentists", "dentist Google Business Profile"] },
  { type: "page", slug: "patient-generation", seeds: ["dental patient acquisition", "how to get more dental patients", "dental leads"] },
  { type: "page", slug: "website-design", seeds: ["dental website design", "dentist website company"] },
  { type: "page", slug: "paid-ads", seeds: ["dental google ads", "dentist ppc marketing", "dental facebook ads"] },
  { type: "page", slug: "reputation", seeds: ["dental reviews management", "increase dental office reviews"] },
  { type: "page", slug: "pricing-services", seeds: ["dental marketing services", "dental marketing packages"] },
  { type: "page", slug: "about", seeds: ["dental marketing company", "dental marketing consultant"] },
  { type: "competitor-term", slug: "ai-angle", seeds: ["AI marketing for dentists", "AI for dental practices"] },
];

async function fetchKeywordSuggestions(seed) {
  const res = await fetch("https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live", {
    method: "POST",
    headers: {
      Authorization: `Basic ${AUTH}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        keyword: seed,
        location_code: LOCATION_CODE,
        language_code: LANGUAGE_CODE,
        limit: RESULTS_PER_SEED,
        include_seed_keyword: true,
        order_by: ["keyword_info.search_volume,desc"],
      },
    ]),
  });

  const json = await res.json();
  if (json.status_code !== 20000) {
    throw new Error(`DataForSEO error: ${json.status_code} ${json.status_message}`);
  }
  const task = json.tasks?.[0];
  if (task.status_code !== 20000) {
    throw new Error(`Task error: ${task.status_code} ${task.status_message}`);
  }
  return { items: task.result?.[0]?.items ?? [], cost: task.cost ?? 0 };
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function main() {
  const header = ["topic_type", "topic_slug", "matched_seed", "keyword", "search_volume", "cpc_usd", "competition_level", "keyword_difficulty", "search_intent"];
  const rows = [header];
  let totalCost = 0;

  for (const topic of TOPICS) {
    const seenKeywords = new Set();
    for (const seed of topic.seeds) {
      console.log(`Fetching suggestions for ${topic.type}/${topic.slug} <- "${seed}" ...`);
      let items;
      try {
        const result = await fetchKeywordSuggestions(seed);
        items = result.items;
        totalCost += result.cost;
      } catch (err) {
        console.error(`  Failed: ${err.message}`);
        continue;
      }

      for (const item of items) {
        if (item.keyword_properties?.is_another_language) continue;
        if (seenKeywords.has(item.keyword)) continue;
        seenKeywords.add(item.keyword);
        rows.push([
          topic.type,
          topic.slug,
          seed,
          item.keyword,
          item.keyword_info?.search_volume ?? "",
          item.keyword_info?.cpc ?? "",
          item.keyword_info?.competition_level ?? "",
          item.keyword_properties?.keyword_difficulty ?? "",
          item.search_intent_info?.main_intent ?? "",
        ]);
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  console.log(`\nTotal DataForSEO cost: $${totalCost.toFixed(4)}`);

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const outDir = path.join(process.cwd(), "seo");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "keyword-research.csv");
  await writeFile(outPath, csv, "utf8");
  console.log(`Wrote ${rows.length - 1} keyword rows to ${outPath}`);

  const byTopic = new Map();
  for (const row of rows.slice(1)) {
    const [topic_type, topic_slug, , keyword, search_volume, cpc_usd, competition_level, keyword_difficulty, search_intent] = row;
    const key = `${topic_type}/${topic_slug}`;
    if (!byTopic.has(key)) byTopic.set(key, []);
    byTopic.get(key).push({
      keyword,
      volume: Number(search_volume) || 0,
      cpc: cpc_usd,
      competition: competition_level,
      difficulty: keyword_difficulty === "" ? 50 : Number(keyword_difficulty),
      intent: search_intent,
    });
  }

  const summaryRows = [
    ["topic_type", "topic_slug", "recommended_keyword", "search_volume", "cpc_usd", "competition_level", "keyword_difficulty", "search_intent"],
  ];
  for (const [key, keywords] of byTopic) {
    const [topic_type, topic_slug] = key.split("/");
    const score = (k) => k.volume / (k.difficulty + 10);
    const ranked = keywords
      .filter((k) => k.volume > 0)
      .sort((a, b) => score(b) - score(a))
      .slice(0, 6);
    for (const k of ranked) {
      summaryRows.push([topic_type, topic_slug, k.keyword, k.volume, k.cpc, k.competition, k.difficulty, k.intent]);
    }
  }
  const summaryCsv = summaryRows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const summaryPath = path.join(outDir, "keyword-research-top-picks.csv");
  await writeFile(summaryPath, summaryCsv, "utf8");
  console.log(`Wrote ${summaryRows.length - 1} recommended rows to ${summaryPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
