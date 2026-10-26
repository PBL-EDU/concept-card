/** Daily Note 里的复查提醒块（纯逻辑，可单测） */

export const REVIEW_BLOCK_START = "<!-- concept-card-review:start -->";
export const REVIEW_BLOCK_END = "<!-- concept-card-review:end -->";

export interface ReviewBlockCard {
  basename: string;
  stage: string;
  revisit: string;
}

export function buildReviewBlock(cards: ReviewBlockCard[]): string {
  if (!cards.length) return "今天没有到期的概念卡。";
  const lines = [`共 ${cards.length} 张到期：`, ""];
  for (const card of cards) {
    lines.push(`- [[${card.basename}]]（${card.stage} · ${card.revisit}）`);
  }
  return lines.join("\n");
}

/** 幂等写入：已有标记块则替换，没有则追加 */
export function upsertReviewBlock(note: string, inner: string): string {
  const block = `${REVIEW_BLOCK_START}\n${inner}\n${REVIEW_BLOCK_END}`;
  const re = new RegExp(`${escapeRegExp(REVIEW_BLOCK_START)}[\\s\\S]*?${escapeRegExp(REVIEW_BLOCK_END)}`);
  if (re.test(note)) return note.replace(re, block);
  const trimmed = note.replace(/\s+$/, "");
  return `${trimmed}${trimmed ? "\n\n" : ""}${block}\n`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
