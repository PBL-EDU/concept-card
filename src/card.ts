/**
 * v3 卡片模型：两档结构（精简 7 节 / 完整 10 节）、固定小节、留白追问、生命周期字段。
 *
 * 不依赖 obsidian，可单测。
 */
import { collapse, formatTimestamp, normalizeType } from "./core";

export type CardFormat = "lite" | "full";
export type CardStage = "幼苗" | "成长" | "常青";
export type SectionSource = "text" | "common" | "inference";

/** AI 生成的小节 */
export type AiSectionId =
  | "definition"
  | "examples"
  | "boundaries"
  | "origins"
  | "confusions"
  | "perspectives"
  | "connections";

/** 渲染顺序里的全部小节（含留白与自测） */
export type SectionId = AiSectionId | "myview" | "meaning" | "selftest";

export interface CardSection {
  body: string;
  source: SectionSource;
}

export interface V3Card {
  title: string;
  type: string;
  aliases: string[];
  tags: string[];
  summary: string;
  quote: string;
  sections: Partial<Record<AiSectionId, CardSection>>;
  selftest: string[];
  uncertainties: string[];
  confidence: "high" | "medium" | "low";
}

export interface CardRenderContextV3 {
  sourceNote: string;
  sourcePath: string;
  selection: string;
  createdISO: string;
  createdHuman: string;
  updatedISO: string;
  updatedHuman: string;
  revisit: string;
  stage: CardStage;
  format: CardFormat;
  model: string;
  /** 来源笔记链接列表，会去重 */
  sources: string[];
}

/* ------------------------------------------------------------------ */
/* 结构定义                                                            */
/* ------------------------------------------------------------------ */

export const SECTION_ORDER: SectionId[] = [
  "definition",
  "examples",
  "boundaries",
  "origins",
  "confusions",
  "perspectives",
  "connections",
  "myview",
  "meaning",
  "selftest",
];

const LITE_SECTIONS: SectionId[] = ["definition", "examples", "boundaries", "confusions", "myview", "meaning", "selftest"];

export function sectionsFor(format: CardFormat): SectionId[] {
  return format === "lite" ? [...LITE_SECTIONS] : [...SECTION_ORDER];
}

/** 本次要 AI 写的小节 */
export function aiSectionsFor(format: CardFormat): AiSectionId[] {
  return sectionsFor(format).filter((id): id is AiSectionId =>
    ["definition", "examples", "boundaries", "origins", "confusions", "perspectives", "connections"].includes(id),
  );
}

/** 精简 → 完整需要补的小节 */
export function upgradeSections(): AiSectionId[] {
  return ["origins", "perspectives", "connections"];
}

export function isBlankSection(id: SectionId): boolean {
  return id === "myview" || id === "meaning";
}

const ORIGIN_HEADINGS: Record<string, string> = {
  人物: "时代与生平",
  理论: "来龙去脉",
  方法: "适用条件与步骤",
  作品: "作者与背景",
  事件: "背景与经过",
  组织: "背景与结构",
  概念: "来龙去脉",
  术语: "词源与演变",
};

export function headingFor(id: SectionId, type: string): string {
  switch (id) {
    case "definition":
      return "定义与机制";
    case "examples":
      return "例子";
    case "boundaries":
      return "边界与反例";
    case "origins":
      return ORIGIN_HEADINGS[type] ?? "来龙去脉";
    case "confusions":
      return "易混淆辨析";
    case "perspectives":
      return "不同视角与争议";
    case "connections":
      return "与已有知识的连接";
    case "myview":
      return "我的看法";
    case "meaning":
      return "对我的意义与行动";
    case "selftest":
      return "自测";
  }
}

/** 所有可能出现的标题（用于升级时识别已有小节） */
function headingAliases(id: SectionId, type: string): string[] {
  const out = [headingFor(id, type)];
  if (id === "origins") out.push(...Object.values(ORIGIN_HEADINGS));
  if (id === "confusions") out.push("易混淆");
  if (id === "selftest") out.push("自测与出处");
  return out;
}

