/**
 * AI 调用层：OpenAI 兼容协议（OpenAI / DeepSeek / Ollama / 自定义网关）。
 * 走 Obsidian 的 requestUrl，绕过 CORS。
 */
import { requestUrl, type RequestUrlParam } from "obsidian";
import type { ConceptCardSettings } from "./types";
import { extractJson } from "./core";
import { normalizeCardV3, type SectionAddition, type V3Card } from "./card";
import { buildMessages, buildUpgradeMessages, type ChatMessage, type PromptInput, type UpgradePromptInput } from "./prompt";

export class AiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AiError";
    this.status = status;
  }
}

function endpointOf(settings: ConceptCardSettings): string {
  const base = (settings.baseUrl || "").trim().replace(/\/+$/, "");
  if (!base) throw new AiError("未配置 Base URL（设置 → 概念卡生成器 → AI 服务）");
  if (/\/chat\/completions$/.test(base)) return base;
  return `${base}/chat/completions`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  const timeoutMs = Math.max(1000, ms);
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new AiError(`${what}超时（${Math.round(timeoutMs / 1000)} 秒）`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) window.clearTimeout(timer);
  });
}

interface ChatOptions {
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

function errorMessageOf(text: string, status: number): string {
  try {
    const data = JSON.parse(text) as { error?: { message?: string }; message?: string };
    const msg = data?.error?.message ?? data?.message;
    if (msg) return msg;
  } catch {
    /* ignore */
  }
  return text.slice(0, 240) || `HTTP ${status}`;
}

/** 发一次 chat/completions，返回文本内容 */
export async function chat(
  settings: ConceptCardSettings,
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  if (!settings.apiKey && settings.provider !== "ollama") {
    throw new AiError("还没有配置 API Key：设置 → 概念卡生成器 → AI 服务");
  }

  const payload: Record<string, unknown> = {
    model: settings.model,
    messages,
    temperature: options.temperature ?? settings.temperature,
    max_tokens: options.maxTokens ?? settings.maxTokens,
    stream: false,
  };
  if (options.json && settings.provider !== "ollama") {
    payload.response_format = { type: "json_object" };
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;

  const send = async (body: Record<string, unknown>) => {
    const param: RequestUrlParam = {
      url: endpointOf(settings),
      method: "POST",
      headers,
      body: JSON.stringify(body),
      throw: false,
    };
    try {
      return await requestUrl(param);
    } catch (e) {
      throw new AiError(`网络请求失败：${(e as Error).message}。检查 Base URL / 代理 / 模型服务是否在运行。`);
    }
  };

  let response = await withTimeout(send(payload), options.timeoutMs ?? settings.timeoutMs, "AI 请求");

  // 部分网关不认识 response_format，降级重试一次
  if (response.status >= 400 && response.status < 500 && payload.response_format) {
    const firstError = errorMessageOf(response.text ?? "", response.status);
    if (/response_format|json_object|unsupported|invalid request/i.test(firstError)) {
      delete payload.response_format;
      response = await withTimeout(send(payload), options.timeoutMs ?? settings.timeoutMs, "AI 请求");
    }
  }

  const text = response.text ?? "";
  if (response.status === 401 || response.status === 403) {
    throw new AiError(`API Key 无效或没有权限（HTTP ${response.status}）：${errorMessageOf(text, response.status)}`, response.status);
  }
  if (response.status === 429) {
    throw new AiError("请求过于频繁或额度不足（HTTP 429），稍后再试。", 429);
  }
  if (response.status === 404) {
    throw new AiError(
      `接口不存在（HTTP 404）：${endpointOf(settings)}。检查 Base URL 是否少了 /v1，或是否填了完整地址。`,
      404,
    );
  }
  if (response.status >= 400) {
    throw new AiError(`AI 服务报错（HTTP ${response.status}）：${errorMessageOf(text, response.status)}`, response.status);
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new AiError(`AI 返回的不是 JSON（HTTP ${response.status}）：${text.slice(0, 160)}`);
  }

  const choices = (data as { choices?: Array<{ message?: { content?: unknown } }> }).choices;
  const content = choices?.[0]?.message?.content;
  let contentText = "";
  if (typeof content === "string") contentText = content;
  else if (Array.isArray(content)) {
    contentText = content
      .map((part) => (part && typeof part === "object" ? String((part as { text?: unknown }).text ?? "") : ""))
      .join("");
  }
  if (!contentText.trim()) {
    throw new AiError("AI 返回了空内容，请检查模型名称是否正确。");
  }
  return contentText;
}

async function askJson(
  settings: ConceptCardSettings,
  messages: ChatMessage[],
  onProgress?: (m: string) => void,
): Promise<unknown> {
  const started = Date.now();
  const raw = await chat(settings, messages, { json: true });
  let parsed = extractJson(raw);
  if (!parsed) {
    if (Date.now() - started > settings.timeoutMs) {
      throw new AiError("AI 返回格式异常，且已超过设定时长，未继续重试。");
    }
    onProgress?.("输出格式异常，正在让 AI 重新整理…");
    const repair: ChatMessage[] = [
      ...messages,
      { role: "assistant", content: raw.slice(0, 4000) },
      { role: "user", content: "上面的输出不是合法 JSON。请只输出一个合法 JSON 对象：不要代码围栏，不要解释。" },
    ];
    const remaining = Math.max(5000, settings.timeoutMs - (Date.now() - started));
    const raw2 = await chat(settings, repair, { json: true, temperature: 0.1, timeoutMs: remaining });
    parsed = extractJson(raw2);
    if (!parsed) throw new AiError("AI 连续两次都没有返回合法 JSON。建议换一个模型或降低温度。");
  }
  return parsed;
}

/** 生成一张 v3 概念卡 */
export async function generateCard(
  settings: ConceptCardSettings,
  input: PromptInput,
  onProgress?: (message: string) => void,
): Promise<V3Card> {
  onProgress?.(`正在生成${input.format === "lite" ? "精简版" : "完整版"}概念卡…`);
  const parsed = await askJson(settings, buildMessages(input), onProgress);
  const card = normalizeCardV3(parsed, input.term || "未命名概念");
  const required = input.format === "lite" ? ["definition", "examples", "boundaries", "confusions"] : ["definition", "examples", "boundaries", "confusions", "origins", "perspectives"];
  const missing = required.filter((id) => !card.sections[id as keyof typeof card.sections]);
  if (missing.length === required.length) {
    throw new AiError("AI 返回的卡片没有可用正文，请重试或更换模型。");
  }
  return card;
}

/** 补全缺失小节（精简 → 完整） */
export async function generateMissingSections(
  settings: ConceptCardSettings,
  input: UpgradePromptInput,
  onProgress?: (message: string) => void,
): Promise<SectionAddition[]> {
  onProgress?.("正在补全完整版小节…");
  const parsed = await askJson(settings, buildUpgradeMessages(input), onProgress);
  const card = normalizeCardV3(parsed, "");
  const order: Array<SectionAddition["id"]> = ["origins", "perspectives", "connections"];
  const additions: SectionAddition[] = [];
  for (const id of order) {
    const section = card.sections[id];
    if (section) additions.push({ id, body: section.body, source: section.source });
  }
  if (!additions.length) throw new AiError("AI 没有返回可补全的小节，请重试。");
  return additions;
}

/** 让 AI 在目标目录的下一级子文件夹里选一个；失败返回 null（调用方留在原目录） */
export async function chooseSubfolder(
  settings: ConceptCardSettings,
  input: { title: string; type: string; summary: string; candidates: string[] },
): Promise<string | null> {
  if (!input.candidates.length) return null;
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        '你是知识库分类助手。只能从候选目录中选一个最贴合卡片内容的；不确定就返回空字符串。只输出 JSON：{"folder":"目录名"}，不要解释。',
    },
    {
      role: "user",
      content: [
        `卡片：${input.title}`,
        `类型：${input.type}`,
        `摘要：${input.summary}`,
        `候选目录：`,
        ...input.candidates.map((c) => `- ${c}`),
      ].join("\n"),
    },
  ];
  try {
    const raw = await chat(settings, messages, { json: true, maxTokens: 80, temperature: 0 });
    const parsed = extractJson(raw) as { folder?: unknown } | null;
    const folder = typeof parsed?.folder === "string" ? parsed.folder.trim() : "";
    return input.candidates.includes(folder) ? folder : null;
  } catch {
    return null;
  }
}

/** 设置页里的“测试连接” */
export async function testConnection(settings: ConceptCardSettings): Promise<string> {
  const messages: ChatMessage[] = [{ role: "user", content: "只回复两个字：可用" }];
  const text = await chat(settings, messages, { maxTokens: 16, temperature: 0, timeoutMs: 30000 });
  return text.trim().slice(0, 60);
}
