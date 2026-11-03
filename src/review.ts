import { App, TFile } from "obsidian";
import { toStage, type CardStage } from "./card";

export interface ReviewCard {
  file: TFile;
  revisit: string;
  stage: CardStage;
  due: boolean;
}

/** 本地日期 YYYY-MM-DD */
export function todayKey(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

function cardsWithRevisit(app: App): Array<{ file: TFile; revisit: string; stage: CardStage }> {
  const out: Array<{ file: TFile; revisit: string; stage: CardStage }> = [];
  for (const file of app.vault.getMarkdownFiles()) {
    const front = app.metadataCache.getFileCache(file)?.frontmatter;
    if (!front || !front.card_format) continue;
    const revisit = String(front.revisit ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(revisit)) continue;
    out.push({ file, revisit, stage: toStage(front.stage) });
  }
  return out;
}

/** 在 YYYY-MM-DD 上加天数 */
export function addDaysKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map((n) => Number(n));
  const date = new Date(y, (m || 1) - 1, (d || 1) + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** 全部「在复查中」的卡片（含未来排期），按日期从早到晚 */
export function findReviewCards(app: App, today = todayKey()): ReviewCard[] {
  return cardsWithRevisit(app)
    .map((c) => ({ ...c, due: c.revisit <= today }))
    .sort((a, b) => a.revisit.localeCompare(b.revisit));
}

/** 只看已到期（启动提示、状态栏用） */
export function findDueCards(app: App, today = todayKey()): ReviewCard[] {
  return findReviewCards(app, today).filter((c) => c.due);
}