/** 留白小节的追问（固定模板，AI 不参与，避免替读者表态） */
export function blankQuestions(id: SectionId): string[] {
  if (id === "myview") {
    return [
      "我同意哪一部分？为什么？",
      "哪一部分让我迟疑——是证据不足，还是与我的经验冲突？",
      "我能举一个亲身经历支持或反驳它吗？",
      "如果只能留一句话，我会怎么概括它？",
    ];
  }
  return [
    "它能解释我经历过的哪个现象？（可参考上面的例子，但只保留你真正经历过的）",
    "它在什么情况下对我不适用？",
    "本周可以试的一件小事是什么？",
    "观察什么信号说明“用上了”；如果没用上，最可能卡在哪？",
    "什么时候回来复查这张卡？",
  ];
}

/* ------------------------------------------------------------------ */
/* 解析                                                                */
/* ------------------------------------------------------------------ */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strList(v: unknown, limit = 12): string[] {
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x : x && typeof x === "object" ? str((x as Record<string, unknown>).name) : ""))
      .map((s) => collapse(s))
      .filter(Boolean)
      .slice(0, limit);
  }
  if (typeof v === "string") {
    return v
      .split(/[,，、;；\n]/)
      .map((s) => collapse(s))
      .filter(Boolean)
      .slice(0, limit);
  }
  return [];
}

function normalizeSource(v: unknown): SectionSource {
  const s = collapse(str(v)).toLowerCase();
  return s === "text" || s === "common" || s === "inference" ? s : "common";
}

const ALL_IDS = new Set<string>(SECTION_ORDER);
const HEADING_TO_ID = new Map<string, AiSectionId>();
for (const id of ["definition", "examples", "boundaries", "origins", "confusions", "perspectives", "connections"] as AiSectionId[]) {
  HEADING_TO_ID.set(headingFor(id, ""), id);
}
HEADING_TO_ID.set("易混淆", "confusions");
for (const h of Object.values(ORIGIN_HEADINGS)) HEADING_TO_ID.set(h, "origins");

/** 把任意模型 JSON 归整成 V3Card */
export function normalizeCardV3(raw: unknown, fallbackTitle: string): V3Card {
  const rec = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const title = collapse(str(rec.title) || str(rec.name)).replace(/^\[\[|\]\]$/g, "") || fallbackTitle;
  const sectionsRaw = rec.sections;
  const sections: Partial<Record<AiSectionId, CardSection>> = {};

  const put = (idOrHeading: string, body: unknown, source: unknown) => {
    const id = (ALL_IDS.has(idOrHeading) ? idOrHeading : HEADING_TO_ID.get(idOrHeading)) as AiSectionId | undefined;
    if (!id) return;
    if (typeof body !== "string" || !body.trim()) return;
    sections[id] = { body: body.trim(), source: normalizeSource(source) };
  };

  if (Array.isArray(sectionsRaw)) {
    for (const item of sectionsRaw) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      put(str(r.id) || str(r.heading), r.body ?? r.content, r.source);
    }
  } else if (sectionsRaw && typeof sectionsRaw === "object") {
    for (const [key, value] of Object.entries(sectionsRaw as Record<string, unknown>)) {
      if (typeof value === "string") put(key, value, "common");
      else if (value && typeof value === "object") {
        const v = value as Record<string, unknown>;
        put(key, v.body ?? v.content, v.source);
      }
    }
  }

  const confidenceRaw = collapse(str(rec.confidence)).toLowerCase();
  const confidence: V3Card["confidence"] =
    confidenceRaw === "high" || confidenceRaw === "medium" || confidenceRaw === "low" ? confidenceRaw : "medium";

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
    confidence,
  };
}

/* ------------------------------------------------------------------ */
/* 渲染                                                                */
/* ------------------------------------------------------------------ */

