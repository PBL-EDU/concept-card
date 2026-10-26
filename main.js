"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ConceptCardPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian7 = require("obsidian");

// src/ai.ts
var import_obsidian = require("obsidian");

// src/core.ts
function collapse(s) {
  return s.replace(/\r/g, "").replace(/[ \t\u00a0]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function termFromSelection(raw) {
  var _a;
  let s = raw.replace(/\r/g, "").trim();
  const firstLine = (_a = s.split("\n").map((l) => l.trim()).find((l) => l.length > 0)) != null ? _a : "";
  s = firstLine;
  s = s.replace(
    /^[\s"'“”‘’《》「」『』【】()（）[\]{}<>*_`~=\-–—。！？!?,，、；;：:…]+|[\s"'“”‘’《》「」『』【】()（）[\]{}<>*_`~=\-–—。！？!?,，、；;：:…]+$/g,
    ""
  );
  if (s.length > 60) {
    const m = s.match(/^[^。！？!?;；]{1,60}[。！？!?]?/);
    if (m) s = m[0];
  }
  s = collapse(s);
  if (s.length > 80) s = s.slice(0, 80) + "\u2026";
  return s;
}
function sanitizeFilename(name) {
  let s = name.replace(/\r?\n/g, "-");
  while (/\.md$/i.test(s)) s = s.replace(/\.md$/i, "");
  s = s.replace(/[\\/:*?"<>|#^[\]]/g, "-");
  s = s.replace(/[ \t]+/g, " ").replace(/-{2,}/g, "-").trim();
  s = s.replace(/^[.\s-]+/, "").replace(/[.\s]+$/, "");
  if (s.length > 100) s = s.slice(0, 100).trim();
  return s || "\u672A\u547D\u540D\u6982\u5FF5";
}
function extractJson(text) {
  let s = (text != null ? text : "").trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch (e) {
    return null;
  }
}
var TYPE_ALIASES = {
  person: "\u4EBA\u7269",
  people: "\u4EBA\u7269",
  figure: "\u4EBA\u7269",
  philosopher: "\u4EBA\u7269",
  \u4EBA\u540D: "\u4EBA\u7269",
  \u4EBA\u540D\u5361: "\u4EBA\u7269",
  \u4EBA\u7269: "\u4EBA\u7269",
  theory: "\u7406\u8BBA",
  \u7406\u8BBA: "\u7406\u8BBA",
  \u5B66\u8BF4: "\u7406\u8BBA",
  \u6A21\u578B: "\u7406\u8BBA",
  \u6846\u67B6: "\u7406\u8BBA",
  model: "\u7406\u8BBA",
  framework: "\u7406\u8BBA",
  concept: "\u6982\u5FF5",
  \u6982\u5FF5: "\u6982\u5FF5",
  \u7406\u5FF5: "\u6982\u5FF5",
  \u601D\u60F3: "\u6982\u5FF5",
  idea: "\u6982\u5FF5",
  method: "\u65B9\u6CD5",
  \u65B9\u6CD5: "\u65B9\u6CD5",
  \u65B9\u6CD5\u8BBA: "\u65B9\u6CD5",
  methodology: "\u65B9\u6CD5",
  technique: "\u65B9\u6CD5",
  \u6280\u5DE7: "\u65B9\u6CD5",
  \u5DE5\u5177: "\u65B9\u6CD5",
  tool: "\u65B9\u6CD5",
  event: "\u4E8B\u4EF6",
  \u4E8B\u4EF6: "\u4E8B\u4EF6",
  \u5386\u53F2\u4E8B\u4EF6: "\u4E8B\u4EF6",
  work: "\u4F5C\u54C1",
  \u4F5C\u54C1: "\u4F5C\u54C1",
  \u4E66: "\u4F5C\u54C1",
  book: "\u4F5C\u54C1",
  \u8BBA\u6587: "\u4F5C\u54C1",
  paper: "\u4F5C\u54C1",
  \u6587\u7AE0: "\u4F5C\u54C1",
  \u7535\u5F71: "\u4F5C\u54C1",
  film: "\u4F5C\u54C1",
  \u672F\u8BED: "\u672F\u8BED",
  term: "\u672F\u8BED",
  terminology: "\u672F\u8BED",
  \u540D\u8BCD: "\u672F\u8BED",
  org: "\u7EC4\u7EC7",
  organization: "\u7EC4\u7EC7",
  organisation: "\u7EC4\u7EC7",
  \u7EC4\u7EC7: "\u7EC4\u7EC7",
  \u673A\u6784: "\u7EC4\u7EC7",
  \u516C\u53F8: "\u7EC4\u7EC7",
  company: "\u7EC4\u7EC7"
};
function normalizeType(raw) {
  var _a, _b;
  const s = collapse(typeof raw === "string" ? raw : "");
  if (!s) return "\u6982\u5FF5";
  const key = s.toLowerCase().replace(/卡$/, "");
  return (_b = (_a = TYPE_ALIASES[key]) != null ? _a : TYPE_ALIASES[s]) != null ? _b : /^[\u4e00-\u9fa5]{1,6}$/.test(s) ? s : "\u6982\u5FF5";
}
var ROOT_KEYWORDS = [
  "\u6982\u5FF5\u5361",
  "\u6982\u5FF5\u5361\u7247",
  "\u6982\u5FF5",
  "\u5361\u7247",
  "\u77E5\u8BC6\u5361",
  "\u77E5\u8BC6\u5E93",
  "\u77E5\u8BC6\u7BA1\u7406",
  "\u77E5\u8BC6",
  "cards",
  "card",
  "concepts",
  "concept",
  "zettelkasten",
  "notes",
  "knowledge"
];
var IGNORED_FOLDER_NAMES = /^(templates?|模板|attachments?|附件|assets?|资源|archive|归档|trash|回收站|\.obsidian|\.trash)$/i;
function detectRootFolder(folders) {
  let best = null;
  for (const f of folders) {
    const segs = f.split("/").filter(Boolean);
    if (!segs.length) continue;
    const name = segs[segs.length - 1].toLowerCase();
    if (!name || IGNORED_FOLDER_NAMES.test(name)) continue;
    let score = 0;
    const exact = ROOT_KEYWORDS.indexOf(name);
    if (exact >= 0) score = 100 - exact * 2;
    else {
      const hit = ROOT_KEYWORDS.findIndex((k) => name.includes(k));
      if (hit >= 0) score = 60 - hit;
    }
    if (score <= 0) continue;
    score -= segs.length - 1;
    if (!best || score > best.score || score === best.score && f.length < best.path.length) {
      best = { path: f, score };
    }
  }
  return best ? best.path : "";
}
var TYPE_SYNONYMS = {
  \u4EBA\u7269: ["\u4EBA\u7269", "\u4EBA\u7269\u5361", "\u4EBA\u540D", "\u4EBA\u7269\u5FD7", "\u4EBA\u7269\u6863\u6848", "people", "person", "persons", "figures"],
  \u7406\u8BBA: ["\u7406\u8BBA", "\u5B66\u8BF4", "\u7406\u8BBA\u5361", "\u6A21\u578B", "\u6846\u67B6", "theories", "theory", "models"],
  \u6982\u5FF5: ["\u6982\u5FF5", "\u6982\u5FF5\u5361", "\u672F\u8BED", "\u540D\u8BCD", "\u6982\u5FF5\u96C6", "concepts", "concept", "terms"],
  \u65B9\u6CD5: ["\u65B9\u6CD5", "\u65B9\u6CD5\u8BBA", "\u65B9\u6CD5\u5361", "\u5DE5\u5177", "\u6280\u5DE7", "methods", "method", "techniques", "tools"],
  \u4E8B\u4EF6: ["\u4E8B\u4EF6", "\u4E8B\u4EF6\u5361", "\u5386\u53F2\u4E8B\u4EF6", "\u5927\u4E8B\u8BB0", "events", "event"],
  \u4F5C\u54C1: ["\u4F5C\u54C1", "\u4F5C\u54C1\u5361", "\u4E66\u7C4D", "\u4E66", "\u8BBA\u6587", "\u6587\u7AE0", "works", "work", "books", "papers"],
  \u672F\u8BED: ["\u672F\u8BED", "\u672F\u8BED\u5361", "\u540D\u8BCD", "\u672F\u8BED\u8868", "terms", "glossary"],
  \u7EC4\u7EC7: ["\u7EC4\u7EC7", "\u7EC4\u7EC7\u5361", "\u673A\u6784", "\u516C\u53F8", "organizations", "orgs", "companies"]
};
function resolveMappedPath(mapping, root) {
  const raw = (mapping != null ? mapping : "").trim().replace(/\\/g, "/");
  if (!raw) return "";
  const absolute = raw.startsWith("/");
  const m = raw.replace(/^\/+|\/+$/g, "");
  const r = (root != null ? root : "").trim().replace(/^\/+|\/+$/g, "");
  if (!m) return r;
  if (absolute) return m;
  if (!r) return m;
  if (m === r || m.startsWith(`${r}/`)) return m;
  return `${r}/${m}`;
}
function matchSubfolder(type, existing, createMissing) {
  var _a;
  const t = normalizeType(type);
  const synonyms = (_a = TYPE_SYNONYMS[t]) != null ? _a : [t];
  let best = null;
  for (const f of existing) {
    const lf = f.toLowerCase();
    for (const syn of synonyms) {
      const ls = syn.toLowerCase();
      let score = 0;
      if (lf === ls) score = 100;
      else if (lf.includes(ls)) score = 80 - Math.min(lf.length - ls.length, 25);
      else if (ls.includes(lf) && lf.length >= 2) score = 60 - Math.min(ls.length - lf.length, 25);
      if (score > 0) {
        score += Math.max(0, 10 - f.length);
        if (!best || score > best.score) best = { name: f, score };
      }
    }
  }
  if (best) return { folder: best.name, needsCreate: false };
  if (createMissing) return { folder: sanitizeFilename(t), needsCreate: true };
  return { folder: "", needsCreate: false };
}
function filenameFor(card, pattern) {
  const title = sanitizeFilename(card.title);
  const type = sanitizeFilename(card.type || "\u6982\u5FF5");
  if (pattern === "type-title") return sanitizeFilename(`${type}-${title}`);
  if (pattern === "title-type") return sanitizeFilename(`${title}\uFF08${type}\uFF09`);
  return title;
}
function nextAvailableName(base, taken) {
  if (!taken.has(base.toLowerCase())) return base;
  for (let i = 2; i < 1e3; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base}-${Date.now()}`;
}
function stripMarkdown(text) {
  return text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_m, a, b) => b || a).replace(/[`*_~=]+/g, "").replace(/^#{1,6}\s+/gm, "").replace(/^>\s?/gm, "").replace(/--+/g, "\u2014");
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function sliceContext(fullText, selection, chars) {
  const text = fullText != null ? fullText : "";
  const sel = (selection != null ? selection : "").trim();
  if (!text || !sel) return "";
  const half = Math.max(80, Math.floor(Math.max(200, chars) / 2));
  const build = (source, idx2, span) => {
    const before = source.slice(Math.max(0, idx2 - half), idx2).trim();
    const after = source.slice(idx2 + span, Math.min(source.length, idx2 + span + half)).trim();
    const parts = [];
    if (before) parts.push(`\u4E0A\u6587\uFF1A${before}`);
    if (after) parts.push(`\u4E0B\u6587\uFF1A${after}`);
    return parts.join("\n");
  };
  let idx = text.indexOf(sel);
  if (idx >= 0) return build(text, idx, sel.length);
  const tokens = sel.split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (tokens.length > 1) {
    const loose = new RegExp(tokens.join("\\s+"));
    const m = loose.exec(text);
    if (m) return build(text, m.index, m[0].length);
  }
  const stripped = stripMarkdown(text);
  idx = stripped.indexOf(sel);
  if (idx >= 0) return build(stripped, idx, sel.length);
  if (tokens.length > 1) {
    const loose = new RegExp(tokens.join("\\s+"));
    const m = loose.exec(stripped);
    if (m) return build(stripped, m.index, m[0].length);
  }
  return "";
}
function formatTimestamp(d) {
  const p = (n) => String(n).padStart(2, "0");
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const tz = `${sign}${p(Math.floor(abs / 60))}:${p(abs % 60)}`;
  const iso = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(
    d.getSeconds()
  )}${tz}`;
  const human = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  return { iso, human };
}
function titleKey(raw) {
  const s = String(raw != null ? raw : "").normalize("NFKC").replace(/[（(]\s*[A-Za-z][^）)]*[）)]/g, "");
  return s.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}
function findLinkableSpot(text, selection) {
  const sel = (selection != null ? selection : "").trim();
  if (!text || !sel) return null;
  const candidates = [];
  let from = 0;
  while (true) {
    const idx = text.indexOf(sel, from);
    if (idx < 0) break;
    candidates.push({ index: idx, length: sel.length });
    from = idx + sel.length;
  }
  if (!candidates.length) {
    const tokens = sel.split(/\s+/).filter(Boolean).map(escapeRegExp);
    if (tokens.length > 1) {
      const re = new RegExp(tokens.join("\\s+"), "g");
      let m;
      while ((m = re.exec(text)) !== null) {
        candidates.push({ index: m.index, length: m[0].length });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
  }
  for (const c of candidates) {
    if (!insideWikilink(text, c.index)) return c;
  }
  return null;
}
function insideWikilink(text, index) {
  const before = text.slice(0, index);
  return before.lastIndexOf("[[") > before.lastIndexOf("]]");
}
function findKeywordIndex(text, name) {
  const needle = (name != null ? name : "").trim();
  if (!text || !needle) return -1;
  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  let from = 0;
  while (true) {
    const idx = lowerText.indexOf(lowerNeedle, from);
    if (idx < 0) return -1;
    if (!insideWikilink(text, idx)) return idx;
    from = idx + lowerNeedle.length;
  }
}
function linkFirstKeyword(text, names, cardName) {
  const candidates = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean))).sort(
    (a, b) => b.length - a.length
  );
  for (const name of candidates) {
    const idx = findKeywordIndex(text, name);
    if (idx < 0) continue;
    const matched = text.slice(idx, idx + name.length);
    const alias = matched === cardName ? "" : `|${matched}`;
    return `${text.slice(0, idx)}[[${cardName}${alias}]]${text.slice(idx + name.length)}`;
  }
  return null;
}

// src/card.ts
var SECTION_ORDER = [
  "definition",
  "examples",
  "boundaries",
  "origins",
  "confusions",
  "perspectives",
  "connections",
  "myview",
  "meaning",
  "selftest"
];
var LITE_SECTIONS = ["definition", "examples", "boundaries", "confusions", "myview", "meaning", "selftest"];
function sectionsFor(format) {
  return format === "lite" ? [...LITE_SECTIONS] : [...SECTION_ORDER];
}
function aiSectionsFor(format) {
  return sectionsFor(format).filter(
    (id) => ["definition", "examples", "boundaries", "origins", "confusions", "perspectives", "connections"].includes(id)
  );
}
function upgradeSections() {
  return ["origins", "perspectives", "connections"];
}
function isBlankSection(id) {
  return id === "myview" || id === "meaning";
}
var ORIGIN_HEADINGS = {
  \u4EBA\u7269: "\u65F6\u4EE3\u4E0E\u751F\u5E73",
  \u7406\u8BBA: "\u6765\u9F99\u53BB\u8109",
  \u65B9\u6CD5: "\u9002\u7528\u6761\u4EF6\u4E0E\u6B65\u9AA4",
  \u4F5C\u54C1: "\u4F5C\u8005\u4E0E\u80CC\u666F",
  \u4E8B\u4EF6: "\u80CC\u666F\u4E0E\u7ECF\u8FC7",
  \u7EC4\u7EC7: "\u80CC\u666F\u4E0E\u7ED3\u6784",
  \u6982\u5FF5: "\u6765\u9F99\u53BB\u8109",
  \u672F\u8BED: "\u8BCD\u6E90\u4E0E\u6F14\u53D8"
};
function headingFor(id, type) {
  var _a;
  switch (id) {
    case "definition":
      return "\u5B9A\u4E49\u4E0E\u673A\u5236";
    case "examples":
      return "\u4F8B\u5B50";
    case "boundaries":
      return "\u8FB9\u754C\u4E0E\u53CD\u4F8B";
    case "origins":
      return (_a = ORIGIN_HEADINGS[type]) != null ? _a : "\u6765\u9F99\u53BB\u8109";
    case "confusions":
      return "\u6613\u6DF7\u6DC6\u8FA8\u6790";
    case "perspectives":
      return "\u4E0D\u540C\u89C6\u89D2\u4E0E\u4E89\u8BAE";
    case "connections":
      return "\u4E0E\u5DF2\u6709\u77E5\u8BC6\u7684\u8FDE\u63A5";
    case "myview":
      return "\u6211\u7684\u770B\u6CD5";
    case "meaning":
      return "\u5BF9\u6211\u7684\u610F\u4E49\u4E0E\u884C\u52A8";
    case "selftest":
      return "\u81EA\u6D4B";
  }
}
function headingAliases(id, type) {
  const out = [headingFor(id, type)];
  if (id === "origins") out.push(...Object.values(ORIGIN_HEADINGS));
  if (id === "confusions") out.push("\u6613\u6DF7\u6DC6");
  if (id === "selftest") out.push("\u81EA\u6D4B\u4E0E\u51FA\u5904");
  return out;
}
function blankQuestions(id) {
  if (id === "myview") {
    return [
      "\u6211\u540C\u610F\u54EA\u4E00\u90E8\u5206\uFF1F\u4E3A\u4EC0\u4E48\uFF1F",
      "\u54EA\u4E00\u90E8\u5206\u8BA9\u6211\u8FDF\u7591\u2014\u2014\u662F\u8BC1\u636E\u4E0D\u8DB3\uFF0C\u8FD8\u662F\u4E0E\u6211\u7684\u7ECF\u9A8C\u51B2\u7A81\uFF1F",
      "\u6211\u80FD\u4E3E\u4E00\u4E2A\u4EB2\u8EAB\u7ECF\u5386\u652F\u6301\u6216\u53CD\u9A73\u5B83\u5417\uFF1F",
      "\u5982\u679C\u53EA\u80FD\u7559\u4E00\u53E5\u8BDD\uFF0C\u6211\u4F1A\u600E\u4E48\u6982\u62EC\u5B83\uFF1F"
    ];
  }
  return [
    "\u5B83\u80FD\u89E3\u91CA\u6211\u7ECF\u5386\u8FC7\u7684\u54EA\u4E2A\u73B0\u8C61\uFF1F\uFF08\u53EF\u53C2\u8003\u4E0A\u9762\u7684\u4F8B\u5B50\uFF0C\u4F46\u53EA\u4FDD\u7559\u4F60\u771F\u6B63\u7ECF\u5386\u8FC7\u7684\uFF09",
    "\u5B83\u5728\u4EC0\u4E48\u60C5\u51B5\u4E0B\u5BF9\u6211\u4E0D\u9002\u7528\uFF1F",
    "\u672C\u5468\u53EF\u4EE5\u8BD5\u7684\u4E00\u4EF6\u5C0F\u4E8B\u662F\u4EC0\u4E48\uFF1F",
    "\u89C2\u5BDF\u4EC0\u4E48\u4FE1\u53F7\u8BF4\u660E\u201C\u7528\u4E0A\u4E86\u201D\uFF1B\u5982\u679C\u6CA1\u7528\u4E0A\uFF0C\u6700\u53EF\u80FD\u5361\u5728\u54EA\uFF1F",
    "\u4EC0\u4E48\u65F6\u5019\u56DE\u6765\u590D\u67E5\u8FD9\u5F20\u5361\uFF1F"
  ];
}
function str(v) {
  return typeof v === "string" ? v : "";
}
function strList(v, limit = 12) {
  if (Array.isArray(v)) {
    return v.map((x) => typeof x === "string" ? x : x && typeof x === "object" ? str(x.name) : "").map((s) => collapse(s)).filter(Boolean).slice(0, limit);
  }
  if (typeof v === "string") {
    return v.split(/[,，、;；\n]/).map((s) => collapse(s)).filter(Boolean).slice(0, limit);
  }
  return [];
}
function normalizeSource(v) {
  const s = collapse(str(v)).toLowerCase();
  return s === "text" || s === "common" || s === "inference" ? s : "common";
}
var ALL_IDS = new Set(SECTION_ORDER);
var HEADING_TO_ID = /* @__PURE__ */ new Map();
for (const id of ["definition", "examples", "boundaries", "origins", "confusions", "perspectives", "connections"]) {
  HEADING_TO_ID.set(headingFor(id, ""), id);
}
HEADING_TO_ID.set("\u6613\u6DF7\u6DC6", "confusions");
for (const h of Object.values(ORIGIN_HEADINGS)) HEADING_TO_ID.set(h, "origins");
function normalizeCardV3(raw, fallbackTitle) {
  var _a, _b;
  const rec = raw && typeof raw === "object" ? raw : {};
  const title = collapse(str(rec.title) || str(rec.name)).replace(/^\[\[|\]\]$/g, "") || fallbackTitle;
  const sectionsRaw = rec.sections;
  const sections = {};
  const put = (idOrHeading, body, source) => {
    const id = ALL_IDS.has(idOrHeading) ? idOrHeading : HEADING_TO_ID.get(idOrHeading);
    if (!id) return;
    if (typeof body !== "string" || !body.trim()) return;
    sections[id] = { body: body.trim(), source: normalizeSource(source) };
  };
  if (Array.isArray(sectionsRaw)) {
    for (const item of sectionsRaw) {
      if (!item || typeof item !== "object") continue;
      const r = item;
      put(str(r.id) || str(r.heading), (_a = r.body) != null ? _a : r.content, r.source);
    }
  } else if (sectionsRaw && typeof sectionsRaw === "object") {
    for (const [key, value] of Object.entries(sectionsRaw)) {
      if (typeof value === "string") put(key, value, "common");
      else if (value && typeof value === "object") {
        const v = value;
        put(key, (_b = v.body) != null ? _b : v.content, v.source);
      }
    }
  }
  const confidenceRaw = collapse(str(rec.confidence)).toLowerCase();
  const confidence = confidenceRaw === "high" || confidenceRaw === "medium" || confidenceRaw === "low" ? confidenceRaw : "medium";
  return {
    title: title.slice(0, 120),
    type: normalizeType(rec.type),
    aliases: strList(rec.aliases).filter((a) => a.toLowerCase() !== title.toLowerCase()),
    tags: strList(rec.tags).map((t) => t.replace(/^#/, "")),
    summary: collapse(str(rec.summary)).slice(0, 300),
    quote: collapse(str(rec.quote)),
    sections,
    selftest: strList(rec.selftest, 6).map((q) => collapse(q)),
    uncertainties: strList(rec.uncertainties, 6),
    confidence
  };
}
function yamlStr(s) {
  return `"${collapse(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
function quoteLines(text) {
  return collapse(text).split("\n").map((line) => `> ${line}`).join("\n");
}
var SOURCE_LABEL = {
  text: "*\u6765\u6E90\uFF1A\u539F\u6587*",
  common: "*\u6765\u6E90\uFF1A\u901A\u884C\u77E5\u8BC6\uFF08\u975E\u539F\u6587\uFF09*",
  inference: "*\u6765\u6E90\uFF1AAI \u63A8\u65AD\uFF0C\u8BF7\u6838\u5BF9*"
};
function buildFrontmatterV3(card, ctx) {
  const lines = ["---"];
  lines.push(`title: ${yamlStr(card.title)}`);
  if (card.aliases.length) {
    lines.push("aliases:");
    for (const a of card.aliases) lines.push(`  - ${yamlStr(a)}`);
  }
  lines.push(`type: ${yamlStr(card.type)}`);
  if (card.tags.length) {
    lines.push("tags:");
    for (const t of card.tags) lines.push(`  - ${yamlStr(t)}`);
  }
  const sources = Array.from(new Set(ctx.sources.map((s) => s.trim()).filter(Boolean)));
  if (sources.length) {
    lines.push("sources:");
    for (const s of sources) lines.push(`  - ${yamlStr(`[[${s}]]`)}`);
    if (ctx.sourcePath) lines.push(`source_path: ${yamlStr(ctx.sourcePath)}`);
  }
  lines.push(`card_format: ${ctx.format}`);
  lines.push(`stage: ${yamlStr(ctx.stage)}`);
  lines.push(`created: ${ctx.createdISO}`);
  lines.push(`updated: ${ctx.updatedISO}`);
  lines.push(`revisit: ${ctx.revisit}`);
  lines.push(`model: ${yamlStr(ctx.model || "unknown")}`);
  lines.push(`confidence: ${card.confidence}`);
  lines.push("---");
  return lines.join("\n");
}
function renderBlankSection(id) {
  const questions = blankQuestions(id);
  const quoted = questions.map((q) => `> - ${q}`).join("\n");
  return `## ${headingFor(id, "")}

> [!question] \u5F85\u4F60\u8865\u5145
${quoted}

\u6211\u7684\u56DE\u7B54\uFF1A
`;
}
function renderCardMarkdownV3(card, ctx) {
  const body = [];
  body.push(`# ${collapse(card.title)}`);
  if (card.summary) {
    body.push("", "> [!abstract] \u4E00\u53E5\u8BDD", quoteLines(card.summary));
  }
  if (card.quote) {
    body.push(
      "",
      "> [!quote] \u539F\u6587\u8BED\u5883",
      quoteLines(`${card.quote}${ctx.sourceNote ? ` \u2014\u2014 [[${ctx.sourceNote}]]` : ""}`)
    );
  }
  for (const id of sectionsFor(ctx.format)) {
    if (isBlankSection(id)) {
      if (id === "myview") body.push("", "---");
      body.push("", renderBlankSection(id));
      continue;
    }
    if (id === "selftest") {
      if (!card.selftest.length) continue;
      body.push("", `## ${headingFor(id, card.type)}`, "");
      card.selftest.forEach((q, i) => body.push(`${i + 1}. ${q}`));
      continue;
    }
    const section = card.sections[id];
    if (!section || !section.body.trim()) continue;
    body.push("", `## ${headingFor(id, card.type)}`, "", section.body.trim(), "", SOURCE_LABEL[section.source]);
  }
  body.push("", "---", "", "## \u51FA\u5904", "");
  const sources = Array.from(new Set(ctx.sources.map((s) => s.trim()).filter(Boolean)));
  if (ctx.sourceNote) body.push(`- \u6765\u6E90\uFF1A[[${ctx.sourceNote}]]${ctx.sourcePath ? `\uFF08\`${ctx.sourcePath}\`\uFF09` : ""}`);
  if (sources.length > 1) body.push(`- \u5176\u4ED6\u6765\u6E90\uFF1A${sources.filter((s) => s !== ctx.sourceNote).map((s) => `[[${s}]]`).join("\u3001")}`);
  if (ctx.selection) body.push(`- \u539F\u6587\u7247\u6BB5\uFF1A\u300C${collapse(ctx.selection).slice(0, 200)}\u300D`);
  body.push(`- \u751F\u6210\u65F6\u95F4\uFF1A${ctx.createdHuman}`);
  body.push(`- \u6700\u540E\u66F4\u65B0\uFF1A${ctx.updatedHuman}`);
  body.push(`- \u751F\u6210\u6A21\u578B\uFF1A${ctx.model || "unknown"}`);
  if (card.uncertainties.length) body.push(`- \u4E0D\u786E\u5B9A\u70B9\uFF1A${card.uncertainties.map((u) => collapse(u)).join("\uFF1B")}`);
  body.push("- \u8BF4\u660E\uFF1A\u672C\u5361\u7531 AI \u751F\u6210\uFF0C\u5173\u952E\u4E8B\u5B9E\u8BF7\u6838\u5BF9\u539F\u59CB\u51FA\u5904\uFF1B\u7559\u767D\u90E8\u5206\u7531\u4F60\u81EA\u5DF1\u586B\u5199\u3002");
  return [buildFrontmatterV3(card, ctx), "", body.join("\n"), ""].join("\n");
}
function parseCardSections(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let preamble = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^## (.*)$/);
    if (m) {
      if (current) blocks.push({ heading: current.heading, text: current.lines.join("\n").trim() });
      current = { heading: m[1].trim(), lines: [line] };
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (current) blocks.push({ heading: current.heading, text: current.lines.join("\n").trim() });
  return { preamble: preamble.join("\n").replace(/\n{3,}/g, "\n\n").trim(), blocks };
}
function insertMissingSections(markdown, type, additions, format) {
  const parsed = parseCardSections(markdown);
  const used = /* @__PURE__ */ new Set();
  const findBlock = (id) => {
    const aliases = headingAliases(id, type);
    return parsed.blocks.findIndex((b, i) => !used.has(i) && aliases.includes(b.heading));
  };
  const ordered = [];
  for (const id of SECTION_ORDER) {
    if (isBlankSection(id) || id === "selftest") continue;
    if (!sectionsFor(format).includes(id)) continue;
    const idx = findBlock(id);
    if (idx >= 0) {
      used.add(idx);
      ordered.push(parsed.blocks[idx].text);
      continue;
    }
    const addition = additions.find((a) => a.id === id);
    if (!addition) continue;
    const label = addition.source ? `

${SOURCE_LABEL[addition.source]}` : "";
    ordered.push(`## ${headingFor(id, type)}

${addition.body.trim()}${label}`);
  }
  for (const id of ["myview", "meaning", "selftest"]) {
    const idx = findBlock(id);
    if (idx >= 0) {
      used.add(idx);
      ordered.push(parsed.blocks[idx].text);
    }
  }
  parsed.blocks.forEach((b, i) => {
    if (!used.has(i)) ordered.push(b.text);
  });
  return `${parsed.preamble}

${ordered.join("\n\n")}
`;
}
function blankAnswerOf(markdown, heading) {
  const parsed = parseCardSections(markdown);
  const block = parsed.blocks.find((b) => b.heading === heading);
  if (!block) return "";
  const idx = block.text.indexOf("\u6211\u7684\u56DE\u7B54\uFF1A");
  if (idx < 0) return "";
  return block.text.slice(idx + "\u6211\u7684\u56DE\u7B54\uFF1A".length).trim();
}
function blankAnswerLength(markdown) {
  const count = (s) => s.replace(/\s/g, "").length;
  return {
    view: count(blankAnswerOf(markdown, "\u6211\u7684\u770B\u6CD5")),
    meaning: count(blankAnswerOf(markdown, "\u5BF9\u6211\u7684\u610F\u4E49\u4E0E\u884C\u52A8"))
  };
}
function suggestStageFor(markdown, stage, format, revisit, today) {
  const { view, meaning } = blankAnswerLength(markdown);
  if (view < 20 || meaning < 20) return null;
  if (stage === "\u5E7C\u82D7") return "\u6210\u957F";
  if (stage === "\u6210\u957F" && format === "full" && revisit && revisit.slice(0, 10) <= today) return "\u5E38\u9752";
  return null;
}
function setFrontmatterField(markdown, key, value) {
  const m = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return markdown;
  const lines = m[1].split("\n");
  const idx = lines.findIndex((l) => l.startsWith(`${key}:`));
  if (idx >= 0) lines[idx] = `${key}: ${value}`;
  else lines.push(`${key}: ${value}`);
  return markdown.replace(m[0], `---
${lines.join("\n")}
---
`);
}
function revisitDate(days, now = /* @__PURE__ */ new Date()) {
  const d = new Date(now.getTime() + days * 864e5);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function nowISO(now = /* @__PURE__ */ new Date()) {
  return formatTimestamp(now);
}
function stageAfterUpgrade(prev) {
  return prev === "\u5E38\u9752" ? "\u5E38\u9752" : "\u6210\u957F";
}

// src/prompt.ts
var SECTION_GUIDE = {
  definition: "definition \u5B9A\u4E49\u4E0E\u673A\u5236\uFF1A\u5206 2-3 \u5C42\u8BB2\u6E05\u5B83\u662F\u4EC0\u4E48\u3001\u600E\u4E48\u6210\u7ACB/\u8FD0\u4F5C\uFF0C\u53EF\u542B\u300C\u4E3A\u4EC0\u4E48\u91CD\u8981\u300D\u4E00\u53E5\uFF1B\u4E0D\u8981\u5199\u751F\u5E73\u6216\u8BC4\u4EF7\u3002",
  examples: "examples \u4F8B\u5B50\uFF1A1 \u4E2A\u6765\u81EA\u539F\u6587\u8BED\u5883\u7684\u4F8B\u5B50 + 1 \u4E2A\u5178\u578B/\u751F\u6D3B\u4F8B\u5B50\uFF1B\u4E0D\u8981\u7F16\u9020\u5177\u4F53\u6570\u636E\u3002",
  boundaries: "boundaries \u8FB9\u754C\u4E0E\u53CD\u4F8B\uFF1A\u5B83\u5728\u4EC0\u4E48\u6761\u4EF6\u4E0B\u4E0D\u6210\u7ACB\u3001\u54EA\u4E9B\u60C5\u51B5\u770B\u8D77\u6765\u50CF\u5176\u5B9E\u4E0D\u662F\u3001\u6700\u5E38\u89C1\u7684\u8BEF\u7528\u662F\u4EC0\u4E48\u3002",
  origins: "origins \u6765\u9F99\u53BB\u8109\uFF1A\u6309\u7C7B\u578B\u5199\u2014\u2014\u4EBA\u7269\u5199\u65F6\u4EE3\u3001\u5173\u952E\u7ECF\u5386\u3001\u4EE3\u8868\u4F5C\u4E0E\u6838\u5FC3\u8D21\u732E\uFF1B\u7406\u8BBA\u5199\u63D0\u51FA\u8005\u3001\u5E74\u4EE3\u3001\u540E\u7EED\u4FEE\u6B63\uFF1B\u65B9\u6CD5\u5199\u9002\u7528\u6761\u4EF6\u3001\u6B65\u9AA4\u3001\u6210\u672C\u4E0E\u5931\u8D25\u6A21\u5F0F\uFF1B\u4F5C\u54C1\u5199\u4F5C\u8005\u3001\u5E74\u4EE3\u3001\u6838\u5FC3\u8BBA\u70B9\u4E0E\u5F71\u54CD\u3002",
  confusions: "confusions \u6613\u6DF7\u6DC6\u8FA8\u6790\uFF1A1-3 \u4E2A\u6700\u6613\u6DF7\u7684\u6982\u5FF5\uFF0C\u5206\u522B\u5199\u76F8\u4F3C\u70B9\u3001\u5173\u952E\u533A\u522B\u3001\u5E38\u89C1\u8BEF\u7528\u3002",
  perspectives: "perspectives \u4E0D\u540C\u89C6\u89D2\u4E0E\u4E89\u8BAE\uFF1A\u652F\u6301\u5B83\u7684\u6700\u5F3A\u7406\u7531\u3001\u6700\u5F3A\u7684\u53CD\u9A73\u3001\u540E\u6765\u8005\u5982\u4F55\u4FEE\u6B63\u5B83\uFF1B\u53EA\u5448\u73B0\u89C6\u89D2\uFF0C\u4E0D\u8981\u7ED9\u8BFB\u8005\u4E0B\u7ED3\u8BBA\u3002",
  connections: "connections \u4E0E\u5DF2\u6709\u77E5\u8BC6\u7684\u8FDE\u63A5\uFF1A\u53EA [[\u94FE\u63A5]] \u5230\u300C\u5DF2\u6709\u6982\u5FF5\u5361\u300D\u5217\u8868\u91CC\u51FA\u73B0\u8FC7\u7684\u6807\u9898\uFF0C\u5E76\u8BF4\u660E\u5173\u7CFB\uFF08\u5C5E\u4E8E/\u5BF9\u6BD4/\u56E0\u679C/\u524D\u63D0/\u4F8B\u8BC1\uFF09\uFF1B\u5217\u8868\u91CC\u6CA1\u6709\u7684\u5199\u666E\u901A\u540D\u79F0\u3002"
};
var SOURCE_RULE = `\u6BCF\u4E2A\u5C0F\u8282\u5FC5\u987B\u5E26 source \u5B57\u6BB5\uFF1A
- "text"\uFF1A\u5185\u5BB9\u660E\u786E\u6765\u81EA\u539F\u6587\u7247\u6BB5\uFF1B
- "common"\uFF1A\u5B66\u79D1\u901A\u884C\u77E5\u8BC6\uFF08\u539F\u6587\u6CA1\u63D0\uFF09\uFF1B
- "inference"\uFF1A\u4F60\u7684\u6574\u5408\u6216\u63A8\u65AD\u3002
\u539F\u6587\u6CA1\u8BF4\u7684\u4E0D\u8981\u6807 text\u3002`;
function structureFor(language, bilingual, format) {
  const ids = aiSectionsFor(format);
  const titleHint = language === "zh" ? bilingual ? "\u4ECE\u9009\u533A\u63D0\u70BC\u51FA\u7684\u5355\u4E00\u4E2D\u6587\u6982\u5FF5\u540D\uFF08\u53BB\u6389\u4FEE\u9970\u8BED\uFF1B\u82F1\u6587\u539F\u540D\u653E aliases\uFF09" : "\u4ECE\u9009\u533A\u63D0\u70BC\u51FA\u7684\u5355\u4E00\u4E2D\u6587\u6982\u5FF5\u540D" : "single canonical concept name extracted from the selection";
  const aliasHint = language === "zh" ? "\u82F1\u6587\u539F\u540D\u3001\u5E38\u89C1\u8BD1\u540D\u3001\u7F29\u5199" : "aliases, abbreviations, original-language name";
  const sectionLines = ids.map((id) => `    "${id}": {"body": "Markdown \u6B63\u6587", "source": "text|common|inference"}`).join(",\n");
  return `{
  "title": "${titleHint}",
  "type": "\u4EBA\u7269|\u7406\u8BBA|\u6982\u5FF5|\u65B9\u6CD5|\u4E8B\u4EF6|\u4F5C\u54C1|\u672F\u8BED|\u7EC4\u7EC7 \u4E4B\u4E00",
  "aliases": ["${aliasHint}"],
  "tags": ["2-4 \u4E2A\u4E3B\u9898\u6807\u7B7E\uFF0C\u4F18\u5148\u590D\u7528\u5DF2\u6709\u6807\u7B7E\uFF1B\u4E0D\u542B # \u53F7"],
  "summary": "\u4E00\u53E5\u8BDD\u5B9A\u4E49\uFF0C\u226460 \u5B57",
  "quote": "\uFF08\u53EF\u9009\uFF09\u9010\u5B57\u53D6\u81EA\u539F\u6587\u7247\u6BB5\u7684\u4E00\u53E5\u539F\u8BDD\uFF1B\u6CA1\u6709\u5C31\u7ED9\u7A7A\u5B57\u7B26\u4E32",
  "sections": {
${sectionLines}
  },
  "selftest": ["2-3 \u4E2A\u68C0\u9A8C\u7406\u89E3\u7684\u95EE\u9898\uFF08\u4E0D\u8981\u590D\u8FF0\u9898\uFF0C\u53EA\u51FA\u9898\u4E0D\u7ED9\u7B54\u6848\uFF09"],
  "uncertainties": ["\u4F60\u4E0D\u592A\u786E\u5B9A\u7684\u70B9\uFF1B\u6CA1\u6709\u5C31\u7ED9\u7A7A\u6570\u7EC4"],
  "confidence": "high|medium|low"
}`;
}
function resolveLanguage(mode, text) {
  if (mode === "zh" || mode === "en") return mode;
  return /[\u3400-\u9fff]/.test(text) ? "zh" : "en";
}
function buildSystemPrompt(language, bilingual, format) {
  const langRule = language === "zh" ? bilingual ? "\u5168\u90E8\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587\u3002\u91CD\u8981\u4EBA\u540D\u3001\u7406\u8BBA\u3001\u8457\u4F5C\u3001\u6982\u5FF5\u9996\u6B21\u51FA\u73B0\u65F6\u5199\u6210\u300C\u4E2D\u6587\uFF08English\uFF09\u300D\uFF0C\u4F8B\u5982\u300C\u8BA4\u77E5\u5931\u8C03\uFF08Cognitive Dissonance\uFF09\u300D\uFF1Btitle \u53EA\u5199\u4E2D\u6587\uFF0C\u82F1\u6587\u539F\u540D\u653E\u8FDB aliases\u3002" : "\u5168\u90E8\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587\uFF08\u4E13\u6709\u540D\u8BCD\u53EF\u4FDD\u7559\u82F1\u6587\u539F\u540D\u5E76\u5728\u62EC\u53F7\u91CC\u6CE8\u51FA\uFF09\u3002" : "Write everything in English (keep the original proper nouns when they are not English).";
  const isLite = format === "lite";
  const sectionList = aiSectionsFor(format).map((id) => `- ${id}\uFF1A${SECTION_GUIDE[id]}`).join("\n");
  return `\u4F60\u662F\u77E5\u8BC6\u5E93\u7F16\u8F91\uFF0C\u4E3A\u5B66\u4E60\u8005\u7684 Obsidian \u5E93\u751F\u6210\u300C\u6982\u5FF5\u5361\u300D\u7684 JSON\u3002\u5361\u7247\u5206\u4E24\u6863\uFF1Alite \u7CBE\u7B80\u7248\u3001full \u5B8C\u6574\u7248\u3002\u672C\u6B21\u662F ${isLite ? "lite \u7CBE\u7B80\u7248" : "full \u5B8C\u6574\u7248"}\u3002

\u3010\u53EA\u80FD\u4F7F\u7528\u8FD9\u4E9B\u5C0F\u8282 id\uFF0C\u4E0D\u8981\u81EA\u521B\u3011
${sectionList}

\u3010\u5199\u4F5C\u539F\u5219\u3011
1. \u51C6\u786E\u4F18\u5148\uFF1A\u53EA\u5199\u516C\u8BA4\u3001\u53EF\u6838\u67E5\u7684\u77E5\u8BC6\uFF1B\u4E0D\u7F16\u9020\u5E74\u4EFD\u3001\u9875\u7801\u3001\u6570\u636E\u3001\u5E08\u627F\u3002\u4E0D\u786E\u5B9A\u5C31\u5199\u8FDB uncertainties\u3002
2. \u8D34\u5408\u539F\u6587\uFF1A\u7ED3\u5408\u539F\u6587\u7247\u6BB5\u4E0E\u4E0A\u4E0B\u6587\uFF0C\u8BF4\u660E\u5B83\u5728\u8FD9\u6BB5\u6750\u6599\u91CC\u7684\u5177\u4F53\u542B\u4E49\u3002
3. \u8BFB\u8005\u89C6\u89D2\uFF1A\u89E3\u91CA\u201C\u662F\u4EC0\u4E48\u3001\u4E3A\u4EC0\u4E48\u3001\u600E\u4E48\u7528\u201D\uFF0C\u4E0D\u8981\u7A7A\u8BDD\u3002
4. \u53CC\u94FE\u514B\u5236\uFF1A\u53EA [[\u94FE\u63A5]] \u5DF2\u6709\u6982\u5FF5\u5361\uFF1B\u6CA1\u6709\u5C31\u5199\u666E\u901A\u540D\u79F0\uFF0C\u4E0D\u8981\u865A\u6784\u94FE\u63A5\u3002
5. ${langRule}
6. \u4E0D\u66FF\u8BFB\u8005\u8868\u6001\uFF1A\u4E0D\u8981\u8F93\u51FA\u201C\u6211\u8BA4\u4E3A/\u6211\u8BA4\u4E3A\u4F60\u8BE5/\u5BF9\u4F60\u7684\u610F\u4E49\u662F\u201D\u8FD9\u7C7B\u5224\u65AD\uFF1B\u4E2A\u4EBA\u770B\u6CD5\u4E0E\u884C\u52A8\u7531\u5361\u7247\u7559\u767D\uFF0C\u8BFB\u8005\u81EA\u5DF1\u586B\u5199\u3002
7. ${SOURCE_RULE}
8. quote \u5FC5\u987B\u9010\u5B57\u6765\u81EA\u539F\u6587\u7247\u6BB5\uFF1B\u7247\u6BB5\u91CC\u6CA1\u6709\u5C31\u7559\u7A7A\uFF0C\u4E0D\u8981\u6539\u5199\u3002
9. \u7BC7\u5E45\uFF1A${isLite ? "lite \u603B\u5B57\u6570 500-800 \u5B57" : "full \u603B\u5B57\u6570 900-1500 \u5B57"}\uFF1Bsummary \u2264 60 \u5B57\u3002
10. selftest \u51FA 2-3 \u4E2A\u95EE\u9898\uFF0C\u68C0\u6D4B\u7406\u89E3\uFF08\u5982\u201C\u5728 X \u573A\u666F\u4E0B\u8BE5\u7528 A \u8FD8\u662F B\u201D\uFF09\uFF0C\u4E0D\u8981\u95EE\u201C\u662F\u4EC0\u4E48\u201D\u3002
11. \u4ECE\u9009\u533A\u63D0\u70BC\u540D\u79F0\uFF1A\u9009\u533A\u53EF\u80FD\u591A\u5E26\u4E86\u524D\u540E\u7684\u5B57\u3001\u52A8\u4F5C\u6216\u6574\u53E5\u3002title \u53EA\u53D6\u6838\u5FC3\u6982\u5FF5\u540D\uFF0C\u53BB\u6389\u300C\xD7\xD7\u63D0\u51FA\u7684 / \u7814\u7A76\u8868\u660E / \u5173\u4E8E\u2026\u2026\u7684\u7406\u8BBA / \u7684\u2026\u2026\u7406\u8BBA\u300D\u7B49\u4FEE\u9970\uFF1Baliases \u53EA\u653E\u8FD9\u4E2A\u6982\u5FF5\u540D\u7684\u522B\u540D\uFF08\u82F1\u6587\u539F\u540D\u3001\u7F29\u5199\u3001\u5E38\u89C1\u8BD1\u540D\uFF09\uFF0C\u4E0D\u8981\u628A\u6574\u53E5\u9009\u533A\u585E\u8FDB aliases\u3002

\u3010\u8F93\u51FA\u683C\u5F0F\u3011\u53EA\u8F93\u51FA\u4E00\u4E2A JSON \u5BF9\u8C61\uFF1A\u4E0D\u8981 Markdown \u4EE3\u7801\u56F4\u680F\uFF0C\u4E0D\u8981\u89E3\u91CA\u6587\u5B57\u3002\u5B57\u6BB5\u7ED3\u6784\uFF1A

${structureFor(language, bilingual, format)}`;
}
function buildUserPrompt(input) {
  var _a;
  const language = resolveLanguage(input.language, input.selection || input.term);
  const parts = [];
  parts.push(`\u3010\u9009\u4E2D\u7684\u539F\u6587\u7247\u6BB5\u3011
\u300C${input.selection}\u300D`);
  if (input.sourceNote) {
    parts.push(`\u3010\u6240\u5728\u7B14\u8BB0\u3011${input.sourceNote}${input.sourcePath ? `\uFF08${input.sourcePath}\uFF09` : ""}`);
  }
  if (input.context.trim()) parts.push(`\u3010\u4E0A\u4E0B\u6587\u3011
${input.context.trim()}`);
  if (input.existingCards.length) {
    parts.push(`\u3010\u5DF2\u6709\u6982\u5FF5\u5361\uFF08\u53EA\u80FD\u94FE\u63A5\u8FD9\u4E9B\u6807\u9898\uFF09\u3011
${input.existingCards.map((c) => `- ${c}`).join("\n")}`);
  }
  if ((_a = input.existingTags) == null ? void 0 : _a.length) {
    parts.push(`\u3010\u5E93\u91CC\u5DF2\u6709\u6807\u7B7E\uFF08\u4F18\u5148\u590D\u7528\uFF09\u3011
${input.existingTags.map((t) => `- ${t}`).join("\n")}`);
  }
  parts.push(
    `\u3010\u4EFB\u52A1\u3011\u4E3A\u4E0A\u9762\u7684\u9009\u533A\u5199\u4E00\u5F20 ${input.format === "lite" ? "lite \u7CBE\u7B80\u7248" : "full \u5B8C\u6574\u7248"} \u6982\u5FF5\u5361\u3002\u9009\u533A\u53EF\u80FD\u5305\u542B\u4FEE\u9970\u8BED\uFF0C\u8BF7\u81EA\u884C\u63D0\u70BC\u6838\u5FC3\u6982\u5FF5\u540D\u3002${language === "zh" ? "\u7528\u7B80\u4F53\u4E2D\u6587\u8F93\u51FA JSON\u3002" : "Output JSON in English."}`
  );
  if (input.extraInstructions.trim()) parts.push(`\u3010\u989D\u5916\u8981\u6C42\u3011
${input.extraInstructions.trim()}`);
  return parts.join("\n\n");
}
function buildMessages(input) {
  var _a;
  const language = resolveLanguage(input.language, input.selection || input.term);
  return [
    { role: "system", content: buildSystemPrompt(language, (_a = input.bilingual) != null ? _a : true, input.format) },
    { role: "user", content: buildUserPrompt(input) }
  ];
}
function buildUpgradeMessages(input) {
  const language = resolveLanguage(input.language, input.existingMarkdown);
  const ids = upgradeSections();
  const guides = ids.map((id) => `- ${id}\uFF1A${SECTION_GUIDE[id]}`).join("\n");
  const langRule = language === "zh" ? input.bilingual === false ? "\u5168\u90E8\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587\u3002" : "\u5168\u90E8\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587\uFF1B\u91CD\u8981\u540D\u8BCD\u9996\u6B21\u51FA\u73B0\u5199\u6210\u300C\u4E2D\u6587\uFF08English\uFF09\u300D\u3002" : "Write everything in English.";
  const system = `\u4F60\u662F\u77E5\u8BC6\u5E93\u7F16\u8F91\u3002\u4E0B\u9762\u662F\u4E00\u5F20\u5DF2\u6709\u7684\u6982\u5FF5\u5361\uFF08\u7CBE\u7B80\u7248\uFF09\uFF0C\u9700\u8981\u8865\u5168\u4E3A\u5B8C\u6574\u7248\uFF1A\u53EA\u8865\u7F3A\u5931\u7684\u5C0F\u8282\uFF0C\u4E0D\u8981\u6539\u5199\u5DF2\u6709\u5185\u5BB9\u3002

\u3010\u8981\u8865\u7684\u5C0F\u8282 id\u3011origins, perspectives, connections

\u3010\u8981\u8865\u7684\u5C0F\u8282\u3011
${guides}

\u3010\u8981\u6C42\u3011
1. ${langRule}
2. \u53EA\u5199\u7ED9\u5B9A id\uFF0C\u4E0D\u8981\u81EA\u521B\u5C0F\u8282\uFF1B\u6BCF\u4E2A\u5C0F\u8282\u5E26 source\uFF08text/common/inference\uFF09\u3002
3. \u5982\u679C\u5DF2\u6709\u5361\u7247\u91CC\u5DF2\u7ECF\u5199\u4E86\u67D0\u4E2A\u65B9\u9762\u7684\u5185\u5BB9\uFF0C\u4E0D\u8981\u91CD\u590D\u3002
4. \u4E0D\u66FF\u8BFB\u8005\u8868\u6001\uFF1B\u4E0D\u8981\u8F93\u51FA\u201C\u6211\u7684\u770B\u6CD5/\u5BF9\u6211\u7684\u610F\u4E49\u201D\u3002
5. \u53EA\u8F93\u51FA JSON\uFF1A{"sections": {"<id>": {"body": "...", "source": "..."}}, "uncertainties": []}`;
  const user = [
    `\u3010\u5DF2\u6709\u6982\u5FF5\u5361\u3011
${input.existingMarkdown.slice(0, 6e3)}`,
    input.existingCards.length ? `\u3010\u5DF2\u6709\u6982\u5FF5\u5361\u6807\u9898\uFF08\u7528\u4E8E connections \u53CC\u94FE\uFF09\u3011
${input.existingCards.map((c) => `- ${c}`).join("\n")}` : "",
    `\u3010\u7C7B\u578B\u3011${input.type}`
  ].filter(Boolean).join("\n\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}

// src/ai.ts
var AiError = class extends Error {
  constructor(message, status) {
    super(message);
    this.name = "AiError";
    this.status = status;
  }
};
function endpointOf(settings) {
  const base = (settings.baseUrl || "").trim().replace(/\/+$/, "");
  if (!base) throw new AiError("\u672A\u914D\u7F6E Base URL\uFF08\u8BBE\u7F6E \u2192 \u6982\u5FF5\u5361\u751F\u6210\u5668 \u2192 AI \u670D\u52A1\uFF09");
  if (/\/chat\/completions$/.test(base)) return base;
  return `${base}/chat/completions`;
}
function withTimeout(promise, ms, what) {
  const timeoutMs = Math.max(1e3, ms);
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new AiError(`${what}\u8D85\u65F6\uFF08${Math.round(timeoutMs / 1e3)} \u79D2\uFF09`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== void 0) window.clearTimeout(timer);
  });
}
function errorMessageOf(text, status) {
  var _a, _b;
  try {
    const data = JSON.parse(text);
    const msg = (_b = (_a = data == null ? void 0 : data.error) == null ? void 0 : _a.message) != null ? _b : data == null ? void 0 : data.message;
    if (msg) return msg;
  } catch (e) {
  }
  return text.slice(0, 240) || `HTTP ${status}`;
}
async function chat(settings, messages, options = {}) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  if (!settings.apiKey && settings.provider !== "ollama") {
    throw new AiError("\u8FD8\u6CA1\u6709\u914D\u7F6E API Key\uFF1A\u8BBE\u7F6E \u2192 \u6982\u5FF5\u5361\u751F\u6210\u5668 \u2192 AI \u670D\u52A1");
  }
  const payload = {
    model: settings.model,
    messages,
    temperature: (_a = options.temperature) != null ? _a : settings.temperature,
    max_tokens: (_b = options.maxTokens) != null ? _b : settings.maxTokens,
    stream: false
  };
  if (options.json && settings.provider !== "ollama") {
    payload.response_format = { type: "json_object" };
  }
  const headers = { "Content-Type": "application/json" };
  if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;
  const send = async (body) => {
    const param = {
      url: endpointOf(settings),
      method: "POST",
      headers,
      body: JSON.stringify(body),
      throw: false
    };
    try {
      return await (0, import_obsidian.requestUrl)(param);
    } catch (e) {
      throw new AiError(`\u7F51\u7EDC\u8BF7\u6C42\u5931\u8D25\uFF1A${e.message}\u3002\u68C0\u67E5 Base URL / \u4EE3\u7406 / \u6A21\u578B\u670D\u52A1\u662F\u5426\u5728\u8FD0\u884C\u3002`);
    }
  };
  let response = await withTimeout(send(payload), (_c = options.timeoutMs) != null ? _c : settings.timeoutMs, "AI \u8BF7\u6C42");
  if (response.status >= 400 && response.status < 500 && payload.response_format) {
    const firstError = errorMessageOf((_d = response.text) != null ? _d : "", response.status);
    if (/response_format|json_object|unsupported|invalid request/i.test(firstError)) {
      delete payload.response_format;
      response = await withTimeout(send(payload), (_e = options.timeoutMs) != null ? _e : settings.timeoutMs, "AI \u8BF7\u6C42");
    }
  }
  const text = (_f = response.text) != null ? _f : "";
  if (response.status === 401 || response.status === 403) {
    throw new AiError(`API Key \u65E0\u6548\u6216\u6CA1\u6709\u6743\u9650\uFF08HTTP ${response.status}\uFF09\uFF1A${errorMessageOf(text, response.status)}`, response.status);
  }
  if (response.status === 429) {
    throw new AiError("\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\u6216\u989D\u5EA6\u4E0D\u8DB3\uFF08HTTP 429\uFF09\uFF0C\u7A0D\u540E\u518D\u8BD5\u3002", 429);
  }
  if (response.status === 404) {
    throw new AiError(
      `\u63A5\u53E3\u4E0D\u5B58\u5728\uFF08HTTP 404\uFF09\uFF1A${endpointOf(settings)}\u3002\u68C0\u67E5 Base URL \u662F\u5426\u5C11\u4E86 /v1\uFF0C\u6216\u662F\u5426\u586B\u4E86\u5B8C\u6574\u5730\u5740\u3002`,
      404
    );
  }
  if (response.status >= 400) {
    throw new AiError(`AI \u670D\u52A1\u62A5\u9519\uFF08HTTP ${response.status}\uFF09\uFF1A${errorMessageOf(text, response.status)}`, response.status);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new AiError(`AI \u8FD4\u56DE\u7684\u4E0D\u662F JSON\uFF08HTTP ${response.status}\uFF09\uFF1A${text.slice(0, 160)}`);
  }
  const choices = data.choices;
  const content = (_h = (_g = choices == null ? void 0 : choices[0]) == null ? void 0 : _g.message) == null ? void 0 : _h.content;
  let contentText = "";
  if (typeof content === "string") contentText = content;
  else if (Array.isArray(content)) {
    contentText = content.map((part) => {
      var _a2;
      return part && typeof part === "object" ? String((_a2 = part.text) != null ? _a2 : "") : "";
    }).join("");
  }
  if (!contentText.trim()) {
    throw new AiError("AI \u8FD4\u56DE\u4E86\u7A7A\u5185\u5BB9\uFF0C\u8BF7\u68C0\u67E5\u6A21\u578B\u540D\u79F0\u662F\u5426\u6B63\u786E\u3002");
  }
  return contentText;
}
async function askJson(settings, messages, onProgress) {
  const started = Date.now();
  const raw = await chat(settings, messages, { json: true });
  let parsed = extractJson(raw);
  if (!parsed) {
    if (Date.now() - started > settings.timeoutMs) {
      throw new AiError("AI \u8FD4\u56DE\u683C\u5F0F\u5F02\u5E38\uFF0C\u4E14\u5DF2\u8D85\u8FC7\u8BBE\u5B9A\u65F6\u957F\uFF0C\u672A\u7EE7\u7EED\u91CD\u8BD5\u3002");
    }
    onProgress == null ? void 0 : onProgress("\u8F93\u51FA\u683C\u5F0F\u5F02\u5E38\uFF0C\u6B63\u5728\u8BA9 AI \u91CD\u65B0\u6574\u7406\u2026");
    const repair = [
      ...messages,
      { role: "assistant", content: raw.slice(0, 4e3) },
      { role: "user", content: "\u4E0A\u9762\u7684\u8F93\u51FA\u4E0D\u662F\u5408\u6CD5 JSON\u3002\u8BF7\u53EA\u8F93\u51FA\u4E00\u4E2A\u5408\u6CD5 JSON \u5BF9\u8C61\uFF1A\u4E0D\u8981\u4EE3\u7801\u56F4\u680F\uFF0C\u4E0D\u8981\u89E3\u91CA\u3002" }
    ];
    const remaining = Math.max(5e3, settings.timeoutMs - (Date.now() - started));
    const raw2 = await chat(settings, repair, { json: true, temperature: 0.1, timeoutMs: remaining });
    parsed = extractJson(raw2);
    if (!parsed) throw new AiError("AI \u8FDE\u7EED\u4E24\u6B21\u90FD\u6CA1\u6709\u8FD4\u56DE\u5408\u6CD5 JSON\u3002\u5EFA\u8BAE\u6362\u4E00\u4E2A\u6A21\u578B\u6216\u964D\u4F4E\u6E29\u5EA6\u3002");
  }
  return parsed;
}
async function generateCard(settings, input, onProgress) {
  onProgress == null ? void 0 : onProgress(`\u6B63\u5728\u751F\u6210${input.format === "lite" ? "\u7CBE\u7B80\u7248" : "\u5B8C\u6574\u7248"}\u6982\u5FF5\u5361\u2026`);
  const parsed = await askJson(settings, buildMessages(input), onProgress);
  const card = normalizeCardV3(parsed, input.term || "\u672A\u547D\u540D\u6982\u5FF5");
  const required = input.format === "lite" ? ["definition", "examples", "boundaries", "confusions"] : ["definition", "examples", "boundaries", "confusions", "origins", "perspectives"];
  const missing = required.filter((id) => !card.sections[id]);
  if (missing.length === required.length) {
    throw new AiError("AI \u8FD4\u56DE\u7684\u5361\u7247\u6CA1\u6709\u53EF\u7528\u6B63\u6587\uFF0C\u8BF7\u91CD\u8BD5\u6216\u66F4\u6362\u6A21\u578B\u3002");
  }
  return card;
}
async function generateMissingSections(settings, input, onProgress) {
  onProgress == null ? void 0 : onProgress("\u6B63\u5728\u8865\u5168\u5B8C\u6574\u7248\u5C0F\u8282\u2026");
  const parsed = await askJson(settings, buildUpgradeMessages(input), onProgress);
  const card = normalizeCardV3(parsed, "");
  const order = ["origins", "perspectives", "connections"];
  const additions = [];
  for (const id of order) {
    const section = card.sections[id];
    if (section) additions.push({ id, body: section.body, source: section.source });
  }
  if (!additions.length) throw new AiError("AI \u6CA1\u6709\u8FD4\u56DE\u53EF\u8865\u5168\u7684\u5C0F\u8282\uFF0C\u8BF7\u91CD\u8BD5\u3002");
  return additions;
}
async function chooseSubfolder(settings, input) {
  if (!input.candidates.length) return null;
  const messages = [
    {
      role: "system",
      content: '\u4F60\u662F\u77E5\u8BC6\u5E93\u5206\u7C7B\u52A9\u624B\u3002\u53EA\u80FD\u4ECE\u5019\u9009\u76EE\u5F55\u4E2D\u9009\u4E00\u4E2A\u6700\u8D34\u5408\u5361\u7247\u5185\u5BB9\u7684\uFF1B\u4E0D\u786E\u5B9A\u5C31\u8FD4\u56DE\u7A7A\u5B57\u7B26\u4E32\u3002\u53EA\u8F93\u51FA JSON\uFF1A{"folder":"\u76EE\u5F55\u540D"}\uFF0C\u4E0D\u8981\u89E3\u91CA\u3002'
    },
    {
      role: "user",
      content: [
        `\u5361\u7247\uFF1A${input.title}`,
        `\u7C7B\u578B\uFF1A${input.type}`,
        `\u6458\u8981\uFF1A${input.summary}`,
        `\u5019\u9009\u76EE\u5F55\uFF1A`,
        ...input.candidates.map((c) => `- ${c}`)
      ].join("\n")
    }
  ];
  try {
    const raw = await chat(settings, messages, { json: true, maxTokens: 80, temperature: 0 });
    const parsed = extractJson(raw);
    const folder = typeof (parsed == null ? void 0 : parsed.folder) === "string" ? parsed.folder.trim() : "";
    return input.candidates.includes(folder) ? folder : null;
  } catch (e) {
    return null;
  }
}
async function testConnection(settings) {
  const messages = [{ role: "user", content: "\u53EA\u56DE\u590D\u4E24\u4E2A\u5B57\uFF1A\u53EF\u7528" }];
  const text = await chat(settings, messages, { maxTokens: 16, temperature: 0, timeoutMs: 3e4 });
  return text.trim().slice(0, 60);
}

// src/modal.ts
var import_obsidian2 = require("obsidian");
var CardPreviewModal = class extends import_obsidian2.Modal {
  constructor(app, opts) {
    super(app);
    this.dirty = false;
    this.busy = false;
    this.opts = opts;
    this.markdown = opts.markdown;
    this.title = opts.title;
    this.baseName = opts.baseName;
    this.folderPath = opts.folderPath;
    this.needsCreate = opts.needsCreate;
    this.renderWith = opts.renderWith;
    this.filenameFor = opts.filenameFor;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("cc-preview-modal");
    this.modalEl.addClass("cc-modal", "cc-wide");
    contentEl.createEl("h2", { text: "\u6982\u5FF5\u5361\u9884\u89C8" });
    contentEl.createEl("p", {
      cls: "cc-hint",
      text: "\u786E\u8BA4\u5185\u5BB9\u4E0E\u5B58\u653E\u4F4D\u7F6E\uFF1B\u6B63\u6587\u53EF\u4EE5\u76F4\u63A5\u6539\uFF0C\u6539\u8FC7\u7684\u5185\u5BB9\u4E0D\u4F1A\u88AB\u300C\u91CD\u65B0\u751F\u6210\u300D\u8986\u76D6\u3002"
    });
    new import_obsidian2.Setting(contentEl).setName("\u6807\u9898").setDesc("\u5361\u7247\u6807\u9898\uFF1B\u6587\u4EF6\u540D\u6309\u8BBE\u7F6E\u91CC\u7684\u683C\u5F0F\u81EA\u52A8\u751F\u6210").addText((text) => {
      this.titleInput = text.inputEl;
      text.setValue(this.title).onChange((value) => {
        this.title = value;
        this.baseName = sanitizeFilename(this.filenameFor(value)) || "\u672A\u547D\u540D\u6982\u5FF5";
        this.refreshFilename();
        if (!this.dirty) {
          this.markdown = this.renderWith(value);
          this.textarea.value = this.markdown;
        }
      });
    });
    new import_obsidian2.Setting(contentEl).setName("\u4FDD\u5B58\u5230").setDesc("\u9ED8\u8BA4\u6309\u5361\u7247\u7C7B\u578B\u81EA\u52A8\u5339\u914D\u5DF2\u6709\u5B50\u6587\u4EF6\u5939").addDropdown((dd) => {
      this.folderSelect = dd.selectEl;
      dd.addOption(this.folderPath, this.labelFor(this.folderPath));
      for (const folder of this.opts.folders) {
        if (folder === this.folderPath) continue;
        dd.addOption(folder, this.labelFor(folder));
      }
      dd.setValue(this.folderPath).onChange((value) => {
        this.folderPath = value;
        this.needsCreate = value === this.opts.folderPath ? this.opts.needsCreate : false;
        this.refreshFilename();
      });
    });
    this.filenameEl = contentEl.createDiv({ cls: "cc-file-row" }).createEl("span", { cls: "cc-filename" });
    this.textarea = contentEl.createEl("textarea", { cls: "cc-editor" });
    this.textarea.value = this.markdown;
    this.textarea.spellcheck = false;
    this.textarea.addEventListener("input", () => {
      this.markdown = this.textarea.value;
      this.dirty = true;
    });
    const footer = contentEl.createDiv({ cls: "cc-footer" });
    footer.createEl("button", { text: "\u91CD\u65B0\u751F\u6210", cls: "cc-btn" }).addEventListener("click", () => void this.regenerate());
    footer.createEl("button", { text: "\u53D6\u6D88", cls: "cc-btn" }).addEventListener("click", () => this.close());
    footer.createEl("button", { text: "\u4FDD\u5B58\u5361\u7247", cls: "cc-btn mod-cta" }).addEventListener("click", () => void this.save());
    this.scope.register(["Mod"], "Enter", (evt) => {
      evt.preventDefault();
      void this.save();
      return false;
    });
    this.refreshFilename();
    window.setTimeout(() => {
      this.textarea.focus();
      this.textarea.setSelectionRange(0, 0);
    }, 30);
  }
  labelFor(folderPath) {
    if (!folderPath) return "\uFF08\u5E93\u6839\u76EE\u5F55\uFF09";
    const base = this.opts.basePath;
    if (base && folderPath.startsWith(`${base}/`)) return folderPath.slice(base.length + 1);
    return folderPath;
  }
  refreshFilename() {
    if (!this.filenameEl) return;
    const suffix = this.needsCreate ? "\uFF08\u76EE\u5F55\u5C06\u5728\u4FDD\u5B58\u65F6\u521B\u5EFA\uFF09" : "";
    this.filenameEl.setText(`${this.folderPath ? `${this.folderPath}/` : ""}${this.baseName}.md ${suffix}`);
  }
  async regenerate() {
    if (this.busy) return;
    this.busy = true;
    try {
      const result = await this.opts.onRegenerate();
      if (!result) return;
      this.markdown = result.markdown;
      this.title = result.title;
      this.baseName = result.baseName;
      this.folderPath = result.folderPath;
      this.needsCreate = result.needsCreate;
      this.renderWith = result.renderWith;
      this.filenameFor = result.filenameFor;
      this.dirty = false;
      this.textarea.value = this.markdown;
      if (this.titleInput) this.titleInput.value = this.title;
      if (this.folderSelect) {
        if (!this.folderSelect.querySelector(`option[value="${CSS.escape(this.folderPath)}"]`)) {
          this.folderSelect.createEl("option", { value: this.folderPath, text: this.labelFor(this.folderPath) });
        }
        this.folderSelect.value = this.folderPath;
      }
      this.refreshFilename();
    } finally {
      this.busy = false;
    }
  }
  async save() {
    if (this.busy) return;
    if (!this.markdown.trim()) {
      this.markdown = this.renderWith(this.title);
      this.textarea.value = this.markdown;
    }
    this.busy = true;
    try {
      const ok = await this.opts.onSave({ markdown: this.markdown, folderPath: this.folderPath, baseName: this.baseName });
      if (ok) this.close();
    } finally {
      this.busy = false;
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ConfirmModal = class extends import_obsidian2.Modal {
  constructor(app, opts, onConfirm) {
    super(app);
    this.opts = opts;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    this.contentEl.addClass("cc-modal");
    this.contentEl.createEl("h2", { text: this.opts.title });
    const list = this.contentEl.createEl("ul");
    for (const line of this.opts.lines) list.createEl("li", { text: line });
    const footer = this.contentEl.createDiv({ cls: "cc-footer" });
    footer.createEl("button", { text: "\u53D6\u6D88", cls: "cc-btn" }).addEventListener("click", () => this.close());
    footer.createEl("button", { text: this.opts.confirmText || "\u786E\u8BA4", cls: "cc-btn mod-cta" }).addEventListener("click", () => {
      this.close();
      void this.onConfirm();
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var TermInputModal = class extends import_obsidian2.Modal {
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }
  onOpen() {
    this.contentEl.addClass("cc-modal");
    this.contentEl.createEl("h2", { text: "\u751F\u6210\u6982\u5FF5\u5361" });
    this.contentEl.createEl("p", {
      cls: "cc-hint",
      text: "\u8F93\u5165\u4EBA\u540D\u3001\u7406\u8BBA\u6216\u6982\u5FF5\u540D\u79F0\uFF1B\u4E5F\u53EF\u4EE5\u8865\u4E00\u53E5\u5B83\u51FA\u73B0\u5728\u54EA\u6BB5\u6750\u6599\u91CC\uFF0C\u5E2E\u52A9 AI \u8D34\u4F4F\u8BED\u5883\u3002"
    });
    this.textarea = this.contentEl.createEl("textarea", { cls: "cc-input" });
    this.textarea.placeholder = "\u4F8B\u5982\uFF1A\u8BA4\u77E5\u5931\u8C03 / \u5FC3\u6D41 / \u5EFA\u6784\u4E3B\u4E49";
    this.textarea.addEventListener("keydown", (evt) => {
      if (evt.key !== "Enter" || evt.shiftKey) return;
      if (evt.isComposing || evt.keyCode === 229) return;
      evt.preventDefault();
      this.submit();
    });
    const footer = this.contentEl.createDiv({ cls: "cc-footer" });
    footer.createEl("button", { text: "\u53D6\u6D88", cls: "cc-btn" }).addEventListener("click", () => this.close());
    footer.createEl("button", { text: "\u751F\u6210", cls: "cc-btn mod-cta" }).addEventListener("click", () => this.submit());
    window.setTimeout(() => this.textarea.focus(), 30);
  }
  submit() {
    const value = this.textarea.value.trim();
    if (!value) return;
    this.close();
    this.onSubmit(value);
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/daily-note.ts
var import_obsidian4 = require("obsidian");

// src/daily-block.ts
var REVIEW_BLOCK_START = "<!-- concept-card-review:start -->";
var REVIEW_BLOCK_END = "<!-- concept-card-review:end -->";
function buildReviewBlock(cards) {
  if (!cards.length) return "\u4ECA\u5929\u6CA1\u6709\u5230\u671F\u7684\u6982\u5FF5\u5361\u3002";
  const lines = [`\u5171 ${cards.length} \u5F20\u5230\u671F\uFF1A`, ""];
  for (const card of cards) {
    lines.push(`- [[${card.basename}]]\uFF08${card.stage} \xB7 ${card.revisit}\uFF09`);
  }
  return lines.join("\n");
}
function upsertReviewBlock(note, inner) {
  const block = `${REVIEW_BLOCK_START}
${inner}
${REVIEW_BLOCK_END}`;
  const re = new RegExp(`${escapeRegExp2(REVIEW_BLOCK_START)}[\\s\\S]*?${escapeRegExp2(REVIEW_BLOCK_END)}`);
  if (re.test(note)) return note.replace(re, block);
  const trimmed = note.replace(/\s+$/, "");
  return `${trimmed}${trimmed ? "\n\n" : ""}${block}
`;
}
function escapeRegExp2(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/vault.ts
var import_obsidian3 = require("obsidian");
function allFolderPaths(app) {
  const out = [];
  for (const f of app.vault.getAllLoadedFiles()) {
    if (f instanceof import_obsidian3.TFolder && f.path && f.path !== "/") out.push(f.path);
  }
  return out;
}
function safePath(p) {
  const clean = (0, import_obsidian3.normalizePath)(String(p != null ? p : "")).replace(/^\/+|\/+$/g, "");
  return clean.split("/").filter((seg) => seg && seg !== "." && seg !== ".." && seg !== "\\").join("/");
}
function resolveRootFolder(app, settings) {
  if (settings.useVaultRoot) return "";
  const configured = safePath(settings.cardRootFolder || "");
  if (configured) return configured;
  return detectRootFolder(allFolderPaths(app));
}
function listSubfolders(app, root) {
  const target = root ? app.vault.getAbstractFileByPath((0, import_obsidian3.normalizePath)(root)) : app.vault.getRoot();
  if (!(target instanceof import_obsidian3.TFolder)) return [];
  return target.children.filter((c) => c instanceof import_obsidian3.TFolder).map((c) => c.name).filter((name) => !name.startsWith(".")).sort((a, b) => a.localeCompare(b, "zh"));
}
function collectExistingCardTitles(app, root, limit) {
  const prefix = root ? `${(0, import_obsidian3.normalizePath)(root)}/` : "";
  const titles = [];
  const seen = /* @__PURE__ */ new Set();
  for (const file of app.vault.getMarkdownFiles()) {
    if (prefix && !file.path.startsWith(prefix)) continue;
    const base = file.basename;
    if (seen.has(base)) continue;
    seen.add(base);
    titles.push(base);
    if (titles.length >= limit) break;
  }
  return titles;
}
function collectExistingTags(app, root, limit = 80) {
  var _a;
  const prefix = root ? `${safePath(root)}/` : "";
  const tags = /* @__PURE__ */ new Set();
  for (const file of app.vault.getMarkdownFiles()) {
    if (prefix && !file.path.startsWith(prefix)) continue;
    const front = (_a = app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
    if (!front) continue;
    const raw = front.tags;
    const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[,，]/) : [];
    for (const item of list) {
      const tag = String(item).replace(/^#/, "").trim();
      if (!tag) continue;
      tags.add(tag);
      if (tags.size >= limit) return [...tags];
    }
  }
  return [...tags];
}
function getFolder(app, path) {
  if (!path) return app.vault.getRoot();
  const item = app.vault.getAbstractFileByPath((0, import_obsidian3.normalizePath)(path));
  return item instanceof import_obsidian3.TFolder ? item : null;
}
async function ensureFolder(app, path) {
  const clean = safePath(path);
  if (!clean) return;
  const segs = clean.split("/");
  let current = "";
  for (const seg of segs) {
    current = current ? `${current}/${seg}` : seg;
    const existing = app.vault.getAbstractFileByPath(current);
    if (existing instanceof import_obsidian3.TFolder) continue;
    if (existing instanceof import_obsidian3.TFile) throw new Error(`\u521B\u5EFA\u76EE\u5F55\u5931\u8D25\uFF1A${current} \u5DF2\u662F\u4E00\u4E2A\u6587\u4EF6`);
    try {
      await app.vault.createFolder(current);
    } catch (e) {
      const again = app.vault.getAbstractFileByPath(current);
      if (!(again instanceof import_obsidian3.TFolder)) throw e;
    }
  }
}
function folderExists(app, path) {
  if (!path) return true;
  return app.vault.getAbstractFileByPath(safePath(path)) instanceof import_obsidian3.TFolder;
}
function existingNamesInFolder(app, folderPath) {
  const folder = getFolder(app, folderPath);
  const names = /* @__PURE__ */ new Set();
  if (!folder) return names;
  for (const child of folder.children) {
    if (child instanceof import_obsidian3.TFile && child.extension === "md") names.add(child.basename.toLowerCase());
  }
  return names;
}
function getFileByName(app, folderPath, name) {
  const folder = getFolder(app, folderPath);
  if (!folder) return null;
  const target = name.toLowerCase();
  for (const child of folder.children) {
    if (child instanceof import_obsidian3.TFile && child.extension === "md" && child.basename.toLowerCase() === target) {
      return child;
    }
  }
  return null;
}
function findCardsByTitle(app, title) {
  var _a, _b;
  const key = titleKey(title);
  if (!key) return [];
  const hits = [];
  for (const file of app.vault.getMarkdownFiles()) {
    if (titleKey(file.basename) === key) {
      hits.push(file);
      continue;
    }
    const front = (_a = app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
    if (!front) continue;
    const fmTitle = typeof front.title === "string" ? front.title : "";
    if (fmTitle && titleKey(fmTitle) === key) {
      hits.push(file);
      continue;
    }
    const rawAliases = (_b = front.aliases) != null ? _b : front.alias;
    const aliases = Array.isArray(rawAliases) ? rawAliases : typeof rawAliases === "string" ? [rawAliases] : [];
    if (aliases.some((a) => titleKey(String(a)) === key)) hits.push(file);
  }
  return hits;
}
async function openFileInWorkspace(app, file, newTab = true) {
  const leaf = newTab ? app.workspace.getLeaf("tab") : app.workspace.getLeaf(false);
  await leaf.openFile(file);
}

// src/daily-note.ts
function pad(n) {
  return String(n).padStart(2, "0");
}
function formatDate(now, format) {
  const m = window.moment;
  if (m) return m(now).format(format);
  return format.replace(/YYYY/g, String(now.getFullYear())).replace(/MM/g, pad(now.getMonth() + 1)).replace(/DD/g, pad(now.getDate()));
}
function expandFolder(folder, date) {
  return folder.replace(/\{YYYY\}/g, String(date.getFullYear())).replace(/\{MM\}/g, pad(date.getMonth() + 1)).replace(/\{DD\}/g, pad(date.getDate()));
}
function resolveDailyNotePath(app, settings, now = /* @__PURE__ */ new Date()) {
  const rawFolder = (settings.dailyNoteFolder || "").replace(/^\/+|\/+$/g, "");
  const folder = expandFolder(rawFolder, now);
  const format = settings.dailyNoteFormat || "YYYY-MM-DD";
  const name = formatDate(now, format);
  return (0, import_obsidian4.normalizePath)(folder ? `${folder}/${name}.md` : `${name}.md`);
}
function dailyNotePathForDate(app, settings, dateKey) {
  const [y, m, d] = dateKey.split("-").map((n) => Number(n));
  const date = new Date(y, (m || 1) - 1, d || 1);
  return resolveDailyNotePath(app, settings, date);
}
function folderOf(path) {
  return path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
}
async function writeCardsToDate(app, settings, dateKey, cards, createIfMissing = false) {
  const path = dailyNotePathForDate(app, settings, dateKey);
  let file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof import_obsidian4.TFile)) {
    if (!createIfMissing) return { path, ok: false, missing: true };
    const parent = folderOf(path);
    if (parent) await ensureFolder(app, parent);
    await app.vault.create(path, `# ${dateKey}
`);
    file = app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian4.TFile)) return { path, ok: false, missing: true };
  }
  const block = buildReviewBlock(
    cards.map((c) => ({ basename: c.file.basename, stage: c.stage, revisit: c.revisit }))
  );
  const content = await app.vault.read(file);
  const next = upsertReviewBlock(content, block);
  if (next !== content) await app.vault.modify(file, next);
  return { path, ok: true };
}
async function writeDueCardsToDailyNote(app, settings, cards, now = /* @__PURE__ */ new Date()) {
  const dateKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return writeCardsToDate(app, settings, dateKey, cards, false);
}

// src/review.ts
function todayKey(now = /* @__PURE__ */ new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
function cardsWithRevisit(app) {
  var _a, _b, _c;
  const out = [];
  for (const file of app.vault.getMarkdownFiles()) {
    const front = (_a = app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
    if (!front || !front.card_format) continue;
    const revisit = String((_b = front.revisit) != null ? _b : "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(revisit)) continue;
    out.push({ file, revisit, stage: String((_c = front.stage) != null ? _c : "\u5E7C\u82D7") });
  }
  return out;
}
function addDaysKey(dateKey, days) {
  const [y, m, d] = dateKey.split("-").map((n) => Number(n));
  const date = new Date(y, (m || 1) - 1, (d || 1) + days);
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
function findReviewCards(app, today = todayKey()) {
  return cardsWithRevisit(app).map((c) => ({ ...c, due: c.revisit <= today })).sort((a, b) => a.revisit.localeCompare(b.revisit));
}
function findDueCards(app, today = todayKey()) {
  return findReviewCards(app, today).filter((c) => c.due);
}

// src/review-view.ts
var import_obsidian5 = require("obsidian");
var REVIEW_VIEW_TYPE = "concept-card-reviews";
var ConceptReviewView = class extends import_obsidian5.ItemView {
  constructor(leaf, host) {
    super(leaf);
    this.host = host;
  }
  getViewType() {
    return REVIEW_VIEW_TYPE;
  }
  getDisplayText() {
    return "\u6982\u5FF5\u5361\u590D\u67E5";
  }
  getIcon() {
    return "graduation-cap";
  }
  async onOpen() {
    this.render();
  }
  render() {
    const el = this.contentEl;
    el.empty();
    el.createEl("h4", { text: "\u6982\u5FF5\u5361\u590D\u67E5" });
    const cards = this.host.getReviewCards();
    if (!cards.length) {
      el.createEl("p", { text: "\u8FD8\u6CA1\u6709\u5B89\u6392\u590D\u67E5\u7684\u5361\u7247\u3002\u5728\u5361\u7247\u4E0A\u53F3\u952E\u300C\u5B89\u6392\u590D\u67E5\uFF08\u6309\u5F53\u524D\u9636\u6BB5\uFF09\u300D\u5373\u53EF\u3002", cls: "cc-muted" });
      return;
    }
    const due = cards.filter((c) => c.due);
    const upcoming = cards.filter((c) => !c.due);
    el.createEl("p", {
      text: `\u5171 ${cards.length} \u5F20\u5728\u590D\u67E5\u4E2D\uFF0C${due.length} \u5F20\u5DF2\u5230\u671F`,
      cls: "cc-muted"
    });
    this.renderSection(el, "\u5DF2\u5230\u671F", due, "\u6CA1\u6709\u5230\u671F\u7684\u5361\u7247\u3002");
    this.renderSection(el, "\u5373\u5C06\u590D\u67E5", upcoming, "\u6CA1\u6709\u6392\u671F\u7684\u5361\u7247\u3002");
  }
  renderSection(parent, title, cards, emptyText) {
    parent.createEl("h5", { text: `${title}\uFF08${cards.length}\uFF09` });
    if (!cards.length) {
      parent.createEl("p", { text: emptyText, cls: "cc-muted" });
      return;
    }
    for (const item of cards) {
      const row = parent.createDiv({ cls: "cc-review-row" });
      const titleEl = row.createEl("a", { text: item.file.basename, cls: "cc-review-title" });
      titleEl.addEventListener("click", (evt) => {
        evt.preventDefault();
        this.host.openCard(item.file);
      });
      row.createEl("span", { text: `${item.stage} \xB7 ${item.revisit}`, cls: "cc-review-meta" });
      const actions = row.createDiv({ cls: "cc-review-actions" });
      actions.createEl("button", { text: "\u5DF2\u590D\u67E5" }).addEventListener("click", () => {
        void this.host.markReviewed(item.file).then(() => this.render());
      });
      actions.createEl("button", { text: "\u5E38\u9752" }).addEventListener("click", () => {
        void this.host.markEvergreen(item.file).then(() => this.render());
      });
    }
  }
  async onClose() {
    this.contentEl.empty();
  }
};

// src/settings.ts
var import_obsidian6 = require("obsidian");

// src/types.ts
var CARD_TYPES = ["\u4EBA\u7269", "\u7406\u8BBA", "\u6982\u5FF5", "\u65B9\u6CD5", "\u4E8B\u4EF6", "\u4F5C\u54C1", "\u672F\u8BED", "\u7EC4\u7EC7"];
var DEFAULT_SUBFOLDER_MAP = {
  \u4EBA\u7269: "",
  \u7406\u8BBA: "",
  \u6982\u5FF5: "",
  \u65B9\u6CD5: "",
  \u4E8B\u4EF6: "",
  \u4F5C\u54C1: "",
  \u672F\u8BED: "",
  \u7EC4\u7EC7: ""
};
var DEFAULT_SETTINGS = {
  useVaultRoot: false,
  autoMatchSubfolders: true,
  aiSubfolder: true,
  cardRootFolder: "",
  subfolderMap: { ...DEFAULT_SUBFOLDER_MAP },
  autoCreateSubfolder: false,
  reviewIntervals: { \u5E7C\u82D7: 7, \u6210\u957F: 14, \u5E38\u9752: 90 },
  stageSuggestions: true,
  reviewReminder: true,
  dailyNoteReminder: true,
  dailyNoteFolder: "",
  dailyNoteFormat: "",
  dailyNoteHorizonDays: 30,
  language: "zh",
  bilingual: true,
  includeContext: true,
  contextChars: 600,
  linkExistingCards: true,
  maxExistingCards: 150,
  extraInstructions: "",
  previewBeforeSave: false,
  openAfterCreate: true,
  linkBackToSource: true,
  filenamePattern: "title",
  onDuplicate: "open",
  readingViewMenu: true,
  showRibbon: true,
  provider: "openai",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
  temperature: 0.4,
  maxTokens: 2e3,
  timeoutMs: 6e4
};

// src/settings.ts
var PROVIDER_PRESETS = {
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  deepseek: { label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  ollama: { label: "Ollama\uFF08\u672C\u5730\uFF09", baseUrl: "http://127.0.0.1:11434/v1", model: "qwen2.5:7b" }
};
function deferSave(plugin) {
  let timer;
  return () => {
    if (timer !== void 0) window.clearTimeout(timer);
    timer = window.setTimeout(() => void plugin.saveSettings(), 400);
  };
}
var ConceptCardSettingTab = class extends import_obsidian6.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.folders = [];
    this.plugin = plugin;
  }
  display() {
    var _a;
    const { containerEl } = this;
    containerEl.empty();
    this.folders = allFolderPaths(this.app).sort((a, b) => a.localeCompare(b, "zh"));
    const settings = this.plugin.settings;
    const saveSoon = deferSave(this.plugin);
    const root = resolveRootFolder(this.app, settings) || "";
    const detected = this.detectRoot();
    const subfolders = listSubfolders(this.app, root);
    containerEl.createEl("h2", { text: "\u6982\u5FF5\u5361\u751F\u6210\u5668" });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "\u9009\u4E2D\u4EBA\u540D / \u7406\u8BBA / \u6982\u5FF5 \u2192 \u53F3\u952E\u300C\u751F\u6210\u6982\u5FF5\u5361\u300D\u2192 AI \u751F\u6210\u5361\u7247\u5E76\u5F52\u6863\u5230\u77E5\u8BC6\u5E93\u3002\u9605\u8BFB\u89C6\u56FE\u7684\u53F3\u952E\u83DC\u5355\u7531\u672C\u63D2\u4EF6\u63A5\u7BA1\uFF0C\u53EF\u7528\u4E0B\u65B9\u5F00\u5173\u5173\u95ED\u3002"
    });
    containerEl.createEl("h3", { text: "\u5F52\u6863\u4F4D\u7F6E" });
    new import_obsidian6.Setting(containerEl).setName("\u6982\u5FF5\u5361\u653E\u5728\u5E93\u6839\u76EE\u5F55").setDesc("\u6839\u76EE\u5F55\u76F4\u63A5\u8BBE\u4E3A\u5E93\u6839\uFF08\u8DF3\u8FC7\u81EA\u52A8\u68C0\u6D4B\uFF09\uFF1B\u5361\u7247\u4ECD\u4F1A\u6309\u4E0B\u65B9\u89C4\u5219\u8FDB\u5165\u6839\u4E0B\u7684\u5B50\u6587\u4EF6\u5939\uFF0C\u6BD4\u5982 3.\u57FA\u672C\u6982\u5FF5").addToggle(
      (toggle) => toggle.setValue(settings.useVaultRoot).onChange(async (value) => {
        settings.useVaultRoot = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u6982\u5FF5\u5361\u6839\u76EE\u5F55").setDesc(
      settings.useVaultRoot ? "\u5F53\u524D\uFF1A\u5E93\u6839\u76EE\u5F55\uFF08\u5173\u95ED\u4E0A\u65B9\u5F00\u5173\u53EF\u6539\u7528\u6307\u5B9A\u76EE\u5F55\uFF09" : `\u7559\u7A7A\u5219\u81EA\u52A8\u68C0\u6D4B\u3002\u5F53\u524D\u68C0\u6D4B\u5230\uFF1A${detected || "\uFF08\u6CA1\u6709\u5339\u914D\u76EE\u5F55\uFF0C\u5C06\u653E\u5728\u5E93\u6839\u76EE\u5F55\uFF09"}\u3002\u5F53\u524D\u4F7F\u7528\uFF1A${root || "\u5E93\u6839\u76EE\u5F55"}`
    ).addText((text) => {
      text.inputEl.disabled = settings.useVaultRoot;
      text.setPlaceholder("\u4F8B\u5982\uFF1A\u77E5\u8BC6\u5E93/\u6982\u5FF5\u5361").setValue(settings.cardRootFolder).onChange(async (value) => {
        settings.cardRootFolder = value.trim();
        await this.plugin.saveSettings();
      });
    }).addButton((btn) => {
      btn.setDisabled(settings.useVaultRoot);
      btn.setButtonText("\u586B\u5165\u68C0\u6D4B\u7ED3\u679C").onClick(async () => {
        if (!detected) {
          new import_obsidian6.Notice("\u6CA1\u6709\u68C0\u6D4B\u5230\u5408\u9002\u7684\u76EE\u5F55\uFF0C\u8BF7\u624B\u52A8\u586B\u5199");
          return;
        }
        settings.cardRootFolder = detected;
        await this.plugin.saveSettings();
        this.display();
      });
    }).addButton((btn) => {
      btn.setDisabled(settings.useVaultRoot);
      btn.setButtonText("\u9009\u62E9\u5DF2\u6709\u76EE\u5F55").onClick(
        (evt) => this.showFolderPicker(evt, async (path) => {
          settings.cardRootFolder = path;
          await this.plugin.saveSettings();
          this.display();
        })
      );
    });
    new import_obsidian6.Setting(containerEl).setName("\u81EA\u52A8\u5339\u914D\u5B50\u6587\u4EF6\u5939").setDesc("\u5F00\u542F\uFF1A\u6309\u7C7B\u578B\u5173\u952E\u8BCD\u5728\u6839\u76EE\u5F55\u4E0B\u627E\u73B0\u6210\u5B50\u6587\u4EF6\u5939\uFF08\u5982 \u6982\u5FF5 \u2192 3.\u57FA\u672C\u6982\u5FF5\u3001\u4F5C\u54C1 \u2192 1..\u4E66\u7C4D\u3001\u6587\u732E\uFF09\uFF1B\u5173\u95ED\uFF1A\u53EA\u8BA4\u4E0B\u65B9\u663E\u5F0F\u6307\u5B9A\u7684\u7C7B\u578B\u76EE\u5F55").addToggle(
      (toggle) => toggle.setValue(settings.autoMatchSubfolders).onChange(async (value) => {
        settings.autoMatchSubfolders = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("AI \u9009\u62E9\u4E0B\u7EA7\u5B50\u6587\u4EF6\u5939").setDesc("\u76EE\u6807\u6587\u4EF6\u5939\u91CC\u8FD8\u6709\u5B50\u6587\u4EF6\u5939\u65F6\uFF0C\u8BA9 AI \u6839\u636E\u5361\u7247\u5185\u5BB9\u518D\u9009\u4E00\u5C42\uFF08\u4F8B\u5982 3.\u57FA\u672C\u6982\u5FF5 \u2192 3.\u57FA\u672C\u6982\u5FF5/\u5FC3\u7406\u5B66\uFF09\uFF1B\u5931\u8D25\u5219\u7559\u5728\u539F\u76EE\u5F55").addToggle(
      (toggle) => toggle.setValue(settings.aiSubfolder).onChange(async (value) => {
        settings.aiSubfolder = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u627E\u4E0D\u5230\u5339\u914D\u5B50\u6587\u4EF6\u5939\u65F6").setDesc("\u5173\u95ED\uFF1A\u76F4\u63A5\u653E\u5728\u6839\u76EE\u5F55\uFF1B\u5F00\u542F\uFF1A\u6309\u7C7B\u578B\u65B0\u5EFA\u5B50\u6587\u4EF6\u5939\uFF08\u5982\u300C\u7406\u8BBA\u300D\uFF09").addToggle(
      (toggle) => toggle.setValue(settings.autoCreateSubfolder).onChange(async (value) => {
        settings.autoCreateSubfolder = value;
        await this.plugin.saveSettings();
      })
    );
    if (subfolders.length) {
      containerEl.createEl("p", {
        cls: "setting-item-description",
        text: `\u6839\u76EE\u5F55\u4E0B\u5DF2\u6709\u5B50\u6587\u4EF6\u5939\uFF1A${subfolders.join(" / ")}`
      });
    } else {
      containerEl.createEl("p", {
        cls: "setting-item-description",
        text: "\u6839\u76EE\u5F55\u4E0B\u8FD8\u6CA1\u6709\u5B50\u6587\u4EF6\u5939\uFF1B\u5EFA\u8BAE\u5148\u5EFA\u597D\u51E0\u4E2A\u5E38\u7528\u5206\u7C7B\uFF0C\u63D2\u4EF6\u4F1A\u628A\u4E0D\u540C\u5361\u7247\u5206\u522B\u653E\u8FDB\u53BB\u3002"
      });
    }
    for (const type of CARD_TYPES) {
      const current = (_a = settings.subfolderMap[type]) != null ? _a : "";
      const desc = (value) => value.trim() ? `\u56FA\u5B9A\u5F52\u6863\u5230\uFF1A${resolveMappedPath(value, root) || "\uFF08\u5E93\u6839\u76EE\u5F55\uFF09"}` : "\u7559\u7A7A = \u81EA\u52A8\u5339\u914D\uFF08\u627E\u540D\u5B57\u91CC\u542B\u8BE5\u7C7B\u578B\u5173\u952E\u8BCD\u7684\u5B50\u6587\u4EF6\u5939\uFF09";
      const row = new import_obsidian6.Setting(containerEl).setName(`${type}\u7C7B\u5361\u7247`).setDesc(desc(current));
      row.addText(
        (text) => text.setPlaceholder("\u5B50\u6587\u4EF6\u5939\u540D\uFF0C\u6216\u5E93\u5185\u8DEF\u5F84\uFF0C\u5982 3-\u77E5\u8BC6/\u4EBA\u7269\u5361").setValue(current).onChange((value) => {
          settings.subfolderMap[type] = value.trim();
          row.setDesc(desc(value));
          saveSoon();
        })
      );
      row.addButton(
        (btn) => btn.setButtonText("\u9009\u62E9\u76EE\u5F55").onClick(
          (evt) => this.showFolderPicker(evt, async (path) => {
            settings.subfolderMap[type] = path;
            await this.plugin.saveSettings();
            this.display();
          })
        )
      );
    }
    containerEl.createEl("h3", { text: "\u5361\u7247\u5185\u5BB9" });
    new import_obsidian6.Setting(containerEl).setName("\u5361\u7247\u8BED\u8A00").setDesc("\u9ED8\u8BA4\u7B80\u4F53\u4E2D\u6587\uFF1B\u300C\u8DDF\u968F\u539F\u6587\u300D\u4F1A\u6309\u6750\u6599\u8BED\u8A00\u51FA\u5361").addDropdown(
      (dd) => dd.addOption("zh", "\u7B80\u4F53\u4E2D\u6587\uFF08\u9ED8\u8BA4\uFF09").addOption("auto", "\u8DDF\u968F\u539F\u6587").addOption("en", "English").setValue(settings.language).onChange(async (value) => {
        settings.language = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u4E2D\u82F1\u5BF9\u7167").setDesc("\u4E2D\u6587\u5361\u7247\u91CC\uFF0C\u91CD\u8981\u4EBA\u540D\u3001\u7406\u8BBA\u3001\u8457\u4F5C\u3001\u6982\u5FF5\u9996\u6B21\u51FA\u73B0\u65F6\u5199\u6210\u300C\u4E2D\u6587\uFF08English\uFF09\u300D\uFF0C\u82F1\u6587\u539F\u540D\u540C\u65F6\u8FDB aliases").addToggle(
      (toggle) => toggle.setValue(settings.bilingual).onChange(async (value) => {
        settings.bilingual = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u5E26\u4E0A\u4E0A\u4E0B\u6587").setDesc("\u628A\u9009\u4E2D\u6587\u5B57\u524D\u540E\u7684\u6BB5\u843D\u4E00\u8D77\u53D1\u7ED9 AI\uFF0C\u5361\u7247\u4F1A\u66F4\u8D34\u8FD1\u539F\u6587\u8BED\u5883").addToggle(
      (toggle) => toggle.setValue(settings.includeContext).onChange(async (value) => {
        settings.includeContext = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u4E0A\u4E0B\u6587\u5B57\u6570").setDesc("\u524D\u540E\u5408\u8BA1\u5927\u7EA6\u53D6\u591A\u5C11\u5B57\uFF08200-3000\uFF09").addText((text) => {
      text.inputEl.type = "number";
      text.setValue(String(settings.contextChars)).onChange(async (value) => {
        const n = Number(value);
        if (Number.isFinite(n)) {
          settings.contextChars = Math.max(200, Math.min(3e3, Math.round(n)));
          await this.plugin.saveSettings();
        }
      });
    });
    new import_obsidian6.Setting(containerEl).setName("\u5173\u8054\u5DF2\u6709\u5361\u7247").setDesc("\u628A\u77E5\u8BC6\u5E93\u91CC\u5DF2\u6709\u7684\u5361\u7247\u6807\u9898\u53D1\u7ED9 AI\uFF0C\u8BA9\u5B83\u5728\u76F8\u5173\u6982\u5FF5\u91CC\u76F4\u63A5\u5199\u53CC\u94FE").addToggle(
      (toggle) => toggle.setValue(settings.linkExistingCards).onChange(async (value) => {
        settings.linkExistingCards = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u5173\u8054\u5361\u7247\u6570\u91CF\u4E0A\u9650").setDesc("\u6807\u9898\u592A\u591A\u4F1A\u6D6A\u8D39 token\uFF0C\u4E00\u822C 100-200 \u8DB3\u591F").addText((text) => {
      text.inputEl.type = "number";
      text.setValue(String(settings.maxExistingCards)).onChange(async (value) => {
        const n = Number(value);
        if (Number.isFinite(n)) {
          settings.maxExistingCards = Math.max(0, Math.min(1e3, Math.round(n)));
          await this.plugin.saveSettings();
        }
      });
    });
    new import_obsidian6.Setting(containerEl).setName("\u989D\u5916\u5199\u4F5C\u8981\u6C42").setDesc("\u4F1A\u8FFD\u52A0\u5230\u63D0\u793A\u8BCD\u91CC\uFF0C\u4F8B\u5982\uFF1A\u591A\u4E3E\u4E2D\u56FD\u8BED\u5883\u4E0B\u7684\u4F8B\u5B50 / \u9762\u5411\u9AD8\u4E2D\u751F / \u6BCF\u6BB5\u4E0D\u8D85\u8FC7\u4E09\u53E5\u8BDD").addTextArea((area) => {
      area.setPlaceholder("\u53EF\u9009").setValue(settings.extraInstructions).onChange((value) => {
        settings.extraInstructions = value;
        saveSoon();
      });
      area.inputEl.rows = 3;
    });
    containerEl.createEl("h3", { text: "\u4FDD\u5B58\u884C\u4E3A" });
    new import_obsidian6.Setting(containerEl).setName("\u4FDD\u5B58\u524D\u9884\u89C8").setDesc("\u5F00\u542F\uFF1A\u751F\u6210\u540E\u5148\u5F39\u7A97\u786E\u8BA4\uFF08\u53EF\u6539\u6807\u9898\u3001\u6B63\u6587\u3001\u76EE\u5F55\uFF09\uFF1B\u5173\u95ED\uFF1A\u76F4\u63A5\u5199\u5165\u5E76\u6253\u5F00").addToggle(
      (toggle) => toggle.setValue(settings.previewBeforeSave).onChange(async (value) => {
        settings.previewBeforeSave = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u751F\u6210\u540E\u6253\u5F00\u5361\u7247").addToggle(
      (toggle) => toggle.setValue(settings.openAfterCreate).onChange(async (value) => {
        settings.openAfterCreate = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u81EA\u52A8\u5EFA\u7ACB\u53CC\u5411\u94FE\u63A5").setDesc("\u65B0\u5EFA\u6216\u547D\u4E2D\u5DF2\u6709\u5361\u7247\u540E\uFF0C\u81EA\u52A8\u628A\u539F\u6587\u91CC\u7684\u9009\u4E2D\u5173\u952E\u8BCD\u53D8\u6210 [[\u5361\u7247]] \u53CC\u94FE\uFF1B\u9605\u8BFB\u89C6\u56FE\u4E5F\u4F1A\u5199\u56DE\u6587\u4EF6\uFF08\u957F\u6BB5\u843D\u4FDD\u7559\u539F\u6587\uFF0C\u53EA\u5728\u672B\u5C3E\u8865\u94FE\u63A5\uFF09").addToggle(
      (toggle) => toggle.setValue(settings.linkBackToSource).onChange(async (value) => {
        settings.linkBackToSource = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u6587\u4EF6\u540D\u683C\u5F0F").addDropdown(
      (dd) => dd.addOption("title", "\u6982\u5FF5\u540D").addOption("type-title", "\u7C7B\u578B-\u6982\u5FF5\u540D").addOption("title-type", "\u6982\u5FF5\u540D\uFF08\u7C7B\u578B\uFF09").setValue(settings.filenamePattern).onChange(async (value) => {
        settings.filenamePattern = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u540C\u540D\u5361\u7247").addDropdown(
      (dd) => dd.addOption("open", "\u6253\u5F00\u5DF2\u6709\u7684").addOption("suffix", "\u65B0\u5EFA\u5E76\u52A0 -2 \u540E\u7F00").addOption("overwrite", "\u8986\u76D6\u5DF2\u6709\u5185\u5BB9").setValue(settings.onDuplicate).onChange(async (value) => {
        settings.onDuplicate = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "\u590D\u67E5\u4E0E\u9636\u6BB5" });
    const intervalRows = [
      { key: "\u5E7C\u82D7", label: "\u5E7C\u82D7\u590D\u67E5\u95F4\u9694\uFF08\u5929\uFF09" },
      { key: "\u6210\u957F", label: "\u6210\u957F\u590D\u67E5\u95F4\u9694\uFF08\u5929\uFF09" },
      { key: "\u5E38\u9752", label: "\u5E38\u9752\u590D\u67E5\u95F4\u9694\uFF08\u5929\uFF09" }
    ];
    for (const row of intervalRows) {
      new import_obsidian6.Setting(containerEl).setName(row.label).addText((text) => {
        var _a2;
        text.inputEl.type = "number";
        text.setValue(String((_a2 = settings.reviewIntervals[row.key]) != null ? _a2 : 14)).onChange(async (value) => {
          const n = Number(value);
          if (Number.isFinite(n) && n > 0) {
            settings.reviewIntervals[row.key] = Math.max(1, Math.min(365, Math.round(n)));
            await this.plugin.saveSettings();
          }
        });
      });
    }
    new import_obsidian6.Setting(containerEl).setName("\u9636\u6BB5\u5EFA\u8BAE").setDesc("\u6253\u5F00\u5361\u7247\u65F6\uFF0C\u5982\u679C\u7559\u767D\u5DF2\u586B\u5199\uFF0C\u63D0\u793A\u53EF\u5347\u7EA7\u9636\u6BB5\uFF08\u4E0D\u4F1A\u81EA\u52A8\u6539\uFF09").addToggle(
      (toggle) => toggle.setValue(settings.stageSuggestions).onChange(async (value) => {
        settings.stageSuggestions = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u542F\u52A8\u65F6\u63D0\u793A\u5230\u671F\u590D\u67E5").setDesc("\u6253\u5F00 Obsidian \u65F6\uFF0C\u5982\u679C\u6709\u5230\u671F\u7684\u6982\u5FF5\u5361\uFF0C\u5F39\u4E00\u6B21\u63D0\u793A\uFF08\u53F3\u4E0B\u89D2\u72B6\u6001\u680F\u4E5F\u4F1A\u663E\u793A\u6570\u91CF\uFF09").addToggle(
      (toggle) => toggle.setValue(settings.reviewReminder).onChange(async (value) => {
        settings.reviewReminder = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u5199\u5165\u4ECA\u65E5\u65E5\u8BB0").setDesc("\u542F\u52A8\u6216\u590D\u67E5\u540E\uFF0C\u628A\u4ECA\u65E5\u5230\u671F\u7684\u5361\u7247\u5199\u8FDB\u4ECA\u5929\u7684\u65E5\u8BB0\uFF1B\u7528\u4E00\u4E2A\u81EA\u52A8\u6807\u8BB0\u5757\uFF0C\u91CD\u590D\u6267\u884C\u4E0D\u4F1A\u91CD\u590D\u6DFB\u52A0\uFF08\u65E5\u8BB0\u4E0D\u5B58\u5728\u65F6\u4E0D\u4F1A\u81EA\u52A8\u521B\u5EFA\uFF09").addToggle(
      (toggle) => toggle.setValue(settings.dailyNoteReminder).onChange(async (value) => {
        settings.dailyNoteReminder = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u65E5\u8BB0\u6587\u4EF6\u5939").setDesc("\u4F8B\u5982 Daily Notes/\u6211\u7684/{YYYY}\u5E74\uFF1B{YYYY}/{MM}/{DD} \u4F1A\u6309\u76EE\u6807\u65E5\u671F\u66FF\u6362\uFF1B\u7559\u7A7A = \u5E93\u6839\u76EE\u5F55").addText(
      (text) => text.setPlaceholder("\u4F8B\u5982\uFF1A\u65E5\u8BB0").setValue(settings.dailyNoteFolder).onChange((value) => {
        settings.dailyNoteFolder = value.trim();
        saveSoon();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u65E5\u8BB0\u6587\u4EF6\u540D\u683C\u5F0F").setDesc("\u4F8B\u5982 YYYY-MM-DD\uFF1B\u7559\u7A7A\u9ED8\u8BA4 YYYY-MM-DD").addText(
      (text) => text.setPlaceholder("YYYY-MM-DD").setValue(settings.dailyNoteFormat).onChange((value) => {
        settings.dailyNoteFormat = value.trim();
        saveSoon();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u63D0\u524D\u9884\u5199\u5929\u6570").setDesc("\u542F\u52A8\u65F6\uFF0C\u4E3A\u672A\u6765\u591A\u5C11\u5929\u5185\u5230\u671F\u7684\u5361\u7247\u9884\u5199\u90A3\u5929\u7684\u65E5\u8BB0\uFF080 = \u4E0D\u9884\u5199\uFF0C\u53EA\u5728\u5B89\u6392\u590D\u67E5\u65F6\u5199\uFF09").addText((text) => {
      text.inputEl.type = "number";
      text.setValue(String(settings.dailyNoteHorizonDays)).onChange(async (value) => {
        const n = Number(value);
        if (Number.isFinite(n)) {
          settings.dailyNoteHorizonDays = Math.max(0, Math.min(365, Math.round(n)));
          await this.plugin.saveSettings();
        }
      });
    });
    containerEl.createEl("h3", { text: "\u4EA4\u4E92" });
    new import_obsidian6.Setting(containerEl).setName("\u9605\u8BFB\u89C6\u56FE\u53F3\u952E\u83DC\u5355").setDesc("\u9605\u8BFB\u6A21\u5F0F\u4E0B\u9009\u4E2D\u6587\u5B57\u540E\u53F3\u952E\uFF0C\u4F1A\u663E\u793A\u63D2\u4EF6\u81EA\u5DF1\u7684\u83DC\u5355\uFF08\u5305\u542B\u300C\u751F\u6210\u6982\u5FF5\u5361\u300D\u4E0E\u300C\u590D\u5236\u300D\uFF09").addToggle(
      (toggle) => toggle.setValue(settings.readingViewMenu).onChange(async (value) => {
        settings.readingViewMenu = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u5DE6\u4FA7\u680F\u56FE\u6807").setDesc("\u6539\u52A8\u540E\u9700\u8981\u91CD\u65B0\u52A0\u8F7D\u63D2\u4EF6\uFF08\u6216\u5728\u547D\u4EE4\u9762\u677F\u6267\u884C\u300C\u91CD\u65B0\u52A0\u8F7D\u5E94\u7528\u300D\uFF09").addToggle(
      (toggle) => toggle.setValue(settings.showRibbon).onChange(async (value) => {
        settings.showRibbon = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "AI \u670D\u52A1" });
    new import_obsidian6.Setting(containerEl).setName("\u670D\u52A1\u5546").setDesc("\u9009\u62E9\u540E\u4F1A\u586B\u5165\u9ED8\u8BA4 Base URL \u4E0E\u6A21\u578B\uFF0C\u53EF\u518D\u624B\u52A8\u6539").addDropdown((dd) => {
      dd.addOption("openai", "OpenAI");
      dd.addOption("deepseek", "DeepSeek");
      dd.addOption("ollama", "Ollama\uFF08\u672C\u5730\uFF09");
      dd.addOption("custom", "\u81EA\u5B9A\u4E49\uFF08OpenAI \u517C\u5BB9\uFF09");
      dd.setValue(settings.provider).onChange(async (value) => {
        settings.provider = value;
        if (value !== "custom" && value in PROVIDER_PRESETS) {
          const preset = PROVIDER_PRESETS[value];
          settings.baseUrl = preset.baseUrl;
          settings.model = preset.model;
        }
        await this.plugin.saveSettings();
        this.display();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("Base URL").setDesc("OpenAI \u517C\u5BB9\u63A5\u53E3\u5730\u5740\uFF0C\u901A\u5E38\u4EE5 /v1 \u7ED3\u5C3E").addText(
      (text) => text.setPlaceholder("https://api.deepseek.com/v1").setValue(settings.baseUrl).onChange((value) => {
        settings.baseUrl = value.trim();
        saveSoon();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("API Key").setDesc("\u53EA\u4FDD\u5B58\u5728\u672C\u5E93\u7684 .obsidian/plugins/concept-card/data.json\uFF0C\u4E0D\u4F1A\u4E0A\u4F20\u5230\u522B\u5904").addText((text) => {
      text.inputEl.type = "password";
      text.setPlaceholder("sk-...").setValue(settings.apiKey).onChange((value) => {
        settings.apiKey = value.trim();
        saveSoon();
      });
    });
    new import_obsidian6.Setting(containerEl).setName("\u6A21\u578B").setDesc("\u4F8B\u5982 gpt-4o-mini / deepseek-chat / qwen2.5:7b").addText(
      (text) => text.setValue(settings.model).onChange((value) => {
        settings.model = value.trim();
        saveSoon();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u6E29\u5EA6").setDesc("0.2 \u66F4\u7A33\u3001\u66F4\u8D34\u4E8B\u5B9E\uFF1B0.7 \u66F4\u6709\u53D1\u6563\u6027").addSlider(
      (slider) => slider.setLimits(0, 1, 0.05).setValue(settings.temperature).setDynamicTooltip().onChange(async (value) => {
        settings.temperature = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(containerEl).setName("\u6700\u5927\u8F93\u51FA token").setDesc("\u5361\u7247\u4E00\u822C 1200-2000 \u8DB3\u591F").addText((text) => {
      text.inputEl.type = "number";
      text.setValue(String(settings.maxTokens)).onChange(async (value) => {
        const n = Number(value);
        if (Number.isFinite(n)) {
          settings.maxTokens = Math.max(200, Math.min(16e3, Math.round(n)));
          await this.plugin.saveSettings();
        }
      });
    });
    new import_obsidian6.Setting(containerEl).setName("\u8D85\u65F6\uFF08\u79D2\uFF09").addText((text) => {
      text.inputEl.type = "number";
      text.setValue(String(Math.round(settings.timeoutMs / 1e3))).onChange(async (value) => {
        const n = Number(value);
        if (Number.isFinite(n)) {
          settings.timeoutMs = Math.max(5, Math.min(600, Math.round(n))) * 1e3;
          await this.plugin.saveSettings();
        }
      });
    });
    new import_obsidian6.Setting(containerEl).setName("\u6D4B\u8BD5\u8FDE\u63A5").setDesc("\u7528\u5F53\u524D\u914D\u7F6E\u53D1\u4E00\u4E2A\u6781\u5C0F\u7684\u8BF7\u6C42\uFF0C\u786E\u8BA4 Key / \u5730\u5740 / \u6A21\u578B\u53EF\u7528").addButton(
      (btn) => btn.setButtonText("\u6D4B\u8BD5").onClick(async () => {
        btn.setButtonText("\u6D4B\u8BD5\u4E2D\u2026");
        btn.setDisabled(true);
        try {
          const reply = await testConnection(this.plugin.settings);
          new import_obsidian6.Notice(`\u2705 \u8FDE\u63A5\u6B63\u5E38\uFF1A${reply}`);
        } catch (e) {
          new import_obsidian6.Notice(`\u274C ${e.message}`, 8e3);
        } finally {
          btn.setButtonText("\u6D4B\u8BD5");
          btn.setDisabled(false);
        }
      })
    );
    containerEl.createEl("h3", { text: "\u7EF4\u62A4" });
    new import_obsidian6.Setting(containerEl).setName("\u6062\u590D\u9ED8\u8BA4\u8BBE\u7F6E").setDesc("\u4F1A\u6E05\u7A7A AI \u914D\u7F6E\uFF08Base URL / API Key / \u6A21\u578B\u7B49\uFF09\uFF0C\u4E0D\u4F1A\u5220\u9664\u5DF2\u751F\u6210\u7684\u5361\u7247").addButton(
      (btn) => btn.setButtonText("\u6062\u590D\u9ED8\u8BA4").onClick(async () => {
        this.plugin.settings = { ...DEFAULT_SETTINGS, subfolderMap: { ...DEFAULT_SETTINGS.subfolderMap } };
        await this.plugin.saveSettings();
        this.display();
        new import_obsidian6.Notice("\u5DF2\u6062\u590D\u9ED8\u8BA4\u8BBE\u7F6E\uFF08AI \u914D\u7F6E\u5DF2\u6E05\u7A7A\uFF09");
      })
    );
  }
  detectRoot() {
    return resolveRootFolder(this.app, { ...this.plugin.settings, cardRootFolder: "" });
  }
  /** 简易目录选择：把文件夹列表挂到按钮下方的浮层里（在 popout 窗口里也能用） */
  showFolderPicker(evt, onPick) {
    var _a, _b;
    const anchor = evt.currentTarget;
    const doc = (_a = anchor.ownerDocument) != null ? _a : document;
    const parent = anchor.parentElement;
    (_b = parent == null ? void 0 : parent.querySelector(".cc-folder-picker")) == null ? void 0 : _b.remove();
    const picker = doc.createElement("div");
    picker.className = "cc-folder-picker";
    const search = doc.createElement("input");
    search.type = "text";
    search.className = "cc-folder-search";
    search.placeholder = "\u641C\u7D22\u76EE\u5F55\u2026";
    const list = doc.createElement("div");
    list.className = "cc-folder-list";
    picker.append(search, list);
    const render = (filter) => {
      list.empty();
      const items = this.folders.filter((f) => f.toLowerCase().includes(filter.toLowerCase())).slice(0, 300);
      if (!items.length) {
        const empty = doc.createElement("div");
        empty.className = "cc-folder-empty";
        empty.textContent = "\u6CA1\u6709\u5339\u914D\u76EE\u5F55";
        list.appendChild(empty);
      }
      for (const path of items) {
        const item = doc.createElement("div");
        item.className = "cc-folder-item";
        item.textContent = path;
        item.addEventListener("click", () => {
          picker.remove();
          onPick(path);
        });
        list.appendChild(item);
      }
    };
    search.addEventListener("input", () => render(search.value));
    render("");
    parent == null ? void 0 : parent.appendChild(picker);
    window.setTimeout(() => search.focus(), 30);
    const close = (e) => {
      if (!picker.contains(e.target)) {
        picker.remove();
        doc.removeEventListener("mousedown", close, true);
      }
    };
    doc.addEventListener("mousedown", close, true);
  }
};

// src/main.ts
function uniquePaths(list) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const p of list) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}
function cardFormatOf(app, file) {
  var _a;
  if (!file) return "";
  const front = (_a = app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
  return typeof (front == null ? void 0 : front.card_format) === "string" ? front.card_format : "";
}
function stageOf(app, file) {
  var _a, _b;
  if (!file) return "\u5E7C\u82D7";
  const front = (_a = app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
  const stage = String((_b = front == null ? void 0 : front.stage) != null ? _b : "\u5E7C\u82D7");
  return stage === "\u6210\u957F" || stage === "\u5E38\u9752" ? stage : "\u5E7C\u82D7";
}
var ConceptCardPlugin = class extends import_obsidian7.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
    this.busy = false;
    this.statusEl = null;
    this.suggested = /* @__PURE__ */ new Set();
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new ConceptCardSettingTab(this.app, this));
    this.registerView(REVIEW_VIEW_TYPE, (leaf) => new ConceptReviewView(leaf, this));
    this.statusEl = this.addStatusBarItem();
    this.statusEl.addClass("cc-status");
    this.statusEl.addEventListener("click", () => void this.openReviewView());
    this.app.workspace.onLayoutReady(() => {
      this.refreshReviewStatus(true);
      void this.syncDailyReview(false);
      void this.syncUpcomingDailyNotes();
    });
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        void this.maybeSuggestStage(file instanceof import_obsidian7.TFile ? file : null);
      })
    );
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        const selection = editor.getSelection();
        const view = this.app.workspace.getActiveViewOfType(import_obsidian7.MarkdownView);
        if (selection && selection.trim()) {
          menu.addItem(
            (item) => item.setTitle("\u751F\u6210\u6982\u5FF5\u5361\uFF08\u7CBE\u7B80\uFF09").setIcon("sparkles").onClick(() => void this.run(selection, view, "lite"))
          );
          menu.addItem(
            (item) => item.setTitle("\u751F\u6210\u6982\u5FF5\u5361\uFF08\u5B8C\u6574\uFF09").setIcon("sparkles").onClick(() => void this.run(selection, view, "full"))
          );
          return;
        }
        if ((view == null ? void 0 : view.file) && cardFormatOf(this.app, view.file) === "lite") {
          menu.addItem(
            (item) => item.setTitle("\u8865\u5168\u4E3A\u5B8C\u6574\u7248\uFF08AI\uFF09").setIcon("arrow-up-circle").onClick(() => void this.upgradeCard(view.file, true))
          );
        }
      })
    );
    this.registerDomEvent(
      document,
      "contextmenu",
      (evt) => this.handleReadingViewContextMenu(evt),
      { capture: true }
    );
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof import_obsidian7.TFile) || file.extension !== "md") return;
        const format = cardFormatOf(this.app, file);
        if (!format) return;
        if (format === "lite") {
          menu.addItem(
            (item) => item.setTitle("\u6982\u5FF5\u5361\uFF1A\u8865\u5168\u4E3A\u5B8C\u6574\u7248\uFF08AI\uFF09").setIcon("arrow-up-circle").onClick(() => void this.upgradeCard(file, true))
          );
          menu.addItem(
            (item) => item.setTitle("\u6982\u5FF5\u5361\uFF1A\u5347\u7EA7\u4E3A\u5B8C\u6574\u7248\uFF08\u7A7A\u6A21\u677F\uFF09").setIcon("file-plus").onClick(() => void this.upgradeCard(file, false))
          );
          menu.addSeparator();
        }
        menu.addItem((item) => item.setTitle("\u6982\u5FF5\u5361\uFF1A\u6807\u8BB0\u4E3A\u5E38\u9752").setIcon("star").onClick(() => void this.markEvergreen(file)));
        menu.addItem(
          (item) => item.setTitle("\u6982\u5FF5\u5361\uFF1A\u5B89\u6392\u590D\u67E5\uFF08\u6309\u5F53\u524D\u9636\u6BB5\uFF09").setIcon("calendar-clock").onClick(() => void this.scheduleReview(file, this.reviewIntervalFor(stageOf(this.app, file))))
        );
      })
    );
    this.addCommand({ id: "generate-lite", name: "\u751F\u6210\u6982\u5FF5\u5361\uFF08\u7CBE\u7B80\uFF09", callback: () => this.runFromActiveView("lite") });
    this.addCommand({ id: "generate-full", name: "\u751F\u6210\u6982\u5FF5\u5361\uFF08\u5B8C\u6574\uFF09", callback: () => this.runFromActiveView("full") });
    this.addCommand({
      id: "generate-manual",
      name: "\u751F\u6210\u6982\u5FF5\u5361\uFF1A\u624B\u52A8\u8F93\u5165\u6982\u5FF5\u540D\uFF08\u5B8C\u6574\uFF09",
      callback: () => this.runManual()
    });
    this.addCommand({ id: "upgrade-card-ai", name: "\u6982\u5FF5\u5361\uFF1A\u8865\u5168\u4E3A\u5B8C\u6574\u7248\uFF08AI\uFF09", callback: () => void this.upgradeActive(true) });
    this.addCommand({ id: "upgrade-card-blank", name: "\u6982\u5FF5\u5361\uFF1A\u5347\u7EA7\u4E3A\u5B8C\u6574\u7248\uFF08\u7A7A\u6A21\u677F\uFF09", callback: () => void this.upgradeActive(false) });
    this.addCommand({ id: "mark-evergreen", name: "\u6982\u5FF5\u5361\uFF1A\u6807\u8BB0\u4E3A\u5E38\u9752", callback: () => void this.markEvergreenActive() });
    this.addCommand({ id: "open-review-view", name: "\u6253\u5F00\u6982\u5FF5\u5361\u590D\u67E5\u9762\u677F", callback: () => void this.openReviewView() });
    this.addCommand({
      id: "write-daily-review",
      name: "\u6982\u5FF5\u5361\uFF1A\u628A\u590D\u67E5\u5199\u5165\u4ECA\u65E5\u65E5\u8BB0",
      callback: () => void this.syncDailyReview(true)
    });
    this.addCommand({
      id: "write-daily-due",
      name: "\u6982\u5FF5\u5361\uFF1A\u628A\u590D\u67E5\u5199\u5165\u4E0B\u6B21\u590D\u67E5\u65E5\u7684\u65E5\u8BB0\uFF08\u9884\u544A\uFF09",
      callback: () => void this.writeActiveDueDaily()
    });
    this.addCommand({
      id: "apply-stage-suggestion",
      name: "\u6982\u5FF5\u5361\uFF1A\u6309\u5EFA\u8BAE\u66F4\u65B0\u9636\u6BB5",
      callback: () => void this.applyStageSuggestionActive()
    });
    this.addCommand({ id: "test-connection", name: "\u6D4B\u8BD5 AI \u8FDE\u63A5", callback: () => void this.doTestConnection() });
    if (this.settings.showRibbon) {
      this.addRibbonIcon("sparkles", "\u751F\u6210\u6982\u5FF5\u5361\uFF08\u5B8C\u6574\uFF09", () => this.runFromActiveView("full"));
    }
  }
  async loadSettings() {
    var _a, _b;
    const stored = await this.loadData();
    const isLegacy = !!stored && stored.bilingual === void 0;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, stored != null ? stored : {});
    this.settings.subfolderMap = {
      ...DEFAULT_SETTINGS.subfolderMap,
      ...(_a = stored == null ? void 0 : stored.subfolderMap) != null ? _a : {}
    };
    this.settings.reviewIntervals = {
      ...DEFAULT_SETTINGS.reviewIntervals,
      ...(_b = stored == null ? void 0 : stored.reviewIntervals) != null ? _b : {}
    };
    if (isLegacy && this.settings.language === "auto") {
      this.settings.language = "zh";
      await this.saveSettings();
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  /* ------------------------------------------------------------------ */
  /* 入口                                                                */
  /* ------------------------------------------------------------------ */
  handleReadingViewContextMenu(evt) {
    var _a, _b;
    if (!this.settings.readingViewMenu) return;
    if (evt.defaultPrevented) return;
    const target = evt.target;
    if (!target || typeof target.closest !== "function") return;
    const preview = target.closest(".markdown-preview-view");
    if (!preview) return;
    if (target.closest("a, img, input, .internal-embed, .task-list-item-checkbox, .markdown-embed")) return;
    const view = this.app.workspace.getActiveViewOfType(import_obsidian7.MarkdownView);
    if (!view || !view.containerEl || !view.containerEl.contains(preview)) return;
    const win = (_b = (_a = view.containerEl.ownerDocument) == null ? void 0 : _a.defaultView) != null ? _b : window;
    const selection = win.getSelection();
    if (!selection || selection.isCollapsed) return;
    const text = selection.toString().trim();
    if (!text) return;
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!range || !preview.contains(range.commonAncestorContainer)) return;
    evt.preventDefault();
    evt.stopPropagation();
    const menu = new import_obsidian7.Menu();
    menu.addItem(
      (item) => item.setTitle("\u751F\u6210\u6982\u5FF5\u5361\uFF08\u7CBE\u7B80\uFF09").setIcon("sparkles").onClick(() => void this.run(text, view, "lite"))
    );
    menu.addItem(
      (item) => item.setTitle("\u751F\u6210\u6982\u5FF5\u5361\uFF08\u5B8C\u6574\uFF09").setIcon("sparkles").onClick(() => void this.run(text, view, "full"))
    );
    menu.addSeparator();
    menu.addItem((item) => item.setTitle("\u590D\u5236").setIcon("copy").onClick(() => this.copyText(text)));
    menu.showAtMouseEvent(evt);
  }
  copyText(text) {
    try {
      const clipboard = navigator.clipboard;
      if (clipboard == null ? void 0 : clipboard.writeText) {
        void clipboard.writeText(text).catch(() => new import_obsidian7.Notice("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u590D\u5236"));
        return;
      }
    } catch (e) {
    }
    new import_obsidian7.Notice("\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u81EA\u52A8\u590D\u5236\uFF0C\u8BF7\u624B\u52A8\u590D\u5236");
  }
  runFromActiveView(format) {
    var _a, _b, _c, _d, _e;
    const view = this.app.workspace.getActiveViewOfType(import_obsidian7.MarkdownView);
    if (!view) {
      new import_obsidian7.Notice("\u8BF7\u5148\u6253\u5F00\u4E00\u7BC7 Markdown \u7B14\u8BB0");
      return;
    }
    let selection = "";
    try {
      if (view.getMode() === "source" && view.editor) selection = view.editor.getSelection();
    } catch (e) {
    }
    if (!selection) {
      const win = (_c = (_b = (_a = view.containerEl) == null ? void 0 : _a.ownerDocument) == null ? void 0 : _b.defaultView) != null ? _c : window;
      selection = (_e = (_d = win.getSelection()) == null ? void 0 : _d.toString()) != null ? _e : "";
    }
    if (!selection.trim()) {
      new import_obsidian7.Notice("\u8BF7\u5148\u9009\u4E2D\u4E00\u6BB5\u6587\u5B57\uFF0C\u6216\u7528\u547D\u4EE4\u300C\u751F\u6210\u6982\u5FF5\u5361\uFF1A\u624B\u52A8\u8F93\u5165\u6982\u5FF5\u540D\u300D");
      return;
    }
    void this.run(selection, view, format);
  }
  runManual() {
    new TermInputModal(this.app, (term) => {
      const view = this.app.workspace.getActiveViewOfType(import_obsidian7.MarkdownView);
      void this.run(term, view, "full");
    }).open();
  }
  async doTestConnection() {
    const notice = new import_obsidian7.Notice("\u6B63\u5728\u6D4B\u8BD5 AI \u8FDE\u63A5\u2026", 0);
    try {
      const reply = await testConnection(this.settings);
      notice.hide();
      new import_obsidian7.Notice(`\u2705 \u8FDE\u63A5\u6B63\u5E38\uFF1A${reply}`);
    } catch (e) {
      notice.hide();
      this.reportError(e, "\u8FDE\u63A5\u6D4B\u8BD5\u5931\u8D25");
    }
  }
  /* ------------------------------------------------------------------ */
  /* 生成流程                                                            */
  /* ------------------------------------------------------------------ */
  async run(rawSelection, view, format) {
    if (this.busy) {
      new import_obsidian7.Notice("\u4E0A\u4E00\u5F20\u6982\u5FF5\u5361\u8FD8\u5728\u751F\u6210\u4E2D\uFF0C\u8BF7\u7A0D\u7B49\u2026");
      return;
    }
    const selection = collapse(rawSelection);
    if (!selection) {
      new import_obsidian7.Notice("\u9009\u4E2D\u7684\u5185\u5BB9\u4E3A\u7A7A");
      return;
    }
    const guess = termFromSelection(selection);
    if (guess && this.settings.onDuplicate === "open") {
      const hit = findCardsByTitle(this.app, guess)[0];
      if (hit) {
        await this.insertSourceLink(view, selection, hit.basename);
        await openFileInWorkspace(this.app, hit);
        new import_obsidian7.Notice(`\u5E93\u4E2D\u5DF2\u6709\u300C${hit.basename}\u300D\uFF08${hit.path}\uFF09\uFF0C\u5DF2\u4E3A\u4F60\u6253\u5F00\uFF1B\u8981\u751F\u6210\u7B2C\u4E8C\u5F20\u8BF7\u628A\u540C\u540D\u7B56\u7565\u6539\u4E3A\u300C\u52A0 -2 \u540E\u7F00\u300D`, 8e3);
        return;
      }
    }
    this.busy = true;
    const notice = new import_obsidian7.Notice(`\u6B63\u5728\u751F\u6210${format === "lite" ? "\u7CBE\u7B80\u7248" : "\u5B8C\u6574\u7248"}\u6982\u5FF5\u5361\u2026`, 0);
    let generation;
    try {
      generation = await this.buildGeneration(selection, view, format, (m) => notice.setMessage(m));
    } catch (e) {
      this.reportError(e, "\u751F\u6210\u5931\u8D25");
      return;
    } finally {
      this.busy = false;
      notice.hide();
    }
    if (this.settings.previewBeforeSave) {
      this.openPreview(generation, view);
      return;
    }
    const saved = await this.commitCard(generation, view, {
      markdown: generation.markdown,
      folderPath: generation.folderPath,
      baseName: generation.baseName
    });
    if (saved.ok && saved.message) new import_obsidian7.Notice(saved.message, 5e3);
  }
  async buildGeneration(selection, view, format, progress) {
    var _a, _b, _c, _d, _e;
    const settings = this.settings;
    const term = termFromSelection(selection);
    const root = resolveRootFolder(this.app, settings);
    const subNames = listSubfolders(this.app, root);
    const subfolderPaths = subNames.map((name) => root ? `${root}/${name}` : name);
    const existingCards = settings.linkExistingCards ? collectExistingCardTitles(this.app, root, settings.maxExistingCards) : [];
    const existingTags = collectExistingTags(this.app, root, 80);
    const sourceNote = (_b = (_a = view == null ? void 0 : view.file) == null ? void 0 : _a.basename) != null ? _b : "";
    const sourcePath = (_d = (_c = view == null ? void 0 : view.file) == null ? void 0 : _c.path) != null ? _d : "";
    const fullText = await this.readFullText(view);
    const context = settings.includeContext ? sliceContext(fullText, selection, settings.contextChars) : "";
    const card = await generateCard(
      settings,
      {
        term,
        selection,
        sourceNote,
        sourcePath,
        context,
        existingCards,
        existingTags,
        language: settings.language,
        bilingual: settings.bilingual,
        format,
        extraInstructions: settings.extraInstructions
      },
      progress
    );
    const mapped = ((_e = settings.subfolderMap[card.type]) != null ? _e : "").trim();
    let folderPath;
    let needsCreate;
    if (mapped) {
      folderPath = safePath(resolveMappedPath(mapped, root));
      needsCreate = folderPath ? !folderExists(this.app, folderPath) : false;
    } else if (!settings.autoMatchSubfolders) {
      folderPath = root;
      needsCreate = false;
    } else {
      const placement = matchSubfolder(card.type, subNames, settings.autoCreateSubfolder);
      folderPath = safePath(placement.folder ? root ? `${root}/${placement.folder}` : placement.folder : root);
      needsCreate = placement.needsCreate;
    }
    if (settings.aiSubfolder && folderPath) {
      const subs = listSubfolders(this.app, folderPath);
      if (subs.length) {
        progress("\u6B63\u5728\u9009\u62E9\u4E0B\u7EA7\u5206\u7C7B\u76EE\u5F55\u2026");
        const chosen = await chooseSubfolder(settings, {
          title: card.title,
          type: card.type,
          summary: card.summary,
          candidates: subs
        });
        if (chosen) {
          folderPath = safePath(`${folderPath}/${chosen}`);
          needsCreate = !folderExists(this.app, folderPath);
        }
      }
    }
    const ts = nowISO();
    const ctx = {
      sourceNote,
      sourcePath,
      selection,
      createdISO: ts.iso,
      createdHuman: ts.human,
      updatedISO: ts.iso,
      updatedHuman: ts.human,
      revisit: revisitDate(this.reviewIntervalFor("\u5E7C\u82D7")),
      stage: "\u5E7C\u82D7",
      format,
      model: settings.model,
      sources: sourceNote ? [sourceNote] : []
    };
    const baseName = filenameFor(card, settings.filenamePattern);
    const markdown = renderCardMarkdownV3(card, ctx);
    return {
      card,
      format,
      title: card.title,
      ctx,
      markdown,
      root,
      baseName,
      folderPath,
      needsCreate,
      folderOptions: uniquePaths([folderPath, root, ...subfolderPaths])
    };
  }
  async readFullText(view) {
    if (!view || !view.file) return "";
    try {
      const data = view.getViewData();
      if (data) return data;
    } catch (e) {
    }
    try {
      return await this.app.vault.cachedRead(view.file);
    } catch (e) {
      return "";
    }
  }
  openPreview(generation, view) {
    const modal = new CardPreviewModal(this.app, {
      markdown: generation.markdown,
      title: generation.card.title,
      baseName: generation.baseName,
      folderPath: generation.folderPath,
      folders: generation.folderOptions,
      basePath: generation.root,
      needsCreate: generation.needsCreate,
      renderWith: (title) => renderCardMarkdownV3({ ...generation.card, title }, generation.ctx),
      filenameFor: (title) => filenameFor({ title, type: generation.card.type }, this.settings.filenamePattern),
      onSave: async (payload) => {
        const result = await this.commitCard(generation, view, payload);
        if (result.ok && result.message) new import_obsidian7.Notice(result.message, 5e3);
        return result.ok;
      },
      onRegenerate: async () => {
        const notice = new import_obsidian7.Notice("\u6B63\u5728\u91CD\u65B0\u751F\u6210\u2026", 0);
        try {
          const next = await this.buildGeneration(generation.ctx.selection, view, generation.format, (m) => notice.setMessage(m));
          return {
            markdown: next.markdown,
            title: next.card.title,
            baseName: next.baseName,
            folderPath: next.folderPath,
            needsCreate: next.needsCreate,
            renderWith: (title) => renderCardMarkdownV3({ ...next.card, title }, next.ctx),
            filenameFor: (title) => filenameFor({ title, type: next.card.type }, this.settings.filenamePattern)
          };
        } catch (e) {
          this.reportError(e, "\u91CD\u65B0\u751F\u6210\u5931\u8D25");
          return null;
        } finally {
          notice.hide();
        }
      }
    });
    modal.open();
  }
  /* ------------------------------------------------------------------ */
  /* 落盘                                                                */
  /* ------------------------------------------------------------------ */
  async commitCard(gen, view, payload) {
    var _a, _b;
    const folderPath = payload.folderPath ? safePath(payload.folderPath) : "";
    const baseName = sanitizeFilename(payload.baseName || gen.baseName);
    try {
      if (folderPath) await ensureFolder(this.app, folderPath);
      const existing = (_b = (_a = getFileByName(this.app, folderPath, baseName)) != null ? _a : findCardsByTitle(this.app, baseName)[0]) != null ? _b : null;
      if (existing && this.settings.onDuplicate === "open") {
        await this.insertSourceLink(view, gen.ctx.selection, existing.basename);
        await openFileInWorkspace(this.app, existing);
        return { ok: true, message: `\u5E93\u4E2D\u5DF2\u6709\u540C\u540D\u5361\u7247\u300C${existing.basename}\u300D\uFF08${existing.path}\uFF09\uFF0C\u5DF2\u6253\u5F00` };
      }
      let file;
      let finalName = baseName;
      let backupName = "";
      if (existing && this.settings.onDuplicate === "overwrite") {
        const existingFolder = existing.path.includes("/") ? existing.path.slice(0, existing.path.lastIndexOf("/")) : "";
        backupName = await this.backupExisting(existing, existingFolder, existing.basename);
        file = await this.app.vault.create(existing.path, payload.markdown);
        finalName = existing.basename;
      } else if (existing) {
        const unique = this.nextVaultSafeName(folderPath, baseName);
        file = await this.app.vault.create(unique.path, payload.markdown);
        finalName = unique.name;
      } else {
        const path = folderPath ? (0, import_obsidian7.normalizePath)(`${folderPath}/${baseName}.md`) : `${baseName}.md`;
        file = await this.app.vault.create(path, payload.markdown);
      }
      await this.insertSourceLink(view, gen.ctx.selection, finalName, gen.card.aliases);
      if (this.settings.openAfterCreate) await openFileInWorkspace(this.app, file);
      void this.syncDailyNoteForDate(gen.ctx.revisit);
      const backupHint = backupName ? `\uFF08\u65E7\u5361\u5DF2\u5907\u4EFD\u4E3A\u300C${backupName}\u300D\uFF09` : "";
      return { ok: true, message: `\u2705 \u5DF2\u751F\u6210\u300C${finalName}\u300D\u2192 ${folderPath || "\u5E93\u6839\u76EE\u5F55"}${backupHint}` };
    } catch (e) {
      this.reportError(e, "\u4FDD\u5B58\u5361\u7247\u5931\u8D25");
      return { ok: false };
    }
  }
  /** 同名加后缀时，同时避开目标目录与全库的重名 */
  nextVaultSafeName(folderPath, baseName) {
    const folderTaken = existingNamesInFolder(this.app, folderPath);
    const vaultKeys = new Set(this.app.vault.getMarkdownFiles().map((f) => titleKey(f.basename)));
    let name = baseName;
    for (let i = 2; i < 100; i++) {
      if (!folderTaken.has(name.toLowerCase()) && !vaultKeys.has(titleKey(name))) break;
      name = `${baseName}-${i}`;
    }
    const path = folderPath ? (0, import_obsidian7.normalizePath)(`${folderPath}/${name}.md`) : `${name}.md`;
    return { path, name };
  }
  async backupExisting(existing, folderPath, baseName) {
    const now = /* @__PURE__ */ new Date();
    const p = (n) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
    const taken = existingNamesInFolder(this.app, folderPath);
    const backupBase = nextAvailableName(`${baseName}\uFF08\u65E7\u7248 ${stamp}\uFF09`, taken);
    const target = folderPath ? (0, import_obsidian7.normalizePath)(`${folderPath}/${backupBase}.md`) : `${backupBase}.md`;
    await this.app.vault.rename(existing, target);
    return backupBase;
  }
  async insertSourceLink(view, selection, cardName, aliases = []) {
    if (!this.settings.linkBackToSource) return;
    if (!(view == null ? void 0 : view.file)) return;
    const file = view.file;
    const names = [cardName, ...aliases];
    try {
      if (view.getMode() === "source" && view.editor) {
        const editor = view.editor;
        const current = editor.getSelection();
        if (current && current.trim() === selection.trim()) {
          const replaced = linkFirstKeyword(current, names, cardName);
          if (replaced) editor.replaceSelection(replaced);
          return;
        }
        const value = editor.getValue();
        const spot = findLinkableSpot(value, selection);
        if (spot) {
          const matched = value.slice(spot.index, spot.index + spot.length);
          const replaced = linkFirstKeyword(matched, names, cardName);
          if (replaced) {
            editor.replaceRange(replaced, editor.offsetToPos(spot.index), editor.offsetToPos(spot.index + spot.length));
          }
        }
        return;
      }
    } catch (e) {
      console.error("[\u6982\u5FF5\u5361\u751F\u6210\u5668] \u7F16\u8F91\u89C6\u56FE\u63D2\u5165\u53CC\u94FE\u5931\u8D25", e);
      return;
    }
    try {
      await this.app.vault.process(file, (data) => {
        const spot = findLinkableSpot(data, selection);
        if (!spot) return data;
        const matched = data.slice(spot.index, spot.index + spot.length);
        const replaced = linkFirstKeyword(matched, names, cardName);
        if (!replaced) return data;
        return data.slice(0, spot.index) + replaced + data.slice(spot.index + spot.length);
      });
    } catch (e) {
      console.error("[\u6982\u5FF5\u5361\u751F\u6210\u5668] \u9605\u8BFB\u89C6\u56FE\u63D2\u5165\u53CC\u94FE\u5931\u8D25", e);
    }
  }
  /* ------------------------------------------------------------------ */
  /* 升级与生命周期                                                       */
  /* ------------------------------------------------------------------ */
  activeCardFile() {
    var _a;
    const view = this.app.workspace.getActiveViewOfType(import_obsidian7.MarkdownView);
    return (_a = view == null ? void 0 : view.file) != null ? _a : null;
  }
  upgradeActive(useAI) {
    const file = this.activeCardFile();
    if (!file) {
      new import_obsidian7.Notice("\u8BF7\u5148\u6253\u5F00\u4E00\u5F20\u6982\u5FF5\u5361");
      return;
    }
    void this.upgradeCard(file, useAI);
  }
  async upgradeCard(file, useAI) {
    var _a, _b, _c;
    const front = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
    if (!front || front.card_format !== "lite") {
      new import_obsidian7.Notice("\u8FD9\u5F20\u5361\u4E0D\u662F\u7CBE\u7B80\u7248\uFF08\u6216\u4E0D\u662F\u672C\u63D2\u4EF6\u751F\u6210\u7684\u5361\u7247\uFF09\uFF0C\u65E0\u9700\u5347\u7EA7");
      return;
    }
    const type = String((_b = front.type) != null ? _b : "\u6982\u5FF5");
    const stage = String((_c = front.stage) != null ? _c : "\u5E7C\u82D7") || "\u5E7C\u82D7";
    const missing = upgradeSections();
    const lines = missing.map((id) => `\u65B0\u589E\uFF1A${headingFor(id, type)}`);
    new ConfirmModal(
      this.app,
      { title: useAI ? "\u8865\u5168\u4E3A\u5B8C\u6574\u7248\uFF08AI\uFF09" : "\u5347\u7EA7\u4E3A\u5B8C\u6574\u7248\uFF08\u7A7A\u6A21\u677F\uFF09", lines, confirmText: "\u5F00\u59CB" },
      async () => {
        const notice = new import_obsidian7.Notice(useAI ? "\u6B63\u5728\u8865\u5168\u5B8C\u6574\u7248\u5C0F\u8282\u2026" : "\u6B63\u5728\u63D2\u5165\u7A7A\u5C0F\u8282\u2026", 0);
        try {
          const text = await this.app.vault.read(file);
          let additions = [];
          if (useAI) {
            const root = resolveRootFolder(this.app, this.settings);
            const existingCards = collectExistingCardTitles(this.app, root, this.settings.maxExistingCards);
            additions = await generateMissingSections(
              this.settings,
              {
                existingMarkdown: text,
                type,
                language: this.settings.language,
                bilingual: this.settings.bilingual,
                existingCards
              },
              (m) => notice.setMessage(m)
            );
          } else {
            additions = missing.map((id) => ({
              id,
              body: "> [!todo] \u5F85\u8865\n> \u8FD9\u4E00\u8282\u7B49\u4F60\u8865\u5145\uFF1B\u4E5F\u53EF\u4EE5\u518D\u6B21\u53F3\u952E\u300C\u8865\u5168\u4E3A\u5B8C\u6574\u7248\uFF08AI\uFF09\u300D\u8BA9 AI \u751F\u6210\u3002"
            }));
          }
          const nextRevisit = revisitDate(this.reviewIntervalFor("\u6210\u957F"));
          let next = insertMissingSections(text, type, additions, "full");
          next = setFrontmatterField(next, "card_format", "full");
          next = setFrontmatterField(next, "stage", JSON.stringify(stageAfterUpgrade(stage)));
          next = setFrontmatterField(next, "updated", nowISO().iso);
          next = setFrontmatterField(next, "revisit", nextRevisit);
          await this.app.vault.modify(file, next);
          void this.syncDailyNoteForDate(nextRevisit);
          notice.hide();
          new import_obsidian7.Notice(useAI ? "\u2705 \u5DF2\u8865\u5168\u4E3A\u5B8C\u6574\u7248" : "\u2705 \u5DF2\u63D2\u5165\u7A7A\u5C0F\u8282\uFF0C\u6162\u6162\u586B");
        } catch (e) {
          notice.hide();
          this.reportError(e, "\u5347\u7EA7\u5931\u8D25");
        }
      }
    ).open();
  }
  markEvergreenActive() {
    const file = this.activeCardFile();
    if (!file) {
      new import_obsidian7.Notice("\u8BF7\u5148\u6253\u5F00\u4E00\u5F20\u6982\u5FF5\u5361");
      return;
    }
    void this.markEvergreen(file);
  }
  async markEvergreen(file) {
    var _a;
    const front = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
    if (!(front == null ? void 0 : front.card_format)) {
      new import_obsidian7.Notice("\u8FD9\u4E0D\u662F\u672C\u63D2\u4EF6\u751F\u6210\u7684\u6982\u5FF5\u5361");
      return;
    }
    const days = this.reviewIntervalFor("\u5E38\u9752");
    const nextDate = revisitDate(days);
    try {
      const text = await this.app.vault.read(file);
      let next = setFrontmatterField(text, "stage", JSON.stringify("\u5E38\u9752"));
      next = setFrontmatterField(next, "updated", nowISO().iso);
      next = setFrontmatterField(next, "revisit", nextDate);
      await this.app.vault.modify(file, next);
      new import_obsidian7.Notice(`\u2705 \u5DF2\u6807\u8BB0\u4E3A\u5E38\u9752\uFF0C${days} \u5929\u540E\u53EF\u590D\u67E5`);
      this.refreshReviewStatus();
      void this.syncDailyReview(false);
      void this.syncDailyNoteForDate(nextDate);
    } catch (e) {
      this.reportError(e, "\u6807\u8BB0\u5931\u8D25");
    }
  }
  async scheduleReview(file, days) {
    const nextDate = revisitDate(days);
    try {
      const text = await this.app.vault.read(file);
      const next = setFrontmatterField(text, "revisit", nextDate);
      await this.app.vault.modify(file, next);
      new import_obsidian7.Notice(`\u5DF2\u5B89\u6392 ${days} \u5929\u540E\u590D\u67E5\uFF08${nextDate}\uFF09`);
      this.refreshReviewStatus();
      void this.syncDailyNoteForDate(nextDate);
    } catch (e) {
      this.reportError(e, "\u5B89\u6392\u590D\u67E5\u5931\u8D25");
    }
  }
  /* ------------------------------------------------------------------ */
  /* 复查与阶段建议                                                       */
  /* ------------------------------------------------------------------ */
  reviewIntervalFor(stage) {
    var _a;
    const days = (_a = this.settings.reviewIntervals) == null ? void 0 : _a[stage];
    return Number.isFinite(days) && days > 0 ? days : 14;
  }
  getReviewCards() {
    return findReviewCards(this.app, todayKey());
  }
  getDueCards() {
    return findDueCards(this.app, todayKey());
  }
  openCard(file) {
    void openFileInWorkspace(this.app, file);
  }
  refreshReviewStatus(showNotice = false) {
    var _a, _b;
    const cards = this.getReviewCards();
    const due = cards.filter((c) => c.due).length;
    (_a = this.statusEl) == null ? void 0 : _a.setText(cards.length ? `\u590D\u67E5 ${due}/${cards.length}` : "");
    (_b = this.statusEl) == null ? void 0 : _b.setAttribute("aria-label", "\u70B9\u51FB\u6253\u5F00\u6982\u5FF5\u5361\u590D\u67E5\u9762\u677F");
    if (showNotice && due && this.settings.reviewReminder) {
      new import_obsidian7.Notice(`\u6709 ${due} \u5F20\u6982\u5FF5\u5361\u5230\u671F\u590D\u67E5\u3002\u547D\u4EE4\uFF1A\u6253\u5F00\u6982\u5FF5\u5361\u590D\u67E5\u9762\u677F`, 8e3);
    }
  }
  async syncDailyReview(manual) {
    if (!manual && !this.settings.dailyNoteReminder) return;
    const due = this.getDueCards();
    if (!manual && !due.length) return;
    try {
      const result = await writeDueCardsToDailyNote(this.app, this.settings, due);
      if (result.missing) {
        if (manual) {
          new import_obsidian7.Notice(`\u672A\u627E\u5230\u4ECA\u65E5\u65E5\u8BB0\uFF1A${result.path}\u3002\u8BF7\u5148\u521B\u5EFA\u65E5\u8BB0\uFF0C\u6216\u5728\u8BBE\u7F6E \u2192 \u590D\u67E5\u4E0E\u9636\u6BB5\u91CC\u8C03\u6574\u76EE\u5F55/\u683C\u5F0F\u3002`, 8e3);
        }
        return;
      }
      if (manual) new import_obsidian7.Notice(`\u5DF2\u5199\u5165\u4ECA\u65E5\u590D\u67E5\uFF08${due.length} \u5F20\uFF09\uFF1A${result.path}`);
    } catch (e) {
      if (manual) this.reportError(e, "\u5199\u5165\u65E5\u8BB0\u5931\u8D25");
    }
  }
  /** 写入某一天的日记提醒（预告）；那一天没有到期卡片则跳过 */
  async syncDailyNoteForDate(dateKey, notify = false) {
    if (!this.settings.dailyNoteReminder) return;
    const cards = this.getReviewCards().filter((c) => c.revisit === dateKey);
    if (!cards.length) return;
    try {
      const result = await writeCardsToDate(this.app, this.settings, dateKey, cards, true);
      if (notify && result.ok) new import_obsidian7.Notice(`\u5DF2\u5199\u5165 ${dateKey} \u7684\u65E5\u8BB0\u9884\u544A\uFF1A${result.path}`);
    } catch (e) {
      if (notify) this.reportError(e, "\u5199\u5165\u65E5\u8BB0\u5931\u8D25");
    }
  }
  async writeActiveDueDaily() {
    var _a, _b;
    const file = this.activeCardFile();
    if (!file) {
      new import_obsidian7.Notice("\u8BF7\u5148\u6253\u5F00\u4E00\u5F20\u6982\u5FF5\u5361");
      return;
    }
    const front = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
    const revisit = String((_b = front == null ? void 0 : front.revisit) != null ? _b : "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(revisit)) {
      new import_obsidian7.Notice("\u8FD9\u5F20\u5361\u8FD8\u6CA1\u6709\u5B89\u6392\u590D\u67E5\u65E5\u671F");
      return;
    }
    await this.syncDailyNoteForDate(revisit, true);
  }
  /** 启动时预写未来 N 天内有复查任务的日记（预告） */
  async syncUpcomingDailyNotes() {
    if (!this.settings.dailyNoteReminder) return;
    const horizon = Number(this.settings.dailyNoteHorizonDays);
    if (!Number.isFinite(horizon) || horizon <= 0) return;
    const today = todayKey();
    const end = addDaysKey(today, horizon);
    const dates = new Set(
      this.getReviewCards().filter((c) => c.revisit >= today && c.revisit <= end).map((c) => c.revisit)
    );
    for (const dateKey of dates) await this.syncDailyNoteForDate(dateKey);
  }
  async openReviewView() {
    var _a;
    const leaves = this.app.workspace.getLeavesOfType(REVIEW_VIEW_TYPE);
    if (leaves.length) {
      this.app.workspace.revealLeaf(leaves[0]);
      const view = leaves[0].view;
      if (view instanceof ConceptReviewView) view.render();
      return;
    }
    const leaf = (_a = this.app.workspace.getRightLeaf(false)) != null ? _a : this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: REVIEW_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
  async markReviewed(file) {
    const stage = stageOf(this.app, file);
    const days = this.reviewIntervalFor(stage);
    const nextDate = revisitDate(days);
    try {
      const text = await this.app.vault.read(file);
      const next = setFrontmatterField(text, "revisit", nextDate);
      await this.app.vault.modify(file, next);
      new import_obsidian7.Notice(`\u5DF2\u590D\u67E5\u300C${file.basename}\u300D\uFF0C${days} \u5929\u540E\uFF08${nextDate}\uFF09\u518D\u770B`);
      this.refreshReviewStatus();
      void this.syncDailyNoteForDate(nextDate);
      void this.syncDailyReview(false);
    } catch (e) {
      this.reportError(e, "\u8BB0\u5F55\u590D\u67E5\u5931\u8D25");
    }
  }
  async maybeSuggestStage(file) {
    var _a, _b;
    if (!this.settings.stageSuggestions || !file || file.extension !== "md") return;
    const front = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
    if (!(front == null ? void 0 : front.card_format)) return;
    const stage = stageOf(this.app, file);
    const format = front.card_format === "full" ? "full" : "lite";
    const revisit = String((_b = front.revisit) != null ? _b : "");
    let text = "";
    try {
      text = await this.app.vault.cachedRead(file);
    } catch (e) {
      return;
    }
    const suggestion = suggestStageFor(text, stage, format, revisit, todayKey());
    if (!suggestion) return;
    const key = `${file.path}::${stage}::${suggestion}`;
    if (this.suggested.has(key)) return;
    this.suggested.add(key);
    new import_obsidian7.Notice(`\u300C${file.basename}\u300D\u7684\u7559\u767D\u5DF2\u586B\u5199\uFF0C\u53EF\u5347\u7EA7\u4E3A\u300C${suggestion}\u300D\u3002\u547D\u4EE4\uFF1A\u6982\u5FF5\u5361\uFF1A\u6309\u5EFA\u8BAE\u66F4\u65B0\u9636\u6BB5`, 8e3);
  }
  async applyStageSuggestionActive() {
    var _a, _b;
    const file = this.activeCardFile();
    if (!file) {
      new import_obsidian7.Notice("\u8BF7\u5148\u6253\u5F00\u4E00\u5F20\u6982\u5FF5\u5361");
      return;
    }
    const front = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
    if (!(front == null ? void 0 : front.card_format)) {
      new import_obsidian7.Notice("\u8FD9\u4E0D\u662F\u672C\u63D2\u4EF6\u751F\u6210\u7684\u6982\u5FF5\u5361");
      return;
    }
    const stage = stageOf(this.app, file);
    const format = front.card_format === "full" ? "full" : "lite";
    const revisit = String((_b = front.revisit) != null ? _b : "");
    try {
      const text = await this.app.vault.read(file);
      const suggestion = suggestStageFor(text, stage, format, revisit, todayKey());
      if (!suggestion) {
        new import_obsidian7.Notice("\u5F53\u524D\u6CA1\u6709\u53EF\u6267\u884C\u7684\u9636\u6BB5\u5EFA\u8BAE\uFF08\u7559\u767D\u672A\u586B\u591F\uFF0C\u6216\u8FD8\u6CA1\u5230\u590D\u67E5\u65E5\uFF09");
        return;
      }
      const nextDate = revisitDate(this.reviewIntervalFor(suggestion));
      let next = setFrontmatterField(text, "stage", JSON.stringify(suggestion));
      next = setFrontmatterField(next, "updated", nowISO().iso);
      next = setFrontmatterField(next, "revisit", nextDate);
      await this.app.vault.modify(file, next);
      new import_obsidian7.Notice(`\u2705 \u5DF2\u6309\u5EFA\u8BAE\u5347\u7EA7\u4E3A\u300C${suggestion}\u300D`);
      this.refreshReviewStatus();
      void this.syncDailyNoteForDate(nextDate);
    } catch (e) {
      this.reportError(e, "\u66F4\u65B0\u9636\u6BB5\u5931\u8D25");
    }
  }
  reportError(e, context) {
    const message = e instanceof AiError ? e.message : e instanceof Error ? e.message : String(e);
    new import_obsidian7.Notice(`${context}\uFF1A${message}`, 1e4);
    console.error(`[\u6982\u5FF5\u5361\u751F\u6210\u5668] ${context}`, e);
  }
};
