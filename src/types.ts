/**
 * 概念卡生成器 —— 共享类型与默认配置
 * 这个文件不依赖 obsidian，方便在 Node 里单测。
 */

export interface CardSection {
  heading: string;
  body: string;
}

export interface CardConfusion {
  name: string;
  difference: string;
}

export interface CardRelation {
  name: string;
  why: string;
}

export interface CardData {
  title: string;
  type: string;
  aliases: string[];
  tags: string[];
  summary: string;
  quote: string;
  sections: CardSection[];
  confusions: CardConfusion[];
  related: CardRelation[];
  questions: string[];
  confidence: "high" | "medium" | "low";
}

/** 渲染成文件时的上下文 */
export interface CardRenderContext {
  /** 来源笔记名（不含扩展名），为空表示没有来源 */
  sourceNote: string;
  /** 来源笔记路径 */
  sourcePath: string;
  /** 用户选中的原文片段 */
  selection: string;
  /** 生成时间（ISO，用于 frontmatter） */
  createdISO: string;
  /** 生成时间（人类可读，用于正文） */
  createdHuman: string;
  /** 生成所用模型，形如 gpt-4o-mini */
  model: string;
  /** 库里已有的卡片标题；提供时，不在其中的名字不生成双链 */
  linkTargets?: string[];
}

export type FilenamePattern = "title" | "type-title" | "title-type";
export type DuplicatePolicy = "open" | "suffix" | "overwrite";
export type LanguageMode = "auto" | "zh" | "en";
export type ProviderId = "openai" | "deepseek" | "ollama" | "custom";

export interface ReviewIntervals {
  幼苗: number;
  成长: number;
  常青: number;
}

export interface ConceptCardSettings {
  /* ---------- 归档 ---------- */
  /** 强制放在库根目录（忽略自动检测与下面的路径） */
  useVaultRoot: boolean;
  /** 是否自动按类型匹配根目录下的现有子文件夹 */
  autoMatchSubfolders: boolean;
  /** 目标文件夹下还有子文件夹时，让 AI 再选一层 */
  aiSubfolder: boolean;
  /** 概念卡根目录；留空 = 自动扫描知识库里的现有目录 */
  cardRootFolder: string;
  /** 类型 -> 子文件夹名；空字符串表示自动匹配现有子文件夹 */
  subfolderMap: Record<string, string>;
  /** 找不到匹配的子文件夹时，是否新建一个以类型命名的文件夹 */
  autoCreateSubfolder: boolean;

  /* ---------- 生命周期 ---------- */
  /** 各阶段复查间隔（天） */
  reviewIntervals: ReviewIntervals;
  /** 打开卡片时检测留白，给阶段升级建议 */
  stageSuggestions: boolean;
  /** 启动时提示到期复查 */
  reviewReminder: boolean;
  /** 把今日到期卡片写进 Daily Note */
  dailyNoteReminder: boolean;
  /** Daily Note 目录；留空用 Daily Notes 插件设置 */
  dailyNoteFolder: string;
  /** Daily Note 文件名格式；留空用插件设置 */
  dailyNoteFormat: string;
  /** 启动时预写未来多少天内的日记（0 = 不预写） */
  dailyNoteHorizonDays: number;

  /* ---------- 内容 ---------- */
  /** 卡片语言 */
  language: LanguageMode;
  /** 中文卡片里，重要人名/理论/著作/概念首次出现时给中英文对照 */
  bilingual: boolean;
  /** 是否把选中文本前后的上下文一起发给模型 */
  includeContext: boolean;
  /** 上下文取多少字符（前后各一半） */
  contextChars: number;
  /** 是否把已有关联卡片的标题发给模型，让它直接 [[双链]] */
  linkExistingCards: boolean;
  /** 发给模型的已有卡片标题数量上限 */
  maxExistingCards: number;
  /** 追加到提示词的自定义要求 */
  extraInstructions: string;

  /* ---------- 保存 ---------- */
  /** 保存前弹出预览确认 */
  previewBeforeSave: boolean;
  /** 保存后打开新卡片 */
  openAfterCreate: boolean;
  /** 在原文里把选中的关键词变成指向新卡片的双链（阅读视图也会写回文件） */
  linkBackToSource: boolean;
  /** 文件名格式 */
  filenamePattern: FilenamePattern;
  /** 同名卡片的处理方式 */
  onDuplicate: DuplicatePolicy;

  /* ---------- 交互 ---------- */
  /** 阅读视图右键菜单是否接管（插件自己的菜单） */
  readingViewMenu: boolean;
  /** 是否显示左侧栏图标 */
  showRibbon: boolean;

  /* ---------- AI ---------- */
  provider: ProviderId;
  /** OpenAI 兼容的 base url，如 https://api.openai.com/v1 */
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

export const CARD_TYPES = ["人物", "理论", "概念", "方法", "事件", "作品", "术语", "组织"] as const;

export const DEFAULT_SUBFOLDER_MAP: Record<string, string> = {
  人物: "",
  理论: "",
  概念: "",
  方法: "",
  事件: "",
  作品: "",
  术语: "",
  组织: "",
};

export const DEFAULT_SETTINGS: ConceptCardSettings = {
  useVaultRoot: false,
  autoMatchSubfolders: true,
  aiSubfolder: true,
  cardRootFolder: "",
  subfolderMap: { ...DEFAULT_SUBFOLDER_MAP },
  autoCreateSubfolder: false,

  reviewIntervals: { 幼苗: 7, 成长: 14, 常青: 90 },
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
  maxTokens: 2000,
  timeoutMs: 60000,
};