function yamlStr(s: string): string {
  return `"${collapse(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** 多行文本放进 callout 时逐行加 >，避免第二行脱离引用块 */
function quoteLines(text: string): string {
  return collapse(text)
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

const SOURCE_LABEL: Record<SectionSource, string> = {
  text: "*来源：原文*",
  common: "*来源：通行知识（非原文）*",
  inference: "*来源：AI 推断，请核对*",
};

export function buildFrontmatterV3(card: V3Card, ctx: CardRenderContextV3): string {
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

function renderBlankSection(id: SectionId): string {
  const questions = blankQuestions(id);
  const quoted = questions.map((q) => `> - ${q}`).join("\n");
  return `## ${headingFor(id, "")}\n\n> [!question] 待你补充\n${quoted}\n\n我的回答：\n`;
}

export function renderCardMarkdownV3(card: V3Card, ctx: CardRenderContextV3): string {
  const body: string[] = [];
  body.push(`# ${collapse(card.title)}`);

  if (card.summary) {
    body.push("", "> [!abstract] 一句话", quoteLines(card.summary));
  }
  if (card.quote) {
    body.push(
      "",
      "> [!quote] 原文语境",
      quoteLines(`${card.quote}${ctx.sourceNote ? ` —— [[${ctx.sourceNote}]]` : ""}`),
    );
  }

  for (const id of sectionsFor(ctx.format)) {
    if (isBlankSection(id)) {
      // 「我的看法」之前加一条分栏横线，把 AI 的理解区与读者的判断区隔开
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
    const section = card.sections[id as AiSectionId];
    if (!section || !section.body.trim()) continue;
    body.push("", `## ${headingFor(id, card.type)}`, "", section.body.trim(), "", SOURCE_LABEL[section.source]);
  }

  body.push("", "---", "", "## 出处", "");
  const sources = Array.from(new Set(ctx.sources.map((s) => s.trim()).filter(Boolean)));
  if (ctx.sourceNote) body.push(`- 来源：[[${ctx.sourceNote}]]${ctx.sourcePath ? `（\`${ctx.sourcePath}\`）` : ""}`);
  if (sources.length > 1) body.push(`- 其他来源：${sources.filter((s) => s !== ctx.sourceNote).map((s) => `[[${s}]]`).join("、")}`);
  if (ctx.selection) body.push(`- 原文片段：「${collapse(ctx.selection).slice(0, 200)}」`);
  body.push(`- 生成时间：${ctx.createdHuman}`);
  body.push(`- 最后更新：${ctx.updatedHuman}`);
  body.push(`- 生成模型：${ctx.model || "unknown"}`);
  if (card.uncertainties.length) body.push(`- 不确定点：${card.uncertainties.map((u) => collapse(u)).join("；")}`);
  body.push("- 说明：本卡由 AI 生成，关键事实请核对原始出处；留白部分由你自己填写。");

  return [buildFrontmatterV3(card, ctx), "", body.join("\n"), ""].join("\n");
}

/* ------------------------------------------------------------------ */
/* 升级：解析已有卡片 + 按固定顺序插入缺失小节                          */
/* ------------------------------------------------------------------ */

export interface ParsedCard {
  preamble: string;
  blocks: Array<{ heading: string; text: string }>;
}

/** 按 H2 切分已有的 Markdown，正文块原样保留 */
export function parseCardSections(markdown: string): ParsedCard {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Array<{ heading: string; text: string }> = [];
  let preamble: string[] = [];
  let current: { heading: string; lines: string[] } | null = null;

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

export interface SectionAddition {
  id: AiSectionId;
  body: string;
  /** 省略时不写来源标记（空模板升级用） */
  source?: SectionSource;
}

/**
 * 把缺失的小节按固定顺序插入已有卡片：
 * - 已有小节（含用户改名/自加）原样保留；
 * - 缺失且给了内容的插入；
 * - 都不认识的放在末尾。
 */
export function insertMissingSections(
  markdown: string,
  type: string,
  additions: SectionAddition[],
  format: CardFormat,
): string {
  const parsed = parseCardSections(markdown);
  const used = new Set<number>();
  const findBlock = (id: SectionId): number => {
    const aliases = headingAliases(id, type);
    return parsed.blocks.findIndex((b, i) => !used.has(i) && aliases.includes(b.heading));
  };

  const ordered: string[] = [];
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
    const label = addition.source ? `\n\n${SOURCE_LABEL[addition.source]}` : "";
    ordered.push(`## ${headingFor(id, type)}\n\n${addition.body.trim()}${label}`);
  }

  // 留白与自测（渲染时已有，升级时保留原块；若缺失则跳过）
  for (const id of ["myview", "meaning", "selftest"] as SectionId[]) {
    const idx = findBlock(id);
    if (idx >= 0) {
      used.add(idx);
      ordered.push(parsed.blocks[idx].text);
    }
  }

  // 不认识的小节（用户自加）原样放末尾
  parsed.blocks.forEach((b, i) => {
    if (!used.has(i)) ordered.push(b.text);
  });

  return `${parsed.preamble}\n\n${ordered.join("\n\n")}\n`;
}

