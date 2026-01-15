import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { ArchiveOutput, Event } from './types';

function loadArchive(filePath: string): ArchiveOutput {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as ArchiveOutput;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Decode a small set of common dash/hyphen entities before escaping
function decodeKnownEntities(input: string): string {
  return input
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#x2011;/gi, '‑') // non-breaking hyphen
    .replace(/&#x2013;/gi, '–')
    .replace(/&#x2014;/gi, '—');
}

// Unescape common backslash-escaped markdown characters that appear in descriptions
function unescapeCommonMarkdown(input: string): string {
  return input
    .replace(/\\-/g, '-')
    .replace(/\\\|/g, '|')
    .replace(/\\\*/g, '*')
    .replace(/\\_/g, '_')
    .replace(/\\~/g, '~')
    .replace(/\\`/g, '`')
    .replace(/\\/g, '\\');
}

function renderMarkdown(md: string): string {
  const decoded = decodeKnownEntities(md);
  const unescaped = unescapeCommonMarkdown(decoded);
  const html = marked.parse(unescaped, { breaks: true });
  return sanitizeHtml(html, {
    allowedTags: [
      'h1','h2','h3','h4','h5','h6',
      'p','br','hr','strong','em','b','i','u','blockquote',
      'ul','ol','li',
      'code','pre',
      'a'
    ],
    allowedAttributes: {
      a: ['href','title','target','rel'],
      code: ['class']
    },
    allowedSchemes: ['http','https','mailto'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        }
      })
    }
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderEventCard(ev: Event): string {
  const rsvpCount = ev.rsvps?.totalCount ?? 0;
  const hosts = ev.eventHosts?.map((h) => escapeHtml(h.name)).join(', ') || 'N/A';
  const title = escapeHtml(ev.title);
  const description = ev.description
    ? renderMarkdown(ev.description)
    : 'No description provided.';
  const date = formatDate(ev.dateTime);
  // Check if the baseUrl is already a data URI (embedded image) or a regular URL
  const photo = ev.featuredEventPhoto?.baseUrl
    ? (ev.featuredEventPhoto.baseUrl.startsWith('data:')
        ? ev.featuredEventPhoto.baseUrl
        : `${ev.featuredEventPhoto.baseUrl}${ev.featuredEventPhoto.id}/676x380.jpg`)
    : null;
  const eventId = `event-${ev.id}`;

  return `
    <article class="card" id="${eventId}">
      <header>
        <div>
          <p class="eyebrow">${escapeHtml(ev.eventType || 'EVENT')}</p>
          <h2><a href="${ev.eventUrl}" target="_blank" rel="noreferrer">${title}</a></h2>
          <p class="date">${escapeHtml(date)}</p>
        </div>
        <div class="pill">RSVPs: ${rsvpCount}</div>
      </header>
      ${photo ? `<img class="hero" src="${photo}" alt="${title}" />` : ''}
      <div class="desc">${description}</div>
      <p class="meta">Hosts: ${hosts}</p>
    </article>
  `;
}

function renderIndex(events: Event[]): string {
  const items = events.map(ev => {
    const title = escapeHtml(ev.title);
    const date = formatDate(ev.dateTime);
    const eventId = `event-${ev.id}`;
    return `<li><a href="#${eventId}">${title}</a><span class="index-date">${escapeHtml(date)}</span></li>`;
  }).join('\n        ');
  
  return `
    <nav class="index">
      <h2>Event Index</h2>
      <ol>
        ${items}
      </ol>
    </nav>
  `;
}

function renderHtml(data: ArchiveOutput): string {
  const eventsSorted = [...data.events].sort(
    (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
  );

  const index = renderIndex(eventsSorted);
  const cards = eventsSorted.map(renderEventCard).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meetup Archive - ${escapeHtml(data.metadata.groupName)}</title>
  <style>
    :root {
      --bg: #0b0c10;
      --card: #12141b;
      --text: #e6e9f0;
      --muted: #9aa4b5;
      --accent: #4cc2ff;
      --pill: #1f6feb;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      background: radial-gradient(circle at 20% 20%, rgba(76, 194, 255, 0.08), transparent 35%),
                  radial-gradient(circle at 80% 0%, rgba(255, 99, 146, 0.06), transparent 30%),
                  var(--bg);
      color: var(--text);
      padding: 24px;
    }
    header.page {
      max-width: 1000px;
      margin: 0 auto 24px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .title-block h1 { margin: 0 0 6px 0; }
    .title-block p { margin: 0; color: var(--muted); }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, auto);
      gap: 8px 16px;
      text-align: right;
      color: var(--muted);
      font-size: 14px;
    }
    .stats strong { color: var(--text); }
    main {
      max-width: 1000px;
      margin: 0 auto 48px auto;
      display: grid;
      gap: 16px;
    }
    .card {
      background: var(--card);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 14px;
      padding: 16px 16px 18px 16px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
    }
    .card header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .card h2 { margin: 4px 0 6px 0; font-size: 1.5em; }
    .card h2 a { color: var(--text); text-decoration: none; }
    .card h2 a:hover { color: var(--accent); }
    .eyebrow { margin: 0; color: var(--accent); font-weight: 600; letter-spacing: 0.5px; }
    .date { margin: 0; color: var(--muted); }
    .pill {
      background: var(--pill);
      color: #fff;
      padding: 6px 10px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 13px;
      white-space: nowrap;
    }
    .hero {
      width: 100%;
      border-radius: 12px;
      margin: 12px 0;
      display: block;
    }
    .desc { margin: 8px 0; line-height: 1.5; color: var(--text); }
    .desc h1, .desc h2, .desc h3, .desc h4, .desc h5, .desc h6 {
      font-size: 0.95em;
      margin: 12px 0 8px 0;
      font-weight: 600;
    }
    .desc h1 { font-size: 1em; }
    .desc p { margin: 8px 0; }
    .desc ul, .desc ol { margin: 8px 0; padding-left: 24px; }
    .desc code { background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    .desc pre { background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; overflow-x: auto; }
    .desc a { color: var(--accent); text-decoration: underline; }
    .desc a:hover { color: var(--text); }
    .meta { margin: 8px 0 0 0; color: var(--muted); font-size: 14px; }
    .index {
      max-width: 1000px;
      margin: 0 auto 32px auto;
      background: var(--card);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 14px;
      padding: 20px 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
    }
    .index h2 {
      margin: 0 0 16px 0;
      color: var(--accent);
      font-size: 1.3em;
    }
    .index ol {
      margin: 0;
      padding: 0;
      list-style: none;
      counter-reset: event-counter;
    }
    .index li {
      counter-increment: event-counter;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .index li:last-child { border-bottom: none; }
    .index li::before {
      content: counter(event-counter) ".";
      color: var(--muted);
      font-weight: 600;
      min-width: 32px;
    }
    .index a {
      color: var(--text);
      text-decoration: none;
      flex: 1;
    }
    .index a:hover { color: var(--accent); text-decoration: underline; }
    .index-date {
      color: var(--muted);
      font-size: 13px;
      white-space: nowrap;
    }
    @media (max-width: 700px) {
      header.page { flex-direction: column; align-items: flex-start; }
      .stats { grid-template-columns: repeat(2, auto); text-align: left; }
      .card header { flex-direction: column; align-items: flex-start; }
      .pill { align-self: flex-start; }
    }
  </style>
</head>
<body>
  <header class="page">
    <div class="title-block">
      <h1>Meetup Archive · ${escapeHtml(data.metadata.groupName)}</h1>
      <p>${escapeHtml(data.metadata.groupUrlname)}</p>
    </div>
    <div class="stats">
      <div>Total Events:</div><strong>${data.metadata.totalEvents}</strong>
      <div>Past:</div><strong>${data.metadata.pastEvents}</strong>
      <div>Upcoming:</div><strong>${data.metadata.upcomingEvents}</strong>
      <div>Archived:</div><strong>${escapeHtml(data.metadata.archivedAt)}</strong>
    </div>
  </header>
  ${index}
  <main>
    ${cards}
  </main>
</body>
</html>`;
}

function main(): void {
  const [, , inputPathArg, outputPathArg] = process.argv;
  if (!inputPathArg) {
    console.error('Usage: npm run render -- <input-json> [output-html]');
    process.exit(1);
  }

  const inputPath = path.resolve(inputPathArg);
  const outDir = path.resolve('output-html');
  ensureDir(outDir);

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = outputPathArg
    ? path.resolve(outputPathArg)
    : path.join(outDir, `${baseName}.html`);

  const archive = loadArchive(inputPath);
  const html = renderHtml(archive);
  fs.writeFileSync(outputPath, html, 'utf-8');

  console.log(`HTML written to ${outputPath}`);
}

main();
