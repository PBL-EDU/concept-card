/**
 * v3 提示词：两档结构（lite / full）、固定小节 id、来源标记、留白不归 AI。
 * 只依赖 types/card，方便单测。
 */
import type { LanguageMode } from "./types";
import { aiSectionsFor, upgradeSections, type AiSectionId, type CardFormat } from "./card";

export interface PromptInput {
  /** 选中文本整理出的术语（AI 标题失败时的兜底） */
  term: string;
  /** 用户选中的原文 */
  selection: string;
  /** 来源笔记名（不含扩展名） */
  sourceNote: string;
  /** 来源笔记路径 */
  sourcePath: string;
  /** 选中位置前后的上下文 */
  context: string;
  /** 知识库里已有的概念卡标题 */
  existingCards: string[];
  /** 知识库里已有的标签（可选，用来减少标签碎片化） */
  existingTags?: string[];
  language: LanguageMode;
  /** 中文卡片是否给重要名词中英对照（默认开启） */
  bilingual?: boolean;
  format: CardFormat;
  extraInstructions: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SECTION_GUIDE: Record<AiSectionId, string> = {
  definition:
    "definition 定义与机制：分 2-3 层讲清它是什么、怎么成立/运作，可含「为什么重要」一句；不要写生平或评价。",
  examples: "examples 例子：1 个来自原文语境的例子 + 1 个典型/生活例子；不要编造具体数据。",
  boundaries:
    "boundaries 边界与反例：它在什么条件下不成立、哪些情况看起来像其实不是、最常见的误用是什么。",
  origins:
    "origins 来龙去脉：按类型写——人物写时代、关键经历、代表作与核心贡献；理论写提出者、年代、后续修正；方法写适用条件、步骤、成本与失败模式；作品写作者、年代、核心论点与影响。",
  confusions: "confusions 易混淆辨析：1-3 个最易混的概念，分别写相似点、关键区别、常见误用。",
  perspectives:
    "perspectives 不同视角与争议：支持它的最强理由、最强的反驳、后来者如何修正它；只呈现视角，不要给读者下结论。",
  connections:
    "connections 与已有知识的连接：只 [[链接]] 到「已有概念卡」列表里出现过的标题，并说明关系（属于/对比/因果/前提/例证）；列表里没有的写普通名称。",
};

const SOURCE_RULE = `每个小节必须带 source 字段：
- "text"：内容明确来自原文片段；
- "common"：学科通行知识（原文没提）；
- "inference"：你的整合或推断。
原文没说的不要标 text。`;

function structureFor(language: "zh" | "en", bilingual: boolean, format: CardFormat): string {
  const ids = aiSectionsFor(format);
  const titleHint =
    language === "zh"
      ? bilingual
        ? "从选区提炼出的单一中文概念名（去掉修饰语；英文原名放 aliases）"
        : "从选区提炼出的单一中文概念名"
      : "single canonical concept name extracted from the selection";
  const aliasHint = language === "zh" ? "英文原名、常见译名、缩写" : "aliases, abbreviations, original-language name";
  const sectionLines = ids.map((id) => `    "${id}": {"body": "Markdown 正文", "source": "text|common|inference"}`).join(",\n");
  return `{
  "title": "${titleHint}",
  "type": "人物|理论|概念|方法|事件|作品|术语|组织 之一",
  "aliases": ["${aliasHint}"],
  "tags": ["2-4 个主题标签，优先复用已有标签；不含 # 号"],
  "summary": "一句话定义，≤60 字",
  "quote": "（可选）逐字取自原文片段的一句原话；没有就给空字符串",
  "sections": {
${sectionLines}
  },
  "selftest": ["2-3 个检验理解的问题（不要复述题，只出题不给答案）"],
  "uncertainties": ["你不太确定的点；没有就给空数组"],
  "confidence": "high|medium|low"
}`;
}

export function resolveLanguage(mode: LanguageMode, text: string): "zh" | "en" {
  if (mode === "zh" || mode === "en") return mode;
  return /[\u3400-\u9fff]/.test(text) ? "zh" : "en";
}

export function buildSystemPrompt(language: "zh" | "en", bilingual: boolean, format: CardFormat): string {
  const langRule =
    language === "zh"
      ? bilingual
        ? "全部使用简体中文。重要人名、理论、著作、概念首次出现时写成「中文（English）」，例如「认知失调（Cognitive Dissonance）」；title 只写中文，英文原名放进 aliases。"
        : "全部使用简体中文（专有名词可保留英文原名并在括号里注出）。"
      : "Write everything in English (keep the original proper nouns when they are not English).";

  const isLite = format === "lite";
  const sectionList = aiSectionsFor(format)
    .map((id) => `- ${id}：${SECTION_GUIDE[id]}`)
    .join("\n");

  return `你是知识库编辑，为学习者的 Obsidian 库生成「概念卡」的 JSON。卡片分两档：lite 精简版、full 完整版。本次是 ${isLite ? "lite 精简版" : "full 完整版"}。

【只能使用这些小节 id，不要自创】
${sectionList}

【写作原则】
1. 准确优先：只写公认、可核查的知识；不编造年份、页码、数据、师承。不确定就写进 uncertainties。
2. 贴合原文：结合原文片段与上下文，说明它在这段材料里的具体含义。
3. 读者视角：解释“是什么、为什么、怎么用”，不要空话。
4. 双链克制：只 [[链接]] 已有概念卡；没有就写普通名称，不要虚构链接。
5. ${langRule}
6. 不替读者表态：不要输出“我认为/我认为你该/对你的意义是”这类判断；个人看法与行动由卡片留白，读者自己填写。
7. ${SOURCE_RULE}
8. quote 必须逐字来自原文片段；片段里没有就留空，不要改写。
9. 篇幅：${isLite ? "lite 总字数 500-800 字" : "full 总字数 900-1500 字"}；summary ≤ 60 字。
10. selftest 出 2-3 个问题，检测理解（如“在 X 场景下该用 A 还是 B”），不要问“是什么”。
11. 从选区提炼名称：选区可能多带了前后的字、动作或整句。title 只取核心概念名，去掉「××提出的 / 研究表明 / 关于……的理论 / 的……理论」等修饰；aliases 只放这个概念名的别名（英文原名、缩写、常见译名），不要把整句选区塞进 aliases。

【输出格式】只输出一个 JSON 对象：不要 Markdown 代码围栏，不要解释文字。字段结构：

${structureFor(language, bilingual, format)}`;
}

export function buildUserPrompt(input: PromptInput): string {
  const language = resolveLanguage(input.language, input.selection || input.term);
  const parts: string[] = [];
  parts.push(`【选中的原文片段】\n「${input.selection}」`);
  if (input.sourceNote) {
    parts.push(`【所在笔记】${input.sourceNote}${input.sourcePath ? `（${input.sourcePath}）` : ""}`);
  }
  if (input.context.trim()) parts.push(`【上下文】\n${input.context.trim()}`);
  if (input.existingCards.length) {
    parts.push(`【已有概念卡（只能链接这些标题）】\n${input.existingCards.map((c) => `- ${c}`).join("\n")}`);
  }
  if (input.existingTags?.length) {
    parts.push(`【库里已有标签（优先复用）】\n${input.existingTags.map((t) => `- ${t}`).join("\n")}`);
  }
  parts.push(
    `【任务】为上面的选区写一张 ${input.format === "lite" ? "lite 精简版" : "full 完整版"} 概念卡。选区可能包含修饰语，请自行提炼核心概念名。${
      language === "zh" ? "用简体中文输出 JSON。" : "Output JSON in English."
    }`,
  );
  if (input.extraInstructions.trim()) parts.push(`【额外要求】\n${input.extraInstructions.trim()}`);
  return parts.join("\n\n");
}

export function buildMessages(input: PromptInput): ChatMessage[] {
  const language = resolveLanguage(input.language, input.selection || input.term);
  return [
    { role: "system", content: buildSystemPrompt(language, input.bilingual ?? true, input.format) },
    { role: "user", content: buildUserPrompt(input) },
  ];
}

/* ------------------------------------------------------------------ */
/* 升级：只补缺失小节                                                    */
/* ------------------------------------------------------------------ */

export interface UpgradePromptInput {
  existingMarkdown: string;
  type: string;
  language: LanguageMode;
  bilingual?: boolean;
  existingCards: string[];
}

export function buildUpgradeMessages(input: UpgradePromptInput): ChatMessage[] {
  const language = resolveLanguage(input.language, input.existingMarkdown);
  const ids = upgradeSections();
  const guides = ids.map((id) => `- ${id}：${SECTION_GUIDE[id]}`).join("\n");
  const langRule =
    language === "zh"
      ? input.bilingual === false
        ? "全部使用简体中文。"
        : "全部使用简体中文；重要名词首次出现写成「中文（English）」。"
      : "Write everything in English.";
  const system = `你是知识库编辑。下面是一张已有的概念卡（精简版），需要补全为完整版：只补缺失的小节，不要改写已有内容。

【要补的小节 id】origins, perspectives, connections

【要补的小节】
${guides}

【要求】
1. ${langRule}
2. 只写给定 id，不要自创小节；每个小节带 source（text/common/inference）。
3. 如果已有卡片里已经写了某个方面的内容，不要重复。
4. 不替读者表态；不要输出“我的看法/对我的意义”。
5. 只输出 JSON：{"sections": {"<id>": {"body": "...", "source": "..."}}, "uncertainties": []}`;

  const user = [
    `【已有概念卡】\n${input.existingMarkdown.slice(0, 6000)}`,
    input.existingCards.length ? `【已有概念卡标题（用于 connections 双链）】\n${input.existingCards.map((c) => `- ${c}`).join("\n")}` : "",
    `【类型】${input.type}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
