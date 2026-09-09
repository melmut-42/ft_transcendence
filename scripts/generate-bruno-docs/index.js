import fs from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import { discoverCollections } from "./parser.js";

const OUTPUT_DIR = path.resolve(process.env.DOCS_OUTPUT_DIR || "dist/bruno-docs");
const generatedAt = new Date().toISOString();

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/javascript\s*:/gi, "");
}

function markdown(value) {
  return sanitizeHtml(marked.parse(value || "_No documentation was provided._", {
    gfm: true,
    breaks: true,
    headerIds: false,
    mangle: false,
  }));
}

function codeBlock(value, language = "text") {
  if (!value) return "<p class=\"muted\">None documented.</p>";
  return `<pre><code class=\"language-${escapeHtml(language)}\">${escapeHtml(value)}</code></pre>`;
}

function methodBadge(method) {
  const value = escapeHtml(method);
  return `<span class="method method-${String(method).toLowerCase()}">${value}</span>`;
}

function relativeLink(from, to) {
  return path.posix.relative(path.posix.dirname(from), to) || path.posix.basename(to);
}

function pageShell({ title, content, depth, collections, search = true }) {
  const assetPrefix = "../".repeat(depth);
  const homeHref = `${assetPrefix}index.html`;
  const collectionLinks = collections.map((collection) => {
    const href = relativeLink("x/".repeat(depth) + "page.html", `${collection.slug}/index.html`);
    return `<a href="${href}">${escapeHtml(collection.name)}</a>`;
  }).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Generated ft_transcendence Bruno API documentation">
  <title>${escapeHtml(title)} · ft_transcendence API Docs</title>
  <link rel="stylesheet" href="${assetPrefix}assets/styles.css">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="${homeHref}">🚀 ft_transcendence API Docs</a>
    <nav class="topnav"><a href="${homeHref}">🏠 Home</a>${collectionLinks}</nav>
  </header>
  <div class="page-layout">
    <main class="main-content">
      ${search ? `<div class="search-wrap"><label for="docs-search">🔍 Search documentation</label><input id="docs-search" type="search" placeholder="Requests, routes, folders, events…" autocomplete="off"><div id="search-results" class="search-results" hidden></div></div>` : ""}
      ${content}
    </main>
  </div>
  <footer class="footer">📚 Generated automatically by GitHub Actions · ${escapeHtml(generatedAt)} · Source: <code>${escapeHtml(process.env.GITHUB_SHA || "local")}</code></footer>
  ${search ? `<script>window.DOCS_SEARCH_URL = "${assetPrefix}assets/search-index.json";</script><script src="${assetPrefix}assets/search.js"></script>` : ""}
</body>
</html>`;
}

function collectionSummary(collection) {
  const requestCount = collection.requests.length;
  const restCount = collection.requests.filter((request) => request.kind === "http").length;
  const socketCount = requestCount - restCount;
  return `<div class="stat-grid">
    <div class="stat"><strong>${requestCount}</strong><span>Requests</span></div>
    <div class="stat"><strong>${collection.folders.length}</strong><span>Folders</span></div>
    <div class="stat"><strong>${restCount}</strong><span>REST</span></div>
    <div class="stat"><strong>${socketCount}</strong><span>WebSocket</span></div>
  </div>`;
}

function requestCard(request) {
  const marker = request.kind === "http" ? methodBadge(request.method) : "<span class=\"method method-ws\">WS</span>";
  const target = request.kind === "http" ? request.url : request.url;
  return `<a class="request-card" href="../${request.href}">
    <div class="request-card-top">${marker}<span class="request-name">${escapeHtml(request.name)}</span></div>
    <code>${escapeHtml(target)}</code>
    <div class="tag-row">${request.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
  </a>`;
}

function renderCollection(collection, collections) {
  const folders = collection.folders.filter((folder) => folder.path);
  const grouped = new Map();
  for (const request of collection.requests) {
    const key = request.folderPath || "root";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(request);
  }
  const folderSections = [...grouped.entries()].map(([folderPath, requests]) => {
    const folder = folders.find((candidate) => candidate.path === folderPath);
    const heading = folder?.name || (folderPath === "root" ? "📁 Root requests" : folderPath);
    const docs = folder?.docs ? `<div class="folder-docs">${markdown(folder.docs)}</div>` : "";
    return `<section class="folder-section"><h2>${escapeHtml(heading)}</h2>${docs}<div class="request-grid">${requests.map(requestCard).join("")}</div></section>`;
  }).join("");
  const content = `<section class="hero compact"><p class="eyebrow">📚 Collection</p><h1>${escapeHtml(collection.name)}</h1><p class="lead">${collection.kind === "websocket" ? "Real-time room and game communication reference." : "HTTP endpoints, examples, tests, and room lifecycle workflows."}</p><div class="version-pill">🔖 Version ${escapeHtml(collection.version)}</div></section>
    ${collectionSummary(collection)}
    <section class="prose collection-intro">${markdown(collection.docs)}</section>
    ${folderSections || `<section class="empty"><p>No folders were discovered.</p></section>`}`;
  return pageShell({ title: collection.name, content, depth: 1, collections });
}

function detailsTable(items, columns) {
  if (!items.length) return "<p class=\"muted\">None documented.</p>";
  return `<div class="table-scroll"><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${items.map((item) => `<tr>${columns.map((column) => `<td>${column.render(item)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function renderHttpRequest(request) {
  const auth = request.headers.some((header) => header.name.toLowerCase() === "x-session-id")
    ? "🔐 Protected request · uses the runtime `X-Session-Id` value"
    : "🌍 No session header is required by this request";
  const examples = request.examples.map((example) => `<details class="example"><summary><span class="status status-${String(example.status).charAt(0)}xx">${escapeHtml(example.status)}</span> ${escapeHtml(example.name)}</summary><div class="example-body">${example.headers.length ? detailsTable(example.headers, [{ label: "Header", render: (item) => `<code>${escapeHtml(item.name)}</code>` }, { label: "Value", render: (item) => `<code>${escapeHtml(item.value)}</code>` }]) : ""}${codeBlock(example.body, "json")}</div></details>`).join("");
  const scripts = request.scripts.map((script) => `<details class="script"><summary>🧪 ${escapeHtml(script.type)} script</summary>${codeBlock(script.code, "javascript")}</details>`).join("");
  return `<div class="endpoint-banner">${methodBadge(request.method)} <code>${escapeHtml(request.url)}</code></div>
    <div class="callout">${escapeHtml(auth)}</div>
    <section class="request-section"><h2>📍 Request details</h2>${detailsTable(request.params, [{ label: "Parameter", render: (item) => `<code>${escapeHtml(item.name)}</code>` }, { label: "Type", render: (item) => escapeHtml(item.type || "—") }, { label: "Value", render: (item) => `<code>${escapeHtml(item.value || "—")}</code>` }])}${detailsTable(request.headers, [{ label: "Header", render: (item) => `<code>${escapeHtml(item.name)}</code>` }, { label: "Value", render: (item) => `<code>${escapeHtml(item.value)}</code>` }])}</section>
    <section class="request-section"><h2>📥 Request body</h2>${request.body ? codeBlock(request.body.data, request.body.type || "text") : "<p class=\"muted\">No request body.</p>"}</section>
    <section class="request-section"><h2>📤 Response examples</h2>${examples || "<p class=\"muted\">No native response examples.</p>"}</section>
    ${scripts ? `<section class="request-section"><h2>🧪 Runtime scripts and tests</h2>${scripts}</section>` : ""}`;
}

function renderWebSocketRequest(request) {
  const messages = request.messages.map((message) => `<details class="example"><summary>📥 ${escapeHtml(message.title || "Message")}</summary><p class="muted">Type: ${escapeHtml(message.type || "text")} · ${message.selected ? "enabled" : "disabled by default"}</p>${codeBlock(message.data, message.type === "json" ? "json" : "text")}</details>`).join("");
  return `<div class="endpoint-banner"><span class="method method-ws">WS</span> <code>${escapeHtml(request.url)}</code></div>
    <div class="callout">🔐 WebSocket authentication is carried in the <code>session_id</code> query parameter. It is separate from REST's <code>X-Session-Id</code> header.</div>
    <section class="request-section"><h2>🔌 Connection and messages</h2>${messages || "<p class=\"muted\">This request sends no outgoing message; use it as a connection or observation point.</p>"}</section>
    <section class="request-section"><h2>⚙️ Socket settings</h2>${detailsTable(Object.entries(request.settings).map(([name, value]) => ({ name, value })), [{ label: "Setting", render: (item) => `<code>${escapeHtml(item.name)}</code>` }, { label: "Value", render: (item) => escapeHtml(item.value) }])}</section>`;
}

function renderRequest(request, collection, collections) {
  const content = `<section class="hero compact"><p class="eyebrow">${request.kind === "http" ? "🌐 REST request" : "⚡ WebSocket request"}</p><h1>${escapeHtml(request.name)}</h1><div class="tag-row">${request.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div></section>
    <article class="prose request-docs">${markdown(request.docs)}</article>
    ${request.kind === "http" ? renderHttpRequest(request) : renderWebSocketRequest(request)}
    <p class="source-note">📄 Source: <code>${escapeHtml(request.file)}</code></p>`;
  return pageShell({ title: request.name, content, depth: 2, collections });
}

function renderHome(collections) {
  const cards = collections.map((collection) => `<a class="collection-card" href="${escapeHtml(collection.slug)}/index.html"><div class="collection-icon">${collection.name.startsWith("⚡") ? "⚡" : "🌐"}</div><div><h2>${escapeHtml(collection.name)}</h2><p>${collection.requests.length} requests · ${collection.folders.length} folders</p><span class="version-pill">🔖 ${escapeHtml(collection.version)}</span></div></a>`).join("");
  const content = `<section class="hero"><p class="eyebrow">📚 Generated developer reference</p><h1>🚀 ft_transcendence API Documentation</h1><p class="lead">A searchable, static reference generated directly from the version-controlled Bruno workspace.</p><div class="build-meta"><span>🕒 ${escapeHtml(generatedAt)}</span><span>🌿 ${escapeHtml(process.env.GITHUB_REF_NAME || "bruno")}</span><span>🔖 ${escapeHtml(process.env.GITHUB_SHA || "local build").slice(0, 12)}</span></div></section>
    <section><h2>📚 Available collections</h2><div class="collection-grid">${cards}</div></section>
    <section class="prose landing-copy"><h2>🧭 How to use this site</h2><p>Choose a collection to browse its folders and requests. Each request page preserves the Bruno Markdown documentation, routes, variables, examples, WebSocket messages, and test scripts while keeping environment secrets out of the generated output.</p><blockquote>💡 <strong>Tip</strong><br>Use the search box to find a request name, endpoint, event, folder, or documentation phrase.</blockquote></section>`;
  return pageShell({ title: "Home", content, depth: 0, collections });
}

const styles = `:root{color-scheme:dark;--bg:#0b1020;--panel:#121a2e;--panel-2:#18233c;--text:#edf3ff;--muted:#9eacc5;--line:#2a3a5f;--accent:#74d9ff;--accent-2:#a78bfa;--success:#62e6a7;--danger:#ff8b9e;--shadow:0 18px 50px rgba(0,0,0,.22)}*{box-sizing:border-box}body{margin:0;background:linear-gradient(135deg,#09101f,#101a31 55%,#111827);color:var(--text);font:16px/1.65 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.topbar{position:sticky;top:0;z-index:10;display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:1rem clamp(1rem,4vw,4rem);background:rgba(9,16,31,.88);backdrop-filter:blur(18px);border-bottom:1px solid var(--line)}.brand{font-weight:800;color:var(--text);text-decoration:none}.topnav{display:flex;flex-wrap:wrap;gap:1rem}.topnav a{color:var(--muted);text-decoration:none}.topnav a:hover{color:var(--accent)}.page-layout{max-width:1240px;margin:auto;padding:2rem clamp(1rem,4vw,4rem) 4rem}.main-content{min-width:0}.hero{padding:clamp(2rem,6vw,5rem) 0 3rem}.hero.compact{padding-bottom:2rem}.eyebrow{color:var(--accent);font-weight:800;letter-spacing:.08em;text-transform:uppercase}.hero h1{max-width:900px;margin:.25rem 0 1rem;font-size:clamp(2.2rem,6vw,4.8rem);line-height:1.05}.hero.compact h1{font-size:clamp(2rem,4vw,3.5rem)}.lead{max-width:850px;color:var(--muted);font-size:1.2rem}.build-meta,.tag-row{display:flex;flex-wrap:wrap;gap:.55rem 1rem;color:var(--muted);font-size:.9rem}.version-pill,.tag{display:inline-flex;align-items:center;gap:.25rem;border:1px solid var(--line);border-radius:999px;padding:.2rem .7rem;color:var(--accent);background:rgba(116,217,255,.08);font-size:.82rem}.collection-grid,.request-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:1rem}.collection-card,.request-card{display:flex;gap:1rem;align-items:flex-start;border:1px solid var(--line);border-radius:18px;padding:1.25rem;background:linear-gradient(145deg,rgba(24,35,60,.9),rgba(18,26,46,.9));box-shadow:var(--shadow);text-decoration:none;color:var(--text);transition:transform .18s,border-color .18s}.collection-card:hover,.request-card:hover{transform:translateY(-3px);border-color:var(--accent)}.collection-icon{font-size:2rem}.collection-card h2,.request-name{margin:0;color:var(--text)}.collection-card p{margin:.2rem 0 .7rem;color:var(--muted)}.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin:1rem 0 2rem}.stat{padding:1rem;border:1px solid var(--line);border-radius:14px;background:rgba(18,26,46,.75)}.stat strong,.stat span{display:block}.stat strong{font-size:1.7rem;color:var(--accent)}.stat span{color:var(--muted);font-size:.85rem}.prose{max-width:900px}.prose h1,.prose h2,.prose h3{line-height:1.2;margin-top:2rem}.prose h2{color:var(--accent)}.prose a{color:var(--accent)}.prose code,code{padding:.12rem .35rem;border-radius:5px;background:#0a1224;color:#c9d8ff}.prose pre code,pre code{padding:0;background:transparent;color:inherit}.prose blockquote,blockquote{margin:1.5rem 0;padding:1rem 1.25rem;border-left:3px solid var(--accent-2);background:rgba(167,139,250,.1);border-radius:0 12px 12px 0}.folder-section{margin-top:2.5rem}.folder-section h2{margin-bottom:.8rem}.folder-docs{margin-bottom:1rem;color:var(--muted)}.request-card{display:block}.request-card-top{display:flex;align-items:center;gap:.7rem;margin-bottom:.6rem}.request-card>code{display:block;overflow-wrap:anywhere;color:var(--muted)}.method{display:inline-flex;min-width:3.8rem;justify-content:center;border-radius:6px;padding:.18rem .45rem;font-size:.75rem;font-weight:900;letter-spacing:.06em;background:var(--panel-2);color:var(--text)}.method-get{color:#75e0ae}.method-post{color:#ffc76b}.method-put,.method-patch{color:#a8b9ff}.method-delete{color:#ff91a4}.method-ws{color:var(--accent)}.tag-row{margin-top:.75rem}.tag{font-size:.72rem;color:var(--muted);padding:.08rem .45rem}.search-wrap{position:relative;margin:.5rem 0 2rem}.search-wrap label{display:block;margin-bottom:.4rem;color:var(--muted);font-size:.85rem}.search-wrap input{width:100%;padding:.9rem 1rem;border:1px solid var(--line);border-radius:12px;background:var(--panel);color:var(--text);font:inherit}.search-results{position:absolute;left:0;right:0;top:5rem;z-index:5;padding:.5rem;border:1px solid var(--line);border-radius:12px;background:#101a30;box-shadow:var(--shadow)}.search-results a{display:block;padding:.65rem;color:var(--text);text-decoration:none;border-radius:8px}.search-results a:hover{background:var(--panel-2)}.endpoint-banner{display:flex;align-items:center;gap:.8rem;flex-wrap:wrap;margin:1rem 0;padding:1rem;border:1px solid var(--line);border-radius:14px;background:var(--panel);font-size:1.05rem}.endpoint-banner code{overflow-wrap:anywhere}.callout{margin:1rem 0;padding:1rem 1.2rem;border:1px solid rgba(116,217,255,.35);border-radius:12px;background:rgba(116,217,255,.08)}.request-section{margin:2rem 0}.request-section h2{color:var(--accent)}.table-scroll{overflow-x:auto;margin:.8rem 0}table{width:100%;border-collapse:collapse;background:rgba(18,26,46,.7)}th,td{padding:.7rem .8rem;border:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--accent);font-size:.85rem}pre{overflow:auto;margin:1rem 0;padding:1rem;border:1px solid var(--line);border-radius:12px;background:#080e1c;white-space:pre-wrap}.example,.script{margin:.75rem 0;border:1px solid var(--line);border-radius:12px;background:rgba(18,26,46,.7)}summary{cursor:pointer;padding:.85rem 1rem;font-weight:700}.example-body,.script>pre{padding:0 1rem 1rem}.status{display:inline-block;padding:.1rem .45rem;border-radius:5px;color:#08101c;font-size:.75rem;font-weight:900;background:var(--success)}.status-4xx,.status-5xx{background:var(--danger)}.muted,.source-note{color:var(--muted)}.source-note{margin-top:2rem;font-size:.85rem}.empty{padding:2rem;border:1px dashed var(--line);border-radius:12px;color:var(--muted)}.footer{padding:2rem clamp(1rem,4vw,4rem);border-top:1px solid var(--line);color:var(--muted);font-size:.85rem;text-align:center}@media(max-width:700px){.topbar{align-items:flex-start;flex-direction:column}.stat-grid{grid-template-columns:repeat(2,1fr)}.page-layout{padding-top:1rem}.hero h1{font-size:2.5rem}}`;

const searchScript = `async function initSearch(){const input=document.querySelector("#docs-search"),results=document.querySelector("#search-results");if(!input||!results)return;const indexUrl=new URL(window.DOCS_SEARCH_URL,document.baseURI),siteRoot=new URL("../",indexUrl),data=await fetch(indexUrl).then(r=>r.json());input.addEventListener("input",()=>{const query=input.value.trim().toLowerCase();if(!query){results.hidden=true;results.innerHTML="";return}const matches=data.filter(item=>item.search.includes(query)).slice(0,12);results.innerHTML=matches.length?matches.map(item=>'<a href="'+new URL(item.href,siteRoot).href+'"><strong>'+item.title+'</strong><br><small>'+item.context+'</small></a>').join(""):"<span class=\"muted\">No matches found.</span>";results.hidden=false})}initSearch();`;

async function write(file, content) {
  const destination = path.join(OUTPUT_DIR, file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, content);
}

function buildSearchIndex(collections) {
  const entries = [];
  for (const collection of collections) {
    entries.push({ title: collection.name, context: `${collection.version} collection`, href: `${collection.slug}/index.html` });
    for (const folder of collection.folders) {
      if (folder.path) entries.push({ title: folder.name, context: `${collection.name} folder`, href: `${collection.slug}/index.html` });
    }
    for (const request of collection.requests) {
      entries.push({ title: request.name, context: `${request.kind === "http" ? request.method : "WS"} ${request.url}`, href: request.href });
    }
  }
  return entries.map((entry) => ({ ...entry, search: `${entry.title} ${entry.context}`.toLowerCase() }));
}

async function main() {
  const collections = await discoverCollections();
  if (!collections.length) throw new Error("No Bruno collections found under collections/");
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await write(".nojekyll", "");
  await write("assets/styles.css", styles);
  await write("assets/search.js", searchScript);
  await write("assets/search-index.json", JSON.stringify(buildSearchIndex(collections), null, 2));
  await write("index.html", renderHome(collections));

  for (const collection of collections) {
    await write(`${collection.slug}/index.html`, renderCollection(collection, collections));
    for (const request of collection.requests) {
      await write(request.href, renderRequest(request, collection, collections));
    }
  }

  console.log(`Generated ${collections.length} collections and ${collections.reduce((count, collection) => count + collection.requests.length, 0)} requests in ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
