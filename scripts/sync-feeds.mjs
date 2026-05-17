#!/usr/bin/env node
/**
 * Build assets/data/feeds-snapshot.json from _data/stayupdated-feeds.yml
 * Run in GitHub Actions (no browser CORS / no rss2json).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import Parser from 'rss-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const FEEDS_YML = path.join(ROOT, '_data', 'stayupdated-feeds.yml');
const OUT_FILE = path.join(ROOT, 'assets', 'data', 'feeds-snapshot.json');

const MAX_ITEMS_PER_FEED = 10;
const MAX_AGE_DAYS = 7;
const CONCURRENCY = 8;
const FETCH_TIMEOUT_MS = 20000;
const MAX_OG_FETCH = 80;
const OG_FETCH_CONCURRENCY = 5;
const OG_PAGE_TIMEOUT_MS = 9000;

const parser = new Parser({
  timeout: FETCH_TIMEOUT_MS,
  headers: {
    'User-Agent': 'ashizZz-github-io-feed-sync/1.0 (+https://ashizZz.github.io/stay-updated/)',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
  }
});

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidHttpUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function pickMediaUrl(media) {
  if (!media) return null;
  if (Array.isArray(media)) {
    for (const m of media) {
      const url = m?.$?.url || m?.url;
      const type = m?.$?.type || m?.type || '';
      if (url && isValidHttpUrl(url) && (!type || /^image\//i.test(type) || /\.(jpe?g|png|gif|webp|avif)/i.test(url))) {
        return url;
      }
    }
    const first = media[0];
    return first?.$?.url || first?.url || null;
  }
  return media?.$?.url || media?.url || null;
}

function extractRssImage(entry) {
  try {
    const enc = entry.enclosure;
    if (enc?.url && isValidHttpUrl(enc.url)) {
      const type = enc.type || '';
      if (!type || /^image\//i.test(type) || /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(enc.url)) {
        return enc.url;
      }
    }
    const itunes = entry.itunes?.image;
    if (itunes && isValidHttpUrl(itunes)) return itunes;
    const thumb = pickMediaUrl(entry['media:thumbnail']);
    if (thumb && isValidHttpUrl(thumb)) return thumb;
    const content = pickMediaUrl(entry['media:content']);
    if (content && isValidHttpUrl(content) && !/\.mp4(\?|$)/i.test(content)) return content;

    const html = entry['content:encoded'] || entry.content || entry.summary || '';
    const og = html.match(/property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i);
    if (og?.[1] && isValidHttpUrl(og[1])) return og[1];

    const img = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (img?.[1] && isValidHttpUrl(img[1]) && !/pixel|tracking|1x1|spacer|avatar/i.test(img[1])) {
      return img[1];
    }
  } catch {}
  return null;
}

async function fetchOgImageFromPage(pageUrl) {
  if (!isValidHttpUrl(pageUrl)) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), OG_PAGE_TIMEOUT_MS);
    const res = await fetch(pageUrl, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'ashizZz-github-io-feed-sync/1.0',
        Accept: 'text/html,application/xhtml+xml'
      }
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 100000);
    const patterns = [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1] && isValidHttpUrl(m[1])) return m[1];
    }
  } catch {}
  return null;
}

function loadFeeds() {
  const raw = fs.readFileSync(FEEDS_YML, 'utf8');
  const doc = yaml.parse(raw);
  if (!doc?.feeds?.length) {
    throw new Error(`No feeds found in ${FEEDS_YML}`);
  }
  return doc.feeds.map((f) => ({
    name: String(f.name || '').trim(),
    url: String(f.url || '').trim(),
    category: String(f.category || 'other').trim()
  })).filter((f) => f.name && f.url);
}

function normalizeItem(entry, feed, cutoff) {
  const pub = entry.isoDate || entry.pubDate;
  const pubDate = pub ? new Date(pub) : new Date();
  if (Number.isNaN(pubDate.getTime())) return null;
  if (pubDate < cutoff) return null;

  const title = stripHtml(entry.title);
  if (!title) return null;

  const link = entry.link || entry.guid || '';
  const description = stripHtml(
    entry.contentSnippet || entry.summary || entry.content || entry.description || ''
  ).slice(0, 2000);

  const imageUrl = extractRssImage(entry);

  return {
    title,
    link: String(link),
    description,
    guid: entry.guid || entry.id || link || title,
    pubDate: pubDate.toISOString(),
    sourceName: feed.name,
    sourceUrl: feed.url,
    category: feed.category,
    ...(imageUrl ? { imageUrl } : {})
  };
}

async function fetchOneFeed(feed, cutoff) {
  try {
    const rss = await parser.parseURL(feed.url);
    const items = [];
    for (const entry of rss.items || []) {
      const row = normalizeItem(entry, feed, cutoff);
      if (row) items.push(row);
      if (items.length >= MAX_ITEMS_PER_FEED) break;
    }
    return { feed, items, error: null };
  } catch (err) {
    return {
      feed,
      items: [],
      error: err?.message || String(err)
    };
  }
}

async function mapPool(list, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < list.length) {
      const idx = i++;
      results[idx] = await fn(list[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, () => worker()));
  return results;
}

async function enrichOgImages(items) {
  const needs = items.filter((it) => !it.imageUrl && isValidHttpUrl(it.link)).slice(0, MAX_OG_FETCH);
  if (!needs.length) return;

  console.log(`Fetching og:image for up to ${needs.length} articles...`);
  await mapPool(needs, OG_FETCH_CONCURRENCY, async (item) => {
    const og = await fetchOgImageFromPage(item.link);
    if (og) item.imageUrl = og;
  });
  const got = needs.filter((it) => it.imageUrl).length;
  console.log(`  og:image resolved for ${got}/${needs.length} articles`);
}

async function main() {
  const feeds = loadFeeds();
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const generatedAt = new Date().toISOString();

  console.log(`Syncing ${feeds.length} feeds (max ${MAX_ITEMS_PER_FEED} items, ${MAX_AGE_DAYS}d window)...`);

  const results = await mapPool(feeds, CONCURRENCY, (feed) => fetchOneFeed(feed, cutoff));

  const allItems = [];
  const feedErrors = [];

  for (const r of results) {
    if (r.error) {
      feedErrors.push({ name: r.feed.name, url: r.feed.url, error: r.error });
      console.warn(`  ✗ ${r.feed.name}: ${r.error}`);
    } else {
      allItems.push(...r.items);
      console.log(`  ✓ ${r.feed.name}: ${r.items.length} items`);
    }
  }

  allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  await enrichOgImages(allItems);

  const payload = {
    version: 1,
    generatedAt,
    maxItemsPerFeed: MAX_ITEMS_PER_FEED,
    maxAgeDays: MAX_AGE_DAYS,
    feedCount: feeds.length,
    itemCount: allItems.length,
    feedErrors,
    items: allItems
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  const withImg = allItems.filter((it) => it.imageUrl).length;
  console.log(`\nWrote ${allItems.length} items (${withImg} with images, ${feedErrors.length} errors) → ${OUT_FILE}`);
  if (allItems.length === 0) {
    console.error('Warning: snapshot has zero items.');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