/** 取某个留白小节里「我的回答：」后面的内容 */
function blankAnswerOf(markdown: string, heading: string): string {
  const parsed = parseCardSections(markdown);
  const block = parsed.blocks.find((b) => b.heading === heading);
  if (!block) return "";
  const idx = block.text.indexOf("我的回答：");
  if (idx < 0) return "";
  return block.text.slice(idx + "我的回答：".length).trim();
}

/** 两个留白小节各自填了多少字（去掉空白后计） */
export function blankAnswerLength(markdown: string): { view: number; meaning: number } {
  const count = (s: string) => s.replace(/\s/g, "").length;
  return {
    view: count(blankAnswerOf(markdown, "我的看法")),
    meaning: count(blankAnswerOf(markdown, "对我的意义与行动")),
  };
}

/**
 * 阶段建议（只给建议，不自动改）：
 * - 幼苗 + 两个留白都写了 ≥20 字 → 建议「成长」；
 * - 成长 + 完整版 + 留白都写了 + 复查日已到 → 建议「常青」。
 */
export function suggestStageFor(
  markdown: string,
  stage: CardStage,
  format: CardFormat,
  revisit: string,
  today: string,
): CardStage | null {
  const { view, meaning } = blankAnswerLength(markdown);
  if (view < 20 || meaning < 20) return null;
  if (stage === "幼苗") return "成长";
  if (stage === "成长" && format === "full" && revisit && revisit.slice(0, 10) <= today) return "常青";
  return null;
}

/** 只替换/插入 frontmatter 里的单个字段，不动正文 */export function setFrontmatterField(markdown: string, key: string, value: string): string {
  const m = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return markdown;
  const lines = m[1].split("\n");
  const idx = lines.findIndex((l) => l.startsWith(`${key}:`));
  if (idx >= 0) lines[idx] = `${key}: ${value}`;
  else lines.push(`${key}: ${value}`);
  return markdown.replace(m[0], `---\n${lines.join("\n")}\n---\n`);
}

/** 在 frontmatter 里追加来源（去重） */
export function appendSource(markdown: string, sourceLink: string): string {
  const m = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return markdown;
  const lines = m[1].split("\n");
  const idx = lines.findIndex((l) => l.startsWith("sources:"));
  if (idx < 0) {
    lines.push("sources:", `  - ${yamlStr(sourceLink)}`);
  } else if (!lines.some((l) => l.includes(sourceLink))) {
    lines.splice(idx + 1, 0, `  - ${yamlStr(sourceLink)}`);
  }
  return markdown.replace(m[0], `---\n${lines.join("\n")}\n---\n`);
}

/** 生成 N 天后的复查日期（YYYY-MM-DD） */
export function revisitDate(days: number, now = new Date()): string {
  const d = new Date(now.getTime() + days * 86400000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function nowISO(now = new Date()): { iso: string; human: string } {
  return formatTimestamp(now);
}

export function stageAfterUpgrade(prev: CardStage): CardStage {
  return prev === "常青" ? "常青" : "成长";
}
