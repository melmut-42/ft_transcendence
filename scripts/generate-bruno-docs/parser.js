import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";

const COLLECTION_ROOT = path.resolve("collections");

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }

  return files;
}

async function readYaml(file) {
  const source = await fs.readFile(file, "utf8");
  return { source, data: yaml.load(source) ?? {} };
}

function markdownFromDocs(docs) {
  if (!docs) return "";
  if (typeof docs === "string") return docs;
  return typeof docs.content === "string" ? docs.content : "";
}

function safeValue(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/\{\{\s*process\.env\.[^}]+\s*\}\}/gi, "{{SECRET}}")
    .replace(/\b(Bearer)\s+[A-Za-z0-9._~-]+/gi, "$1 <ACCESS_TOKEN>");
}

function safeText(value, key = "") {
  if (value === undefined || value === null) return "";
  const sensitive = /(authorization|cookie|password|secret|token|api[-_]?key|session[-_]?id)/i.test(key);
  return sensitive ? "<REDACTED>" : safeValue(String(value));
}

function relativeToRoot(file) {
  return path.relative(process.cwd(), file).split(path.sep).join("/");
}

function slugify(value) {
  const slug = String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "item";
}

function uniqueSlug(value, used) {
  const base = slugify(value);
  let candidate = base;
  let count = 2;
  while (used.has(candidate)) candidate = `${base}-${count++}`;
  used.add(candidate);
  return candidate;
}

function parseHttpRequest(data, file) {
  const http = data.http ?? {};
  const examples = Array.isArray(data.examples) ? data.examples : [];
  return {
    kind: "http",
    name: data.info?.name ?? path.basename(file),
    file: relativeToRoot(file),
    tags: data.info?.tags ?? [],
    method: http.method ?? "HTTP",
    url: safeText(http.url ?? ""),
    params: (http.params ?? []).map((param) => ({
      name: safeText(param.name),
      type: safeText(param.type),
      value: safeText(param.value, param.name),
      description: safeText(param.description),
    })),
    headers: (http.headers ?? []).map((header) => ({
      name: safeText(header.name),
      value: safeText(header.value, header.name),
      disabled: Boolean(header.disabled),
    })),
    body: http.body ? {
      type: safeText(http.body.type),
      data: safeText(http.body.data),
    } : null,
    examples: examples.map((example) => ({
      name: safeText(example.name),
      status: example.response?.status ?? "",
      headers: (example.response?.headers ?? []).map((header) => ({
        name: safeText(header.name),
        value: safeText(header.value, header.name),
      })),
      body: safeText(example.response?.body?.data),
    })),
    scripts: (data.runtime?.scripts ?? []).map((script) => ({
      type: safeText(script.type),
      code: safeText(script.code),
    })),
    docs: markdownFromDocs(data.docs),
  };
}

function parseWebSocketRequest(data, file) {
  const websocket = data.websocket ?? {};
  return {
    kind: "websocket",
    name: data.info?.name ?? path.basename(file),
    file: relativeToRoot(file),
    tags: data.info?.tags ?? [],
    url: safeText(websocket.url ?? ""),
    messages: (websocket.message ?? []).map((entry) => ({
      title: safeText(entry.title),
      selected: Boolean(entry.selected),
      type: safeText(entry.message?.type),
      data: safeText(entry.message?.data),
    })),
    settings: data.settings ?? {},
    docs: markdownFromDocs(data.docs),
  };
}

async function parseCollection(collectionDirectory) {
  const collectionFile = path.join(collectionDirectory, "opencollection.yml");
  const { data: collection } = await readYaml(collectionFile);
  const files = await walk(collectionDirectory);
  const folderFiles = files.filter((file) => path.basename(file) === "folder.yml");
  const requestFiles = files.filter((file) => path.extname(file) === ".yml" && !file.endsWith("opencollection.yml") && !file.endsWith("folder.yml"));
  const usedSlugs = new Set();
  const collectionSlug = uniqueSlug(path.basename(collectionDirectory), usedSlugs);
  const folders = [];

  for (const file of folderFiles) {
    const { data } = await readYaml(file);
    const relative = path.relative(collectionDirectory, path.dirname(file)).split(path.sep).join("/");
    folders.push({
      name: data.info?.name ?? path.basename(path.dirname(file)),
      path: relative === "." ? "" : relative,
      slug: relative === "." ? "root" : relative.split("/").map(slugify).join("/"),
      file: relativeToRoot(file),
      docs: markdownFromDocs(data.docs),
    });
  }

  const requests = [];
  for (const file of requestFiles) {
    const { data } = await readYaml(file);
    const relative = path.relative(collectionDirectory, path.dirname(file)).split(path.sep).join("/");
    const request = data.info?.type === "websocket" ? parseWebSocketRequest(data, file) : parseHttpRequest(data, file);
    request.folderPath = relative === "." ? "" : relative;
    request.slug = uniqueSlug(`${request.folderPath}-${request.name}`, usedSlugs);
    request.href = `${collectionSlug}/requests/${request.slug}.html`;
    requests.push(request);
  }

  return {
    name: collection.info?.name ?? path.basename(collectionDirectory),
    version: collection.info?.version ?? "Unversioned",
    kind: requests.length > 0 && requests.every((request) => request.kind === "websocket") ? "websocket" : "http",
    slug: collectionSlug,
    directory: relativeToRoot(collectionDirectory),
    docs: markdownFromDocs(collection.docs),
    folders: folders.sort((a, b) => a.path.localeCompare(b.path)),
    requests: requests.sort((a, b) => a.file.localeCompare(b.file)),
  };
}

export async function discoverCollections() {
  const files = await walk(COLLECTION_ROOT);
  const collectionFiles = files.filter((file) => path.basename(file) === "opencollection.yml");
  const collections = await Promise.all(collectionFiles.map((file) => parseCollection(path.dirname(file))));
  return collections.sort((a, b) => a.name.localeCompare(b.name));
}
