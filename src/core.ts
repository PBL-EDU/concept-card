/**
 * 纯逻辑层：不 import obsidian，可以在 Node 里直接单测。
 * 负责：选中文本清洗、AI 返回解析、卡片 Markdown 渲染、目录匹配、文件名生成。
 */
import type {
  CardConfusion,
  CardData,
  CardRelation,
  CardRenderContext,
  CardSection,
  FilenamePattern,
} from "./types";

/* ------------------------------------------------------------------ */
/* 文本工具                                                             */
/* ------------------------------------------------------------------ */

export function collapse(s: string): string {
  return s.replace(/\r/g, "").replace(/[ \t\u00a0]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function uniqueStrings(list: string[], skip?: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const v = collapse(raw).replace(/^\[\[|\]\]$/g, "").trim();
    const key = v.toLowerCase();
    if (!v || key === (skip ?? "").toLowerCase() || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/** 把选中文本整理成一个"术语"（用于没有 AI 返回标题时的兜底） */
export function termFromSelection(raw: string): string {
  let s = raw.replace(/\r/g, "").trim();
  const firstLine = s.split("\n").map((l) => l.trim()).find((l) => l.length > 0) ?? "";
  s = firstLine;
  // 去掉首尾的引号、括号、标点、markdown 装饰
  s = s.replace(
    /^[\s"'“”‘’《》「」『』【】()（）[\]{}<>*_`~=\-–—。！？!?,，、；;：:…]+|[\s"'“”‘’《》「」『』【】()（）[\]{}<>*_`~=\-–—。！？!?,，、；;：:…]+$/g,
    "",
  );
  // 整句话被选中时，截到第一个句末标点
  if (s.length > 60) {
    const m = s.match(/^[^。！？!?;；]{1,60}[。！？!?]?/);
    if (m) s = m[0];
  }
  s = collapse(s);
  if (s.length > 80) s = s.slice(0, 80) + "…";
  return s;
}

/** Obsidian 文件名净化：去掉非法字符与破坏双链的字符 */
export function sanitizeFilename(name: string): string {
  let s = name.replace(/\r?\n/g, "-");
  while (/\.md$/i.test(s)) s = s.replace(/\.md$/i, ""); // 避免生成 X.md.md
  s = s.replace(/[\\/:*?"<>|#^[\]]/g, "-");
  s = s.replace(/[ \t]+/g, " ").replace(/-{2,}/g, "-").trim();
  s = s.replace(/^[.\s-]+/, "").replace(/[.\s]+$/, "");
  if (s.length > 100) s = s.slice(0, 100).trim();
  return s || "未命名概念";
}

/* ------------------------------------------------------------------ */
/* AI 返回解析                                                          */
/* ------------------------------------------------------------------ */

/** 从模型输出里抠出第一个平衡的 JSON 对象；失败返回 null */
export function extractJson(text: string): unknown {
  let s = (text ?? "").trim();
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
  } catch {
    return null;
  }
}

const TYPE_ALIASES: Record<string, string> = {
  person: "人物",
  people: "人物",
  figure: "人物",
  philosopher: "人物",
  人名: "人物",
  人名卡: "人物",
  人物: "人物",
  theory: "理论",
  理论: "理论",
  学说: "理论",
  模型: "理论",
  框架: "理论",
  model: "理论",
  framework: "理论",
  concept: "概念",
  概念: "概念",
  理念: "概念",
  思想: "概念",
  idea: "概念",
  method: "方法",
  方法: "方法",
  方法论: "方法",
  methodology: "方法",
  technique: "方法",
  技巧: "方法",
  工具: "方法",
  tool: "方法",
  event: "事件",
  事件: "事件",
  历史事件: "事件",
  work: "作品",
  作品: "作品",
  书: "作品",
  book: "作品",
  论文: "作品",
  paper: "作品",
  文章: "作品",
  电影: "作品",
  film: "作品",
  术语: "术语",
  term: "术语",
  terminology: "术语",
  名词: "术语",
  org: "组织",
  organization: "组织",
  organisation: "组织",
  组织: "组织",
  机构: "组织",
  公司: "组织",
  company: "组织",
};

export function normalizeType(raw: unknown): string {
  const s = collapse(typeof raw === "string" ? raw : "");
  if (!s) return "概念";
  const key = s.toLowerCase().replace(/卡$/, "");
  return TYPE_ALIASES[key] ?? TYPE_ALIASES[s] ?? (/^[\u4e00-\u9fa5]{1,6}$/.test(s) ? s : "概念");
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v && typeof v === "object" ? String((v as Record<string, unknown>).name ?? "") : "";
}

/** 模型有时把列表写成逗号分隔的字符串或对象映射，这里统一成数组 */
function toArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    return v
      .split(/[,，、;；\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (v && typeof v === "object") {
    return Object.entries(v as Record<string, unknown>).map(([key, value]) => ({ __key: key, __value: value }));
  }
  return [];
}

function strList(v: unknown): string[] {
  return uniqueStrings(toArray(v).map((x) => str(x) || (typeof x === "string" ? x : "")).filter(Boolean)).slice(0, 12);
}

function sectionsOf(v: unknown): CardSection[] {
  const out: CardSection[] = [];
  for (const item of toArray(v)) {
    if (!item || typeof item !== "object") {
      const body = collapse(str(item));
      if (body) out.push({ heading: "补充", body });
      continue;
    }
    const rec = item as Record<string, unknown>;
    if (typeof rec.__key === "string" && !rec.heading && !rec.title) {
      const raw = rec.__value;
      const rawObj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
      const body = (typeof raw === "string" ? raw : rawObj && typeof rawObj.body === "string" ? rawObj.body : rawObj && typeof rawObj.content === "string" ? rawObj.content : "").trim();
      if (body) out.push({ heading: collapse(rec.__key).replace(/^#+\s*/, "") || "补充", body });
      continue;
    }
    const heading = collapse(str(rec.heading) || str(rec.title) || "").replace(/^#+\s*/, "") || "补充";
    const body = typeof rec.body === "string" ? rec.body.trim() : str(rec.content).trim();
    if (!heading && !body) continue;
    out.push({ heading, body: body || "（待补充）" });
  }
  return out.slice(0, 8);
}

function pairsOf<T extends { name: string }>(v: unknown, key: string): T[] {
  const out: T[] = [];
  for (const item of toArray(v)) {
    if (!item || typeof item !== "object") {
      const name = collapse(str(item));
      if (name) out.push({ name, [key]: "" } as unknown as T);
      continue;
    }
    const rec = item as Record<string, unknown>;
    if (typeof rec.__key === "string" && !rec.name && !rec.title) {
      const value = rec.__value;
      const extra = typeof value === "string" ? value : collapse(str(value && typeof value === "object" ? (value as Record<string, unknown>)[key] ?? (value as Record<string, unknown>).difference ?? (value as Record<string, unknown>).why : ""));
      out.push({ name: collapse(rec.__key).replace(/^\[\[|\]\]$/g, ""), [key]: extra } as unknown as T);
      continue;
    }
    const name = collapse(str(rec.name) || str(rec.title) || str(rec.concept) || "");
    if (!name) continue;
    const extra = collapse(str(rec[key]) || str(rec.difference) || str(rec.why) || str(rec.relation) || str(rec.note) || "");
    out.push({ name, [key]: extra } as unknown as T);
  }
  return out.slice(0, 12);
}

/** 把任意模型 JSON 归整成稳定的 CardData；坏字段一律降级而不是抛错 */
export function normalizeCard(raw: unknown, fallbackTitle: string): CardData {
  const rec = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const title = collapse(str(rec.title) || str(rec.name) || "").replace(/^\[\[|\]\]$/g, "").trim() || fallbackTitle;
  const aliases = strList(rec.aliases).filter((a) => a.toLowerCase() !== title.toLowerCase());
  const confidenceRaw = collapse(str(rec.confidence)).toLowerCase();
  const confidence: CardData["confidence"] =
    confidenceRaw === "high" || confidenceRaw === "medium" || confidenceRaw === "low" ? confidenceRaw : "medium";
  return {
    title: title.slice(0, 120),
    type: normalizeType(rec.type),
    aliases,
    tags: strList(rec.tags).map((t) => t.replace(/^#/, "")),
    summary: collapse(str(rec.summary) || str(rec.definition)).slice(0, 300),
    quote: collapse(str(rec.quote) || str(rec.definition_quote)),
    sections: sectionsOf(rec.sections),
    confusions: pairsOf<CardConfusion>(rec.confusions, "difference"),
    related: pairsOf<CardRelation>(rec.related, "why"),
    questions: strList(rec.questions).slice(0, 6),
    confidence,
  };
}

/* ------------------------------------------------------------------ */
/* 目录 / 文件名                                                        */
/* ------------------------------------------------------------------ */

export const ROOT_KEYWORDS = [
  "概念卡",
  "概念卡片",
  "概念",
  "卡片",
  "知识卡",
  "知识库",
  "知识管理",
  "知识",
  "cards",
  "card",
  "concepts",
  "concept",
  "zettelkasten",
  "notes",
  "knowledge",
];

const IGNORED_FOLDER_NAMES = /^(templates?|模板|attachments?|附件|assets?|资源|archive|归档|trash|回收站|\.obsidian|\.trash)$/i;

/** 从知识库现有目录里猜一个放概念卡的根目录；没有候选返回 ""（即库根） */
export function detectRootFolder(folders: string[]): string {
  let best: { path: string; score: number } | null = null;
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
    score -= segs.length - 1; // 越浅越优先
    if (!best || score > best.score || (score === best.score && f.length < best.path.length)) {
      best = { path: f, score };
    }
  }
  return best ? best.path : "";
}

export const TYPE_SYNONYMS: Record<string, string[]> = {
  人物: ["人物", "人物卡", "人名", "人物志", "人物档案", "people", "person", "persons", "figures"],
  理论: ["理论", "学说", "理论卡", "模型", "框架", "theories", "theory", "models"],
  概念: ["概念", "概念卡", "术语", "名词", "概念集", "concepts", "concept", "terms"],
  方法: ["方法", "方法论", "方法卡", "工具", "技巧", "methods", "method", "techniques", "tools"],
  事件: ["事件", "事件卡", "历史事件", "大事记", "events", "event"],
  作品: ["作品", "作品卡", "书籍", "书", "论文", "文章", "works", "work", "books", "papers"],
  术语: ["术语", "术语卡", "名词", "术语表", "terms", "glossary"],
  组织: ["组织", "组织卡", "机构", "公司", "organizations", "orgs", "companies"],
};

export interface FolderMatch {
  /** 相对根目录的子文件夹名；"" 表示直接放根目录 */
  folder: string;
  /** 该子文件夹还不存在，需要创建 */
  needsCreate: boolean;
}

/**
 * 显式映射的解析：既可以写"人物卡"（根目录下的子文件夹），
 * 也可以写"3-知识/人物卡"或"/3-知识/人物卡"（库内完整路径）。
 * 返回相对库根的路径；空串表示不指定。
 */
export function resolveMappedPath(mapping: string, root: string): string {
  const raw = (mapping ?? "").trim().replace(/\\/g, "/");
  if (!raw) return "";
  const absolute = raw.startsWith("/");
  const m = raw.replace(/^\/+|\/+$/g, "");
  const r = (root ?? "").trim().replace(/^\/+|\/+$/g, "");
  if (!m) return r;
  if (absolute) return m; // "/" 开头 = 从库根算起的完整路径
  if (!r) return m;
  if (m === r || m.startsWith(`${r}/`)) return m; // 已经带了根目录，别重复拼
  return `${r}/${m}`;
}

/**
 * 类型 -> 自动匹配的子文件夹。
 * 现有子文件夹模糊匹配 > 自动新建（可选）> 根目录
 */
export function matchSubfolder(type: string, existing: string[], createMissing: boolean): FolderMatch {
  const t = normalizeType(type);
  const synonyms = TYPE_SYNONYMS[t] ?? [t];
  let best: { name: string; score: number } | null = null;
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

export function filenameFor(card: { title: string; type: string }, pattern: FilenamePattern): string {
  const title = sanitizeFilename(card.title);
  const type = sanitizeFilename(card.type || "概念");
  if (pattern === "type-title") return sanitizeFilename(`${type}-${title}`);
  if (pattern === "title-type") return sanitizeFilename(`${title}（${type}）`);
  return title;
}

/** 同名时加 -2、-3 … */
export function nextAvailableName(base: string, taken: Set<string>): string {
  if (!taken.has(base.toLowerCase())) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/* ------------------------------------------------------------------ */
/* Markdown 渲染                                                        */
/* ------------------------------------------------------------------ */

function yamlStr(s: string): string {
  return `"${collapse(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function cellEscape(s: string): string {
  return collapse(s).replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function wikilink(name: string, targets?: Set<string> | null): string {
  const clean = collapse(name)
    .replace(/^\[\[|\]\]$/g, "")
    .replace(/[|#\]]/g, "")
    .trim();
  if (!clean) return "";
  // 给了"已有卡片"集合时，只有真实存在的卡片才生成双链，避免满屏悬空链接
  if (targets && !targets.has(clean.toLowerCase())) return clean;
  return `[[${clean}]]`;
}

/** 多行文本放进 callout 时，每行都要带 > 前缀，否则会脱离引用块 */
function quoteBlock(text: string): string {
  return collapse(text)
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function headingText(s: string): string {
  return collapse(s).replace(/^#+\s*/, "").replace(/\n/g, " ").slice(0, 40) || "补充";
}

export function buildFrontmatter(card: CardData, ctx: CardRenderContext): string {
  const lines: string[] = ["---"];
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
  if (ctx.sourceNote) {
    lines.push(`source: ${yamlStr(`[[${ctx.sourceNote}]]`)}`);
    if (ctx.sourcePath) lines.push(`source_path: ${yamlStr(ctx.sourcePath)}`);
  }
  lines.push(`created: ${ctx.createdISO}`);
  lines.push(`model: ${yamlStr(ctx.model || "unknown")}`);
  lines.push(`confidence: ${card.confidence}`);
  lines.push("---");
  return lines.join("\n");
}

export function renderCardMarkdown(card: CardData, ctx: CardRenderContext): string {
  const body: string[] = [];
  const targets =
    ctx.linkTargets && ctx.linkTargets.length
      ? new Set(ctx.linkTargets.map((t) => collapse(t).replace(/^\[\[|\]\]$/g, "").toLowerCase()))
      : null;
  body.push(`# ${headingText(card.title)}`);

  if (card.summary) {
    body.push("", "> [!abstract] 一句话", quoteBlock(card.summary));
  }
  if (card.quote) {
    body.push(
      "",
      "> [!quote] 原文",
      quoteBlock(`${card.quote}${ctx.sourceNote ? ` —— [[${ctx.sourceNote}]]` : ""}`),
    );
  }

  for (const section of card.sections) {
    body.push("", `## ${headingText(section.heading)}`, "", section.body.trim());
  }

  if (card.confusions.length) {
    body.push("", "## 易混淆概念", "", "| 概念 | 区别 |", "| --- | --- |");
    for (const c of card.confusions) {
      body.push(`| ${wikilink(c.name, targets)} | ${cellEscape(c.difference)} |`);
    }
  }

  if (card.related.length) {
    body.push("", "## 相关概念", "");
    for (const r of card.related) {
      body.push(`- ${wikilink(r.name, targets)}${r.why ? ` —— ${collapse(r.why)}` : ""}`);
    }
  }

  if (card.questions.length) {
    body.push("", "## 延伸思考", "");
    for (const q of card.questions) body.push(`- ${collapse(q)}`);
  }

  body.push("", "## 出处", "");
  if (ctx.sourceNote) body.push(`- 来源笔记：[[${ctx.sourceNote}]]${ctx.sourcePath ? `（\`${ctx.sourcePath}\`）` : ""}`);
  if (ctx.selection) body.push(`- 原文片段：「${collapse(ctx.selection).slice(0, 300)}」`);
  body.push(`- 生成时间：${ctx.createdHuman}`);
  body.push(`- 生成模型：${ctx.model || "unknown"}`);
  body.push("- 说明：本卡由 AI 生成，关键事实请核对原始出处。");

  return [buildFrontmatter(card, ctx), "", body.join("\n"), ""].join("\n");
}

/** 去掉 Markdown 标记，用于"阅读视图选区 vs 原始文件"的模糊匹配 */
function stripMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/g, (_m: string, a: string, b: string | undefined) => b || a)
    .replace(/[`*_~=]+/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/--+/g, "—");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 从全文里截取选中位置前后的上下文。
 * 阅读视图拿到的是渲染后的文字，和原文 Markdown 可能不同，所以做三级回退：
 *   1. 原文精确匹配
 *   2. 忽略空白差异（换行、多空格）匹配
 *   3. 去掉 Markdown 标记后匹配
 * 都失败则返回空串（宁可不给上下文，也不给错位的上下文）。
 */
export function sliceContext(fullText: string, selection: string, chars: number): string {
  const text = fullText ?? "";
  const sel = (selection ?? "").trim();
  if (!text || !sel) return "";
  const half = Math.max(80, Math.floor(Math.max(200, chars) / 2));

  const build = (source: string, idx: number, span: number): string => {
    const before = source.slice(Math.max(0, idx - half), idx).trim();
    const after = source.slice(idx + span, Math.min(source.length, idx + span + half)).trim();
    const parts: string[] = [];
    if (before) parts.push(`上文：${before}`);
    if (after) parts.push(`下文：${after}`);
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

/** 人类可读时间与带时区的 ISO 时间 */
export function formatTimestamp(d: Date): { iso: string; human: string } {
  const p = (n: number) => String(n).padStart(2, "0");
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const tz = `${sign}${p(Math.floor(abs / 60))}:${p(abs % 60)}`;
  const iso = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(
    d.getSeconds(),
  )}${tz}`;
  const human = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  return { iso, human };
}

/**
 * 概念名归一化，用于全库判重：
 * - 去掉英文翻译括号（"认知失调（Cognitive Dissonance）" → "认知失调"）；
 * - 去掉空格、标点、符号；
 * - 保留中文括号（"心流（心理学）" 仍与 "心流（计算机）" 区分）。
 */
export function titleKey(raw: string): string {
  const s = String(raw ?? "")
    .normalize("NFKC")
    .replace(/[（(]\s*[A-Za-z][^）)]*[）)]/g, "");
  return s.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

/**
 * 找原文里可以变成双链的位置：
 * - 已经包在 [[...]] 里的跳过；
 * - 精确匹配失败时，允许空白差异（换行/多空格）匹配。
 */
export function findLinkableSpot(text: string, selection: string): { index: number; length: number } | null {
  const sel = (selection ?? "").trim();
  if (!text || !sel) return null;
  const candidates: Array<{ index: number; length: number }> = [];
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
      let m: RegExpExecArray | null;
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

function insideWikilink(text: string, index: number): boolean {
  const before = text.slice(0, index);
  return before.lastIndexOf("[[") > before.lastIndexOf("]]");
}

/** 在文本里找某个名字（大小写不敏感，跳过已有双链），返回下标或 -1 */
function findKeywordIndex(text: string, name: string): number {
  const needle = (name ?? "").trim();
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

/**
 * 只把选区里出现的「核心概念名」变成双链，保留前后的修饰语。
 * 名字都找不到时返回 null（调用方不自动改原文）。
 */
export function linkFirstKeyword(text: string, names: string[], cardName: string): string | null {
  const candidates = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean))).sort(
    (a, b) => b.length - a.length,
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
