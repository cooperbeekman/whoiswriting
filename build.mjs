#!/usr/bin/env node
/* ──────────────────────────────────────────────────────────────────────────
   whoiswriting — static page generator

   Pulls every public broadcast from Kit (ConvertKit) and writes a real,
   shareable HTML page per article at /p/<slug>/index.html — each with its
   own <title>, Open Graph / Twitter preview tags, canonical URL and
   JSON-LD, styled to match the receipt reader on the home page.

   Also writes sitemap.xml + robots.txt, and persists slugs.json so a
   shared link for a given article never changes across rebuilds.

   Zero dependencies. Requires Node 18+ (global fetch).
   Run:  node build.mjs
   ────────────────────────────────────────────────────────────────────────── */

import { writeFile, mkdir, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE = "https://coleryan.co";
const KIT_API_KEY = process.env.KIT_API_KEY || "kit_e7c4221f7f3235265c45a327c301f926";
const OUT_DIR = join(ROOT, "p");
const SLUGS_FILE = join(ROOT, "slugs.json");

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function slugify(s) {
  return (s || "")
    .toString()
    .normalize("NFKD")
    .replace(/[‘’“”]/g, "") // smart quotes
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

function escapeHtml(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeEntities(s) {
  const named = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&nbsp;": " ",
    "&mdash;": "—", "&ndash;": "–", "&hellip;": "…",
    "&rsquo;": "’", "&lsquo;": "‘", "&ldquo;": "“", "&rdquo;": "”",
  };
  return (s || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&[a-z]+;/gi, (m) => named[m.toLowerCase()] ?? m)
    .replace(/[​-‍﻿]/g, ""); // zero-width chars
}

function stripTags(html) {
  return decodeEntities(
    (html || "")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/* ── Fetch every broadcast (cursor pagination) ───────────────────────────── */

async function fetchAllBroadcasts() {
  const out = [];
  let cursor = null;
  for (let guard = 0; guard < 50; guard++) {
    const url = new URL("https://api.kit.com/v4/broadcasts");
    url.searchParams.set("per_page", "100");
    if (cursor) url.searchParams.set("after", cursor);
    const res = await fetch(url, {
      headers: { "X-Kit-Api-Key": KIT_API_KEY, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Kit API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    out.push(...(data.broadcasts || []));
    const pg = data.pagination || {};
    if (pg.has_next_page && pg.end_cursor) cursor = pg.end_cursor;
    else break;
  }
  return out;
}

/* ── Stable slug map ─────────────────────────────────────────────────────── */

async function loadSlugMap() {
  if (!existsSync(SLUGS_FILE)) return {};
  try {
    return JSON.parse(await readFile(SLUGS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function assignSlugs(articles, map) {
  // map: { [id]: slug }. Keep existing assignments stable; only mint new ones.
  const used = new Set(Object.values(map));
  for (const a of articles) {
    const id = String(a.id);
    if (map[id]) continue;
    let base = slugify(a.subject) || `article-${id}`;
    let slug = base;
    let n = 2;
    while (used.has(slug)) slug = `${base}-${n++}`;
    map[id] = slug;
    used.add(slug);
  }
  return map;
}

/* ── Page template ───────────────────────────────────────────────────────── */

function pageHtml(a, slug) {
  const subject = (a.subject || "Untitled").trim();
  const title = escapeHtml(subject);
  const url = `${SITE}/p/${slug}/`;
  const desc = escapeHtml(
    (a.preview_text && a.preview_text.trim()) ||
      (a.description && a.description.trim()) ||
      stripTags(a.content).slice(0, 155) ||
      "Essays & Writing by Cole Ryan."
  );
  const image = a.thumbnail_url || `${SITE}/og.png`;
  const dateHuman = fmtDate(a.published_at);
  const iso = a.published_at || "";
  const content = a.content || a.description || "<p>No content available.</p>";

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: subject,
    datePublished: iso,
    dateModified: iso,
    author: { "@type": "Person", name: "Cole Ryan" },
    publisher: { "@type": "Person", name: "Cole Ryan" },
    mainEntityOfPage: url,
    url,
    image,
    description:
      (a.preview_text && a.preview_text.trim()) ||
      stripTags(a.content).slice(0, 200) ||
      "Essays & Writing by Cole Ryan.",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — whoiswriting</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=3">
<link rel="shortcut icon" href="/favicon.ico?v=3">
<link rel="apple-touch-icon" href="/favicon.png?v=3">
<meta property="og:site_name" content="whoiswriting">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="article">
${iso ? `<meta property="article:published_time" content="${iso}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${image}">
<script type="application/ld+json">${jsonLd}</script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{background:linear-gradient(180deg,#faf7f0 0%,#f5f0e6 100%);min-height:100vh;font-family:'Courier New',Courier,monospace;color:#1a1a1a;-webkit-font-smoothing:antialiased}
.paper{max-width:700px;margin:0 auto;padding:60px 60px 140px;min-height:100vh}
.nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:40px}
.nav a,.nav button{font-family:'Courier New',monospace;font-size:13px;color:#999;letter-spacing:.06em;text-decoration:none;cursor:pointer;border:none;background:none;padding:0}
.nav a:hover,.nav button:hover{color:#555}
h1{font-size:24px;font-weight:700;line-height:1.35;margin-bottom:10px;color:#0a0a0a}
.meta{font-size:12px;color:#777;margin-bottom:36px;letter-spacing:.04em}
.body{font-size:15px;line-height:1.85;color:#1a1a1a;letter-spacing:-.03em;font-weight:500;-webkit-text-stroke:.2px #1a1a1a}
.body p{margin-bottom:1.4em}
.body a{color:#111;text-decoration:underline;text-underline-offset:3px}
.body img{max-width:100%;height:auto;margin:1.5em 0}
.body h2,.body h3{font-size:16px;font-weight:700;margin:2em 0 .8em;color:#0a0a0a;text-transform:uppercase;letter-spacing:.06em}
.body blockquote{border-left:2px solid #ddd;margin:1.5em 0;padding-left:20px;color:#555;font-style:italic}
.body table{max-width:100%}
.sub{margin-top:60px;padding-top:40px}
.sub-line{height:1px;background:#ddd8d0;margin-bottom:32px}
.sub-label{font-size:15px;color:#555;margin-bottom:24px;text-align:center;letter-spacing:.02em}
.sub-field{max-width:420px;margin:0 auto 16px}
.sub-field label{font-size:11px;color:#999;letter-spacing:.08em;display:block;margin-bottom:4px}
.sub-field input{display:block;width:100%;background:transparent;border:none;border-bottom:1.5px solid #c5c0b8;padding:8px 0;font-family:'Courier New',monospace;font-size:14px;color:#1a1a1a;outline:none}
.sub-field input:focus{border-bottom-color:#1a1a1a}
.sub-btn{display:block;margin:20px auto 0;background:#1a1a1a;color:#f5f1ea;border:none;padding:12px 32px;font-family:'Courier New',monospace;font-size:12px;letter-spacing:.1em;cursor:pointer}
.sub-btn:hover{background:#333}
.sub-msg{text-align:center;font-size:13px;margin-top:14px}
.copied{color:#2d7a4a}
@media (max-width:600px){.paper{padding:40px 24px 100px}.body{font-size:16px}}
</style>
</head>
<body>
<article class="paper">
  <nav class="nav">
    <a href="/">&larr; whoiswriting</a>
    <button id="shareBtn" onclick="copyLink()">COPY LINK</button>
  </nav>
  <h1>${title}</h1>
  <div class="meta">${escapeHtml(dateHuman)}</div>
  <div class="body">${content}</div>
  <div class="sub">
    <div class="sub-line"></div>
    <p class="sub-label">Subscribe for more</p>
    <form id="subForm" onsubmit="return submitSub(event)">
      <div class="sub-field"><label>NAME</label><input type="text" id="subName"></div>
      <div class="sub-field"><label>EMAIL</label><input type="email" id="subEmail" required></div>
      <button type="submit" id="subBtn" class="sub-btn">SUBSCRIBE</button>
    </form>
    <div class="sub-msg" id="subMsg"></div>
  </div>
</article>
<script>
"use strict";
function copyLink(){
  var btn=document.getElementById("shareBtn");
  navigator.clipboard.writeText(${JSON.stringify(url)}).then(function(){
    btn.textContent="\\u2713 COPIED";btn.classList.add("copied");
    setTimeout(function(){btn.textContent="COPY LINK";btn.classList.remove("copied");},1800);
  }).catch(function(){
    btn.textContent=${JSON.stringify(url)};
  });
}
function submitSub(e){
  e.preventDefault();
  var email=document.getElementById("subEmail").value;
  var name=document.getElementById("subName").value;
  var btn=document.getElementById("subBtn");
  var msg=document.getElementById("subMsg");
  btn.textContent="...";
  var body={email_address:email};
  if(name)body.first_name=name;
  fetch("https://api.kit.com/v4/subscribers",{
    method:"POST",
    headers:{"X-Kit-Api-Key":"kit_e7c4221f7f3235265c45a327c301f926","Content-Type":"application/json"},
    body:JSON.stringify(body)
  }).then(function(r){
    if(r.ok||r.status===200||r.status===201){
      document.getElementById("subForm").style.display="none";
      msg.textContent="\\u2713 You\\u2019re in. Welcome.";msg.style.color="#2d7a4a";
    }else{msg.textContent="Something went wrong.";msg.style.color="#c44";btn.textContent="SUBSCRIBE";}
  }).catch(function(){msg.textContent="Network error.";msg.style.color="#c44";btn.textContent="SUBSCRIBE";});
  return false;
}
</script>
</body>
</html>
`;
}

/* ── Sitemap ─────────────────────────────────────────────────────────────── */

function sitemapXml(entries) {
  const urls = [
    `  <url><loc>${SITE}/</loc><changefreq>weekly</changefreq></url>`,
    ...entries.map(
      (e) =>
        `  <url><loc>${SITE}/p/${e.slug}/</loc>${
          e.published_at ? `<lastmod>${e.published_at.slice(0, 10)}</lastmod>` : ""
        }<changefreq>monthly</changefreq></url>`
    ),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

/* ── Main ────────────────────────────────────────────────────────────────── */

async function main() {
  console.log("Fetching broadcasts from Kit…");
  const all = await fetchAllBroadcasts();
  const articles = all
    .filter((b) => b.public && b.published_at)
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  console.log(`  ${all.length} total, ${articles.length} public & published.`);

  const slugMap = assignSlugs(articles, await loadSlugMap());
  await writeFile(SLUGS_FILE, JSON.stringify(slugMap, null, 2) + "\n");

  // Clean & rebuild /p
  if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const entries = [];
  for (const a of articles) {
    const slug = slugMap[String(a.id)];
    const dir = join(OUT_DIR, slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), pageHtml(a, slug));
    entries.push({ slug, published_at: a.published_at });
  }

  await writeFile(join(ROOT, "sitemap.xml"), sitemapXml(entries));
  await writeFile(
    join(ROOT, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`
  );

  console.log(`Wrote ${entries.length} article pages to /p, plus sitemap.xml & robots.txt.`);
  if (entries[0]) console.log(`Latest: ${SITE}/p/${entries[0].slug}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
