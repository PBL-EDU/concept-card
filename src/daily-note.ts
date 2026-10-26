import { App, TFile, normalizePath } from "obsidian";
import type { ConceptCardSettings } from "./types";
import type { ReviewCard } from "./review";
import { buildReviewBlock, upsertReviewBlock } from "./daily-block";
import { ensureFolder } from "./vault";

export interface DailyWriteResult {
  path: string;
  ok: boolean;
  missing?: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDate(now: Date, format: string): string {
  const m = (window as unknown as { moment?: (d?: Date) => { format(f: string): string } }).moment;
  if (m) return m(now).format(format);
  return format
    .replace(/YYYY/g, String(now.getFullYear()))
    .replace(/MM/g, pad(now.getMonth() + 1))
    .replace(/DD/g, pad(now.getDate()));
}

/** 展开文件夹里的 {YYYY}/{MM}/{DD} 占位符 */
function expandFolder(folder: string, date: Date): string {
  return folder
    .replace(/\{YYYY\}/g, String(date.getFullYear()))
    .replace(/\{MM\}/g, pad(date.getMonth() + 1))
    .replace(/\{DD\}/g, pad(date.getDate()));
}

export function resolveDailyNotePath(app: App, settings: ConceptCardSettings, now = new Date()): string {
  const rawFolder = (settings.dailyNoteFolder || "").replace(/^\/+|\/+$/g, "");
  const folder = expandFolder(rawFolder, now);
  const format = settings.dailyNoteFormat || "YYYY-MM-DD";
  const name = formatDate(now, format);
  return normalizePath(folder ? `${folder}/${name}.md` : `${name}.md`);
}

/** 按 YYYY-MM-DD 解析那一天的日记路径 */
export function dailyNotePathForDate(app: App, settings: ConceptCardSettings, dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map((n) => Number(n));
  const date = new Date(y, (m || 1) - 1, d || 1);
  return resolveDailyNotePath(app, settings, date);
}

function folderOf(path: string): string {
  return path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
}

/**
 * 把某一天的到期卡片写进那一天的日记。
 * createIfMissing=true 时（预告模式）日记不存在会新建；否则返回 missing。
 */
export async function writeCardsToDate(
  app: App,
  settings: ConceptCardSettings,
  dateKey: string,
  cards: ReviewCard[],
  createIfMissing = false,
): Promise<DailyWriteResult> {
  const path = dailyNotePathForDate(app, settings, dateKey);
  let file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) {
    if (!createIfMissing) return { path, ok: false, missing: true };
    const parent = folderOf(path);
    if (parent) await ensureFolder(app, parent);
    await app.vault.create(path, `# ${dateKey}\n`);
    file = app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return { path, ok: false, missing: true };
  }

  const block = buildReviewBlock(
    cards.map((c) => ({ basename: c.file.basename, stage: c.stage, revisit: c.revisit })),
  );
  const content = await app.vault.read(file);
  const next = upsertReviewBlock(content, block);
  if (next !== content) await app.vault.modify(file, next);
  return { path, ok: true };
}

/** 把「今天到期」的卡片写进今天的日记（不创建不存在的日记） */
export async function writeDueCardsToDailyNote(
  app: App,
  settings: ConceptCardSettings,
  cards: ReviewCard[],
  now = new Date(),
): Promise<DailyWriteResult> {
  const dateKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return writeCardsToDate(app, settings, dateKey, cards, false);
}
