/**
 * 生成前预览 / 编辑 / 选目录的弹窗，以及手动输入概念名的弹窗。
 */
import { App, Modal, Setting } from "obsidian";
import { sanitizeFilename } from "./core";

export interface PreviewSavePayload {
  markdown: string;
  folderPath: string;
  baseName: string;
}

export interface RegeneratedPreview {
  markdown: string;
  title: string;
  baseName: string;
  folderPath: string;
  needsCreate: boolean;
  /** 新卡片的渲染/命名闭包——重新生成后必须一起换掉，否则改标题会用到旧内容 */
  renderWith: (title: string) => string;
  filenameFor: (title: string) => string;
}

export interface PreviewModalOptions {
  markdown: string;
  /** 卡片标题（可含 AI 给的原名，不净化） */
  title: string;
  /** 文件名（已按下划线/类型规则生成并净化） */
  baseName: string;
  folderPath: string;
  /** 可选目标目录（完整路径，第一项为推荐位置） */
  folders: string[];
  /** 概念卡根目录，用来把长路径显示成短名 */
  basePath: string;
  /** 目标目录还不存在（保存时创建） */
  needsCreate: boolean;
  renderWith: (title: string) => string;
  filenameFor: (title: string) => string;
  /** 返回 true 表示已保存，弹窗关闭 */
  onSave: (payload: PreviewSavePayload) => Promise<boolean>;
  /** 重新生成；返回 null 表示失败（插件已提示） */
  onRegenerate: () => Promise<RegeneratedPreview | null>;
}

export class CardPreviewModal extends Modal {
  private opts: PreviewModalOptions;
  private markdown: string;
  private title: string;
  private baseName: string;
  private folderPath: string;
  private needsCreate: boolean;
  private renderWith: (title: string) => string;
  private filenameFor: (title: string) => string;
  private dirty = false;
  private busy = false;
  private textarea!: HTMLTextAreaElement;
  private titleInput!: HTMLInputElement;
  private filenameEl!: HTMLElement;
  private folderSelect!: HTMLSelectElement;

  constructor(app: App, opts: PreviewModalOptions) {
    super(app);
    this.opts = opts;
    this.markdown = opts.markdown;
    this.title = opts.title;
    this.baseName = opts.baseName;
    this.folderPath = opts.folderPath;
    this.needsCreate = opts.needsCreate;
    this.renderWith = opts.renderWith;
    this.filenameFor = opts.filenameFor;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("cc-preview-modal");
    this.modalEl.addClass("cc-modal", "cc-wide");
    contentEl.createEl("h2", { text: "概念卡预览" });
    contentEl.createEl("p", {
      cls: "cc-hint",
      text: "确认内容与存放位置；正文可以直接改，改过的内容不会被「重新生成」覆盖。",
    });

    new Setting(contentEl)
      .setName("标题")
      .setDesc("卡片标题；文件名按设置里的格式自动生成")
      .addText((text) => {
        this.titleInput = text.inputEl;
        text.setValue(this.title).onChange((value) => {
          this.title = value;
          this.baseName = sanitizeFilename(this.filenameFor(value)) || "未命名概念";
          this.refreshFilename();
          if (!this.dirty) {
            this.markdown = this.renderWith(value);
            this.textarea.value = this.markdown;
          }
        });
      });

    new Setting(contentEl)
      .setName("保存到")
      .setDesc("默认按卡片类型自动匹配已有子文件夹")
      .addDropdown((dd) => {
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
    footer.createEl("button", { text: "重新生成", cls: "cc-btn" }).addEventListener("click", () => void this.regenerate());
    footer.createEl("button", { text: "取消", cls: "cc-btn" }).addEventListener("click", () => this.close());
    footer.createEl("button", { text: "保存卡片", cls: "cc-btn mod-cta" }).addEventListener("click", () => void this.save());

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

  private labelFor(folderPath: string): string {
    if (!folderPath) return "（库根目录）";
    const base = this.opts.basePath;
    if (base && folderPath.startsWith(`${base}/`)) return folderPath.slice(base.length + 1);
    return folderPath;
  }

  private refreshFilename(): void {
    if (!this.filenameEl) return;
    const suffix = this.needsCreate ? "（目录将在保存时创建）" : "";
    this.filenameEl.setText(`${this.folderPath ? `${this.folderPath}/` : ""}${this.baseName}.md ${suffix}`);
  }

  private async regenerate(): Promise<void> {
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

  private async save(): Promise<void> {
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

  onClose(): void {
    this.contentEl.empty();
  }
}

/** 简单的确认弹窗（升级、标记常青等操作前用） */
export class ConfirmModal extends Modal {
  private opts: { title: string; lines: string[]; confirmText?: string };
  private onConfirm: () => void | Promise<void>;

  constructor(app: App, opts: { title: string; lines: string[]; confirmText?: string }, onConfirm: () => void | Promise<void>) {
    super(app);
    this.opts = opts;
    this.onConfirm = onConfirm;
  }

  onOpen(): void {
    this.contentEl.addClass("cc-modal");
    this.contentEl.createEl("h2", { text: this.opts.title });
    const list = this.contentEl.createEl("ul");
    for (const line of this.opts.lines) list.createEl("li", { text: line });
    const footer = this.contentEl.createDiv({ cls: "cc-footer" });
    footer.createEl("button", { text: "取消", cls: "cc-btn" }).addEventListener("click", () => this.close());
    footer
      .createEl("button", { text: this.opts.confirmText || "确认", cls: "cc-btn mod-cta" })
      .addEventListener("click", () => {
        this.close();
        void this.onConfirm();
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/** 手动输入概念名 */
export class TermInputModal extends Modal {
  private onSubmit: (term: string) => void;
  private textarea!: HTMLTextAreaElement;

  constructor(app: App, onSubmit: (term: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    this.contentEl.addClass("cc-modal");
    this.contentEl.createEl("h2", { text: "生成概念卡" });
    this.contentEl.createEl("p", {
      cls: "cc-hint",
      text: "输入人名、理论或概念名称；也可以补一句它出现在哪段材料里，帮助 AI 贴住语境。",
    });
    this.textarea = this.contentEl.createEl("textarea", { cls: "cc-input" });
    this.textarea.placeholder = "例如：认知失调 / 心流 / 建构主义";
    this.textarea.addEventListener("keydown", (evt) => {
      if (evt.key !== "Enter" || evt.shiftKey) return;
      // 中文输入法组词时回车用于选词，不能当作提交
      if (evt.isComposing || evt.keyCode === 229) return;
      evt.preventDefault();
      this.submit();
    });
    const footer = this.contentEl.createDiv({ cls: "cc-footer" });
    footer.createEl("button", { text: "取消", cls: "cc-btn" }).addEventListener("click", () => this.close());
    footer.createEl("button", { text: "生成", cls: "cc-btn mod-cta" }).addEventListener("click", () => this.submit());
    window.setTimeout(() => this.textarea.focus(), 30);
  }

  private submit(): void {
    const value = this.textarea.value.trim();
    if (!value) return;
    this.close();
    this.onSubmit(value);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
