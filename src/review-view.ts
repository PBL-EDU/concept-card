import { ItemView, WorkspaceLeaf, type TFile } from "obsidian";
import type { ReviewCard } from "./review";

export const REVIEW_VIEW_TYPE = "concept-card-reviews";

export interface ReviewHost {
  getReviewCards(): ReviewCard[];
  openCard(file: TFile): void;
  markReviewed(file: TFile): Promise<void>;
  markEvergreen(file: TFile): Promise<void>;
}

/** 右侧栏：全部在复查中的卡片（到期 + 未来排期） */
export class ConceptReviewView extends ItemView {
  private host: ReviewHost;

  constructor(leaf: WorkspaceLeaf, host: ReviewHost) {
    super(leaf);
    this.host = host;
  }

  getViewType(): string {
    return REVIEW_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "概念卡复查";
  }

  getIcon(): string {
    return "graduation-cap";
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  render(): void {
    const el = this.contentEl;
    el.empty();
    el.createEl("h4", { text: "概念卡复查" });

    const cards = this.host.getReviewCards();
    if (!cards.length) {
      el.createEl("p", { text: "还没有安排复查的卡片。在卡片上右键「安排复查（按当前阶段）」即可。", cls: "cc-muted" });
      return;
    }

    const due = cards.filter((c) => c.due);
    const upcoming = cards.filter((c) => !c.due);
    el.createEl("p", {
      text: `共 ${cards.length} 张在复查中，${due.length} 张已到期`,
      cls: "cc-muted",
    });

    this.renderSection(el, "已到期", due, "没有到期的卡片。");
    this.renderSection(el, "即将复查", upcoming, "没有排期的卡片。");
  }

  private renderSection(parent: HTMLElement, title: string, cards: ReviewCard[], emptyText: string): void {
    parent.createEl("h5", { text: `${title}（${cards.length}）` });
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
      row.createEl("span", { text: `${item.stage} · ${item.revisit}`, cls: "cc-review-meta" });
      const actions = row.createDiv({ cls: "cc-review-actions" });
      actions.createEl("button", { text: "已复查" }).addEventListener("click", () => {
        void this.host.markReviewed(item.file).then(() => this.render());
      });
      actions.createEl("button", { text: "常青" }).addEventListener("click", () => {
        void this.host.markEvergreen(item.file).then(() => this.render());
      });
    }
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }
}
