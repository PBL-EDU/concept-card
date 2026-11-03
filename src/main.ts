/**
 * 概念卡生成器 v3（demo）
 *
 * - 右键两档生成：精简（7 节）/ 完整（10 节）
 * - 精简版可补全为完整版（AI 补全 / 空模板）
 * - 留白追问、生命周期字段（card_format / stage / revisit / sources）
 */
import { App, MarkdownView, Menu, Notice, Plugin, TFile, normalizePath } from "obsidian";
import { AiError, chooseSubfolder, generateCard, generateMissingSections, testConnection } from "./ai";
import {
  collapse,
  filenameFor,
  findLinkableSpot,
  linkFirstKeyword,
  matchSubfolder,
  nextAvailableName,
  resolveMappedPath,
  sanitizeFilename,
  sliceContext,
  termFromSelection,
  titleKey,
} from "./core";
import {
  headingFor,
  insertMissingSections,
  nowISO,
  renderCardMarkdownV3,
  revisitDate,
  setFrontmatterField,
  stageAfterUpgrade,
  suggestStageFor,
  toStage,
  upgradeSections,
  type CardFormat,
  type CardRenderContextV3,
  type CardStage,
  type SectionAddition,
  type V3Card,
} from "./card";
import { CardPreviewModal, ConfirmModal, TermInputModal, type PreviewSavePayload } from "./modal";
import { writeCardsToDate, writeDueCardsToDailyNote } from "./daily-note";
import { addDaysKey, findDueCards, findReviewCards, todayKey, type ReviewCard } from "./review";
import { ConceptReviewView, REVIEW_VIEW_TYPE } from "./review-view";
import { ConceptCardSettingTab } from "./settings";
import { DEFAULT_SETTINGS, type ConceptCardSettings } from "./types";
import {
  collectExistingCardTitles,
  collectExistingTags,
  ensureFolder,
  existingNamesInFolder,
  findCardsByTitle,
  folderExists,
  getFileByName,
  listSubfolders,
  openFileInWorkspace,
  resolveRootFolder,
  safePath,
} from "./vault";

interface Generation {
  card: V3Card;
  format: CardFormat;
  title: string;
  ctx: CardRenderContextV3;
  markdown: string;
  root: string;
  baseName: string;
  folderPath: string;
  needsCreate: boolean;
  folderOptions: string[];
}

interface SaveResult {
  ok: boolean;
  message?: string;
}

function uniquePaths(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of list) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function cardFormatOf(app: App, file: TFile | null): string {
  if (!file) return "";
  const front = app.metadataCache.getFileCache(file)?.frontmatter;
  return typeof front?.card_format === "string" ? front.card_format : "";
}

function stageOf(app: App, file: TFile | null): CardStage {
  if (!file) return "幼苗";
  const front = app.metadataCache.getFileCache(file)?.frontmatter;
  const stage = String(front?.stage ?? "幼苗");
  return stage === "成长" || stage === "常青" ? stage : "幼苗";
}

export default class ConceptCardPlugin extends Plugin {
  settings: ConceptCardSettings = { ...DEFAULT_SETTINGS };
  private busy = false;
  private statusEl: HTMLElement | null = null;
  private suggested = new Set<string>();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new ConceptCardSettingTab(this.app, this));

    this.registerView(REVIEW_VIEW_TYPE, (leaf) => new ConceptReviewView(leaf, this));
    this.statusEl = this.addStatusBarItem();
    this.statusEl.addClass("cc-status");
    this.statusEl.addEventListener("click", () => void this.openReviewView());
    this.app.workspace.onLayoutReady(() => {
      this.refreshReviewStatus(true);
      void this.syncDailyReview(false);
      void this.syncUpcomingDailyNotes();
    });
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        void this.maybeSuggestStage(file instanceof TFile ? file : null);
      }),
    );

    /* 编辑视图：两档生成 */
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        const selection = editor.getSelection();
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (selection && selection.trim()) {
          menu.addItem((item) =>
            item
              .setTitle("生成概念卡（精简）")
              .setIcon("sparkles")
              .onClick(() => void this.run(selection, view, "lite")),
          );
          menu.addItem((item) =>
            item
              .setTitle("生成概念卡（完整）")
              .setIcon("sparkles")
              .onClick(() => void this.run(selection, view, "full")),
          );
          return;
        }
        if (view?.file && cardFormatOf(this.app, view.file) === "lite") {
          const file = view.file;
          menu.addItem((item) =>
            item
              .setTitle("补全为完整版（AI）")
              .setIcon("arrow-up-circle")
              .onClick(() => void this.upgradeCard(file, true)),
          );
        }
      }),
    );

    /* 阅读视图：接管选中文字后的右键 */
    this.registerDomEvent(
      document,
      "contextmenu",
      (evt: MouseEvent) => this.handleReadingViewContextMenu(evt),
      { capture: true },
    );

    /* 文件列表右键：卡片维护动作 */
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFile) || file.extension !== "md") return;
        const format = cardFormatOf(this.app, file);
        if (!format) return;
        if (format === "lite") {
          menu.addItem((item) =>
            item.setTitle("概念卡：补全为完整版（AI）").setIcon("arrow-up-circle").onClick(() => void this.upgradeCard(file, true)),
          );
          menu.addItem((item) =>
            item.setTitle("概念卡：升级为完整版（空模板）").setIcon("file-plus").onClick(() => void this.upgradeCard(file, false)),
          );
          menu.addSeparator();
        }
        menu.addItem((item) => item.setTitle("概念卡：标记为常青").setIcon("star").onClick(() => void this.markEvergreen(file)));
        menu.addItem((item) =>
          item
            .setTitle("概念卡：安排复查（按当前阶段）")
            .setIcon("calendar-clock")
            .onClick(() => void this.scheduleReview(file, this.reviewIntervalFor(stageOf(this.app, file)))),
        );
      }),
    );

    this.addCommand({ id: "generate-lite", name: "生成概念卡（精简）", callback: () => this.runFromActiveView("lite") });
    this.addCommand({ id: "generate-full", name: "生成概念卡（完整）", callback: () => this.runFromActiveView("full") });
    this.addCommand({
      id: "generate-manual",
      name: "生成概念卡：手动输入概念名（完整）",
      callback: () => this.runManual(),
    });
    this.addCommand({ id: "upgrade-card-ai", name: "概念卡：补全为完整版（AI）", callback: () => void this.upgradeActive(true) });
    this.addCommand({ id: "upgrade-card-blank", name: "概念卡：升级为完整版（空模板）", callback: () => void this.upgradeActive(false) });
    this.addCommand({ id: "mark-evergreen", name: "概念卡：标记为常青", callback: () => void this.markEvergreenActive() });
    this.addCommand({ id: "open-review-view", name: "打开概念卡复查面板", callback: () => void this.openReviewView() });
    this.addCommand({
      id: "write-daily-review",
      name: "概念卡：把复查写入今日日记",
      callback: () => void this.syncDailyReview(true),
    });
    this.addCommand({
      id: "write-daily-due",
      name: "概念卡：把复查写入下次复查日的日记（预告）",
      callback: () => void this.writeActiveDueDaily(),
    });
    this.addCommand({
      id: "apply-stage-suggestion",
      name: "概念卡：按建议更新阶段",
      callback: () => void this.applyStageSuggestionActive(),
    });
    this.addCommand({ id: "test-connection", name: "测试 AI 连接", callback: () => void this.doTestConnection() });

    if (this.settings.showRibbon) {
      this.addRibbonIcon("sparkles", "生成概念卡（完整）", () => this.runFromActiveView("full"));
    }
  }

  async loadSettings(): Promise<void> {
    const stored = (await this.loadData()) as Partial<ConceptCardSettings> | null;
    const isLegacy = !!stored && stored.bilingual === undefined;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, stored ?? {});
    this.settings.subfolderMap = {
      ...DEFAULT_SETTINGS.subfolderMap,
      ...(stored?.subfolderMap ?? {}),
    };
    this.settings.reviewIntervals = {
      ...DEFAULT_SETTINGS.reviewIntervals,
      ...(stored?.reviewIntervals ?? {}),
    };
    if (isLegacy && this.settings.language === "auto") {
      this.settings.language = "zh";
      await this.saveSettings();
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /* ------------------------------------------------------------------ */
  /* 入口                                                                */
  /* ------------------------------------------------------------------ */

  private handleReadingViewContextMenu(evt: MouseEvent): void {
    if (!this.settings.readingViewMenu) return;
    if (evt.defaultPrevented) return;
    const target = evt.target as HTMLElement | null;
    if (!target || typeof target.closest !== "function") return;
    const preview = target.closest(".markdown-preview-view");
    if (!preview) return;
    if (target.closest("a, img, input, .internal-embed, .task-list-item-checkbox, .markdown-embed")) return;

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !view.containerEl || !view.containerEl.contains(preview)) return;

    const win = view.containerEl.ownerDocument?.defaultView ?? window;
    const selection = win.getSelection();
    if (!selection || selection.isCollapsed) return;
    const text = selection.toString().trim();
    if (!text) return;
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!range || !preview.contains(range.commonAncestorContainer)) return;

    evt.preventDefault();
    evt.stopPropagation();

    const menu = new Menu();
    menu.addItem((item) =>
      item.setTitle("生成概念卡（精简）").setIcon("sparkles").onClick(() => void this.run(text, view, "lite")),
    );
    menu.addItem((item) =>
      item.setTitle("生成概念卡（完整）").setIcon("sparkles").onClick(() => void this.run(text, view, "full")),
    );
    menu.addSeparator();
    menu.addItem((item) => item.setTitle("复制").setIcon("copy").onClick(() => this.copyText(text)));
    menu.showAtMouseEvent(evt);
  }

  private copyText(text: string): void {
    try {
      const clipboard = navigator.clipboard;
      if (clipboard?.writeText) {
        void clipboard.writeText(text).catch(() => new Notice("复制失败，请手动复制"));
        return;
      }
    } catch {
      /* 移动端或受限环境 */
    }
    new Notice("当前环境不支持自动复制，请手动复制");
  }

  private runFromActiveView(format: CardFormat): void {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      new Notice("请先打开一篇 Markdown 笔记");
      return;
    }
    let selection = "";
    try {
      if (view.getMode() === "source" && view.editor) selection = view.editor.getSelection();
    } catch {
      /* 阅读视图没有编辑器 */
    }
    if (!selection) {
      const win = view.containerEl?.ownerDocument?.defaultView ?? window;
      selection = win.getSelection()?.toString() ?? "";
    }
    if (!selection.trim()) {
      new Notice("请先选中一段文字，或用命令「生成概念卡：手动输入概念名」");
      return;
    }
    void this.run(selection, view, format);
  }

  private runManual(): void {
    new TermInputModal(this.app, (term) => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      void this.run(term, view, "full");
    }).open();
  }

  private async doTestConnection(): Promise<void> {
    const notice = new Notice("正在测试 AI 连接…", 0);
    try {
      const reply = await testConnection(this.settings);
      notice.hide();
      new Notice(`✅ 连接正常：${reply}`);
    } catch (e) {
      notice.hide();
      this.reportError(e, "连接测试失败");
    }
  }

  /* ------------------------------------------------------------------ */
  /* 生成流程                                                            */
  /* ------------------------------------------------------------------ */

  private async run(rawSelection: string, view: MarkdownView | null, format: CardFormat): Promise<void> {
    if (this.busy) {
      new Notice("上一张概念卡还在生成中，请稍等…");
      return;
    }
    const selection = collapse(rawSelection);
    if (!selection) {
      new Notice("选中的内容为空");
      return;
    }

    // 生成前预检：全库已有同名卡片且策略为「打开已有」时，直接打开，省一次 AI 调用
    const guess = termFromSelection(selection);
    if (guess && this.settings.onDuplicate === "open") {
      const hit = findCardsByTitle(this.app, guess)[0];
      if (hit) {
        await this.insertSourceLink(view, selection, hit.basename);
        await openFileInWorkspace(this.app, hit);
        new Notice(`库中已有「${hit.basename}」（${hit.path}），已为你打开；要生成第二张请把同名策略改为「加 -2 后缀」`, 8000);
        return;
      }
    }

    this.busy = true;
    const notice = new Notice(`正在生成${format === "lite" ? "精简版" : "完整版"}概念卡…`, 0);
    let generation: Generation;
    try {
      generation = await this.buildGeneration(selection, view, format, (m) => notice.setMessage(m));
    } catch (e) {
      this.reportError(e, "生成失败");
      return;
    } finally {
      this.busy = false;
      notice.hide();
    }

    if (this.settings.previewBeforeSave) {
      this.openPreview(generation, view);
      return;
    }

    const saved = await this.commitCard(generation, view, {
      markdown: generation.markdown,
      folderPath: generation.folderPath,
      baseName: generation.baseName,
    });
    if (saved.ok && saved.message) new Notice(saved.message, 5000);
  }

  private async buildGeneration(
    selection: string,
    view: MarkdownView | null,
    format: CardFormat,
    progress: (message: string) => void,
  ): Promise<Generation> {
    const settings = this.settings;
    const term = termFromSelection(selection);
    const root = resolveRootFolder(this.app, settings);
    const subNames = listSubfolders(this.app, root);
    const subfolderPaths = subNames.map((name) => (root ? `${root}/${name}` : name));

    const existingCards = settings.linkExistingCards
      ? collectExistingCardTitles(this.app, root, settings.maxExistingCards)
      : [];
    const existingTags = collectExistingTags(this.app, root, 80);
    const sourceNote = view?.file?.basename ?? "";
    const sourcePath = view?.file?.path ?? "";
    const fullText = await this.readFullText(view);
    const context = settings.includeContext ? sliceContext(fullText, selection, settings.contextChars) : "";

    const card = await generateCard(
      settings,
      {
        term,
        selection,
        sourceNote,
        sourcePath,
        context,
        existingCards,
        existingTags,
        language: settings.language,
        bilingual: settings.bilingual,
        format,
        extraInstructions: settings.extraInstructions,
      },
      progress,
    );

    const mapped = (settings.subfolderMap[card.type] ?? "").trim();
    let folderPath: string;
    let needsCreate: boolean;
    if (mapped) {
      folderPath = safePath(resolveMappedPath(mapped, root));
      needsCreate = folderPath ? !folderExists(this.app, folderPath) : false;
    } else if (!settings.autoMatchSubfolders) {
      // 关闭自动匹配：只认显式映射，其余直接放根目录
      folderPath = root;
      needsCreate = false;
    } else {
      const placement = matchSubfolder(card.type, subNames, settings.autoCreateSubfolder);
      folderPath = safePath(placement.folder ? (root ? `${root}/${placement.folder}` : placement.folder) : root);
      needsCreate = placement.needsCreate;
    }

    // 目标目录下还有子文件夹时，让 AI 再选一层（例如 3.基本概念 → 3.基本概念/心理学）
    if (settings.aiSubfolder && folderPath) {
      const subs = listSubfolders(this.app, folderPath);
      if (subs.length) {
        progress("正在选择下级分类目录…");
        const chosen = await chooseSubfolder(settings, {
          title: card.title,
          type: card.type,
          summary: card.summary,
          candidates: subs,
        });
        if (chosen) {
          folderPath = safePath(`${folderPath}/${chosen}`);
          needsCreate = !folderExists(this.app, folderPath);
        }
      }
    }

    const ts = nowISO();
    const ctx: CardRenderContextV3 = {
      sourceNote,
      sourcePath,
      selection,
      createdISO: ts.iso,
      createdHuman: ts.human,
      updatedISO: ts.iso,
      updatedHuman: ts.human,
      revisit: revisitDate(this.reviewIntervalFor("幼苗")),
      stage: "幼苗",
      format,
      model: settings.model,
      sources: sourceNote ? [sourceNote] : [],
    };
    const baseName = filenameFor(card, settings.filenamePattern);
    const markdown = renderCardMarkdownV3(card, ctx);

    return {
      card,
      format,
      title: card.title,
      ctx,
      markdown,
      root,
      baseName,
      folderPath,
      needsCreate,
      folderOptions: uniquePaths([folderPath, root, ...subfolderPaths]),
    };
  }

  private async readFullText(view: MarkdownView | null): Promise<string> {
    if (!view || !view.file) return "";
    try {
      const data = view.getViewData();
      if (data) return data;
    } catch {
      /* 某些视图不支持 */
    }
    try {
      return await this.app.vault.cachedRead(view.file);
    } catch {
      return "";
    }
  }

  private openPreview(generation: Generation, view: MarkdownView | null): void {
    const modal = new CardPreviewModal(this.app, {
      markdown: generation.markdown,
      title: generation.card.title,
      baseName: generation.baseName,
      folderPath: generation.folderPath,
      folders: generation.folderOptions,
      basePath: generation.root,
      needsCreate: generation.needsCreate,
      renderWith: (title) => renderCardMarkdownV3({ ...generation.card, title }, generation.ctx),
      filenameFor: (title) => filenameFor({ title, type: generation.card.type }, this.settings.filenamePattern),
      onSave: async (payload: PreviewSavePayload) => {
        const result = await this.commitCard(generation, view, payload);
        if (result.ok && result.message) new Notice(result.message, 5000);
        return result.ok;
      },
      onRegenerate: async () => {
        const notice = new Notice("正在重新生成…", 0);
        try {
          const next = await this.buildGeneration(generation.ctx.selection, view, generation.format, (m) => notice.setMessage(m));
          return {
            markdown: next.markdown,
            title: next.card.title,
            baseName: next.baseName,
            folderPath: next.folderPath,
            needsCreate: next.needsCreate,
            renderWith: (title: string) => renderCardMarkdownV3({ ...next.card, title }, next.ctx),
            filenameFor: (title: string) => filenameFor({ title, type: next.card.type }, this.settings.filenamePattern),
          };
        } catch (e) {
          this.reportError(e, "重新生成失败");
          return null;
        } finally {
          notice.hide();
        }
      },
    });
    modal.open();
  }

  /* ------------------------------------------------------------------ */
  /* 落盘                                                                */
  /* ------------------------------------------------------------------ */

  private async commitCard(gen: Generation, view: MarkdownView | null, payload: PreviewSavePayload): Promise<SaveResult> {
    const folderPath = payload.folderPath ? safePath(payload.folderPath) : "";
    const baseName = sanitizeFilename(payload.baseName || gen.baseName);

    try {
      if (folderPath) await ensureFolder(this.app, folderPath);

      // 全库判重：文件名 / frontmatter title / aliases 任一命中都算同一概念
      const existing = getFileByName(this.app, folderPath, baseName) ?? findCardsByTitle(this.app, baseName)[0] ?? null;
      if (existing && this.settings.onDuplicate === "open") {
        await this.insertSourceLink(view, gen.ctx.selection, existing.basename);
        await openFileInWorkspace(this.app, existing);
        return { ok: true, message: `库中已有同名卡片「${existing.basename}」（${existing.path}），已打开` };
      }

      let file: TFile;
      let finalName = baseName;
      let backupName = "";
      if (existing && this.settings.onDuplicate === "overwrite") {
        const existingFolder = existing.path.includes("/") ? existing.path.slice(0, existing.path.lastIndexOf("/")) : "";
        backupName = await this.backupExisting(existing, existingFolder, existing.basename);
        // 在原路径重建，保住双链身份，不把卡搬到新目录
        file = await this.app.vault.create(existing.path, payload.markdown);
        finalName = existing.basename;
      } else if (existing) {
        // 加后缀时也要避开全库同名
        const unique = this.nextVaultSafeName(folderPath, baseName);
        file = await this.app.vault.create(unique.path, payload.markdown);
        finalName = unique.name;
      } else {
        const path = folderPath ? normalizePath(`${folderPath}/${baseName}.md`) : `${baseName}.md`;
        file = await this.app.vault.create(path, payload.markdown);
      }

      await this.insertSourceLink(view, gen.ctx.selection, finalName, gen.card.aliases);
      if (this.settings.openAfterCreate) await openFileInWorkspace(this.app, file);
      void this.syncDailyNoteForDate(gen.ctx.revisit);
      const backupHint = backupName ? `（旧卡已备份为「${backupName}」）` : "";
      return { ok: true, message: `✅ 已生成「${finalName}」→ ${folderPath || "库根目录"}${backupHint}` };
    } catch (e) {
      this.reportError(e, "保存卡片失败");
      return { ok: false };
    }
  }

  /** 同名加后缀时，同时避开目标目录与全库的重名 */
  private nextVaultSafeName(folderPath: string, baseName: string): { path: string; name: string } {
    const folderTaken = existingNamesInFolder(this.app, folderPath);
    const vaultKeys = new Set(this.app.vault.getMarkdownFiles().map((f) => titleKey(f.basename)));
    let name = baseName;
    for (let i = 2; i < 100; i++) {
      if (!folderTaken.has(name.toLowerCase()) && !vaultKeys.has(titleKey(name))) break;
      name = `${baseName}-${i}`;
    }
    const path = folderPath ? normalizePath(`${folderPath}/${name}.md`) : `${name}.md`;
    return { path, name };
  }

  private async backupExisting(existing: TFile, folderPath: string, baseName: string): Promise<string> {
    const now = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
    const taken = existingNamesInFolder(this.app, folderPath);
    const backupBase = nextAvailableName(`${baseName}（旧版 ${stamp}）`, taken);
    const target = folderPath ? normalizePath(`${folderPath}/${backupBase}.md`) : `${backupBase}.md`;
    await this.app.vault.rename(existing, target);
    return backupBase;
  }

  private async insertSourceLink(
    view: MarkdownView | null,
    selection: string,
    cardName: string,
    aliases: string[] = [],
  ): Promise<void> {
    if (!this.settings.linkBackToSource) return;
    if (!view?.file) return;
    const file = view.file;
    const names = [cardName, ...aliases];

    // 编辑视图：优先用当前选区，其次在编辑器内容里定位
    try {
      if (view.getMode() === "source" && view.editor) {
        const editor = view.editor;
        const current = editor.getSelection();
        if (current && current.trim() === selection.trim()) {
          const replaced = linkFirstKeyword(current, names, cardName);
          if (replaced) editor.replaceSelection(replaced);
          return;
        }
        const value = editor.getValue();
        const spot = findLinkableSpot(value, selection);
        if (spot) {
          const matched = value.slice(spot.index, spot.index + spot.length);
          const replaced = linkFirstKeyword(matched, names, cardName);
          if (replaced) {
            editor.replaceRange(replaced, editor.offsetToPos(spot.index), editor.offsetToPos(spot.index + spot.length));
          }
        }
        return;
      }
    } catch (e) {
      console.error("[概念卡生成器] 编辑视图插入双链失败", e);
      return;
    }

    // 阅读视图：没有编辑器，直接改文件（写回后会重新渲染）
    try {
      await this.app.vault.process(file, (data) => {
        const spot = findLinkableSpot(data, selection);
        if (!spot) return data;
        const matched = data.slice(spot.index, spot.index + spot.length);
        const replaced = linkFirstKeyword(matched, names, cardName);
        if (!replaced) return data;
        return data.slice(0, spot.index) + replaced + data.slice(spot.index + spot.length);
      });
    } catch (e) {
      console.error("[概念卡生成器] 阅读视图插入双链失败", e);
    }
  }

  /* ------------------------------------------------------------------ */
  /* 升级与生命周期                                                       */
  /* ------------------------------------------------------------------ */

  private activeCardFile(): TFile | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    return view?.file ?? null;
  }

  private upgradeActive(useAI: boolean): void {
    const file = this.activeCardFile();
    if (!file) {
      new Notice("请先打开一张概念卡");
      return;
    }
    void this.upgradeCard(file, useAI);
  }

  private async upgradeCard(file: TFile, useAI: boolean): Promise<void> {
    const front = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!front || front.card_format !== "lite") {
      new Notice("这张卡不是精简版（或不是本插件生成的卡片），无需升级");
      return;
    }
    const type = String(front.type ?? "概念");
    const stage = toStage(front.stage);
    const missing = upgradeSections();
    const lines = missing.map((id) => `新增：${headingFor(id, type)}`);
    new ConfirmModal(
      this.app,
      { title: useAI ? "补全为完整版（AI）" : "升级为完整版（空模板）", lines, confirmText: "开始" },
      async () => {
        const notice = new Notice(useAI ? "正在补全完整版小节…" : "正在插入空小节…", 0);
        try {
          const text = await this.app.vault.read(file);
          let additions: SectionAddition[] = [];
          if (useAI) {
            const root = resolveRootFolder(this.app, this.settings);
            const existingCards = collectExistingCardTitles(this.app, root, this.settings.maxExistingCards);
            additions = await generateMissingSections(
              this.settings,
              {
                existingMarkdown: text,
                type,
                language: this.settings.language,
                bilingual: this.settings.bilingual,
                existingCards,
              },
              (m) => notice.setMessage(m),
            );
          } else {
            additions = missing.map((id) => ({
              id,
              body: "> [!todo] 待补\n> 这一节等你补充；也可以再次右键「补全为完整版（AI）」让 AI 生成。",
            }));
          }

          const nextRevisit = revisitDate(this.reviewIntervalFor("成长"));
          let next = insertMissingSections(text, type, additions, "full");
          next = setFrontmatterField(next, "card_format", "full");
          next = setFrontmatterField(next, "stage", JSON.stringify(stageAfterUpgrade(stage)));
          next = setFrontmatterField(next, "updated", nowISO().iso);
          next = setFrontmatterField(next, "revisit", nextRevisit);
          await this.app.vault.modify(file, next);
          void this.syncDailyNoteForDate(nextRevisit);
          notice.hide();
          new Notice(useAI ? "✅ 已补全为完整版" : "✅ 已插入空小节，慢慢填");
        } catch (e) {
          notice.hide();
          this.reportError(e, "升级失败");
        }
      },
    ).open();
  }

  private markEvergreenActive(): void {
    const file = this.activeCardFile();
    if (!file) {
      new Notice("请先打开一张概念卡");
      return;
    }
    void this.markEvergreen(file);
  }

  async markEvergreen(file: TFile): Promise<void> {
    const front = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!front?.card_format) {
      new Notice("这不是本插件生成的概念卡");
      return;
    }
    const days = this.reviewIntervalFor("常青");
    const nextDate = revisitDate(days);
    try {
      const text = await this.app.vault.read(file);
      let next = setFrontmatterField(text, "stage", JSON.stringify("常青"));
      next = setFrontmatterField(next, "updated", nowISO().iso);
      next = setFrontmatterField(next, "revisit", nextDate);
      await this.app.vault.modify(file, next);
      new Notice(`✅ 已标记为常青，${days} 天后可复查`);
      this.refreshReviewStatus();
      void this.syncDailyReview(false);
      void this.syncDailyNoteForDate(nextDate);
    } catch (e) {
      this.reportError(e, "标记失败");
    }
  }

  private async scheduleReview(file: TFile, days: number): Promise<void> {
    const nextDate = revisitDate(days);
    try {
      const text = await this.app.vault.read(file);
      const next = setFrontmatterField(text, "revisit", nextDate);
      await this.app.vault.modify(file, next);
      new Notice(`已安排 ${days} 天后复查（${nextDate}）`);
      this.refreshReviewStatus();
      void this.syncDailyNoteForDate(nextDate);
    } catch (e) {
      this.reportError(e, "安排复查失败");
    }
  }

  /* ------------------------------------------------------------------ */
  /* 复查与阶段建议                                                       */
  /* ------------------------------------------------------------------ */

  reviewIntervalFor(stage: CardStage): number {
    const days = this.settings.reviewIntervals?.[stage];
    return Number.isFinite(days) && days > 0 ? days : 14;
  }

  getReviewCards(): ReviewCard[] {
    return findReviewCards(this.app, todayKey());
  }

  getDueCards(): ReviewCard[] {
    return findDueCards(this.app, todayKey());
  }

  openCard(file: TFile): void {
    void openFileInWorkspace(this.app, file);
  }

  private refreshReviewStatus(showNotice = false): void {
    const cards = this.getReviewCards();
    const due = cards.filter((c) => c.due).length;
    this.statusEl?.setText(cards.length ? `复查 ${due}/${cards.length}` : "");
    this.statusEl?.setAttribute("aria-label", "点击打开概念卡复查面板");
    if (showNotice && due && this.settings.reviewReminder) {
      new Notice(`有 ${due} 张概念卡到期复查。命令：打开概念卡复查面板`, 8000);
    }
  }

  private async syncDailyReview(manual: boolean): Promise<void> {
    if (!manual && !this.settings.dailyNoteReminder) return;
    const due = this.getDueCards();
    if (!manual && !due.length) return;
    try {
      const result = await writeDueCardsToDailyNote(this.app, this.settings, due);
      if (result.missing) {
        if (manual) {
          new Notice(`未找到今日日记：${result.path}。请先创建日记，或在设置 → 复查与阶段里调整目录/格式。`, 8000);
        }
        return;
      }
      if (manual) new Notice(`已写入今日复查（${due.length} 张）：${result.path}`);
    } catch (e) {
      if (manual) this.reportError(e, "写入日记失败");
    }
  }

  /** 写入某一天的日记提醒（预告）；那一天没有到期卡片则跳过 */
  private async syncDailyNoteForDate(dateKey: string, notify = false): Promise<void> {
    if (!this.settings.dailyNoteReminder) return;
    const cards = this.getReviewCards().filter((c) => c.revisit === dateKey);
    if (!cards.length) return;
    try {
      const result = await writeCardsToDate(this.app, this.settings, dateKey, cards, true);
      if (notify && result.ok) new Notice(`已写入 ${dateKey} 的日记预告：${result.path}`);
    } catch (e) {
      if (notify) this.reportError(e, "写入日记失败");
    }
  }

  private async writeActiveDueDaily(): Promise<void> {
    const file = this.activeCardFile();
    if (!file) {
      new Notice("请先打开一张概念卡");
      return;
    }
    const front = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const revisit = String(front?.revisit ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(revisit)) {
      new Notice("这张卡还没有安排复查日期");
      return;
    }
    await this.syncDailyNoteForDate(revisit, true);
  }

  /** 启动时预写未来 N 天内有复查任务的日记（预告） */
  private async syncUpcomingDailyNotes(): Promise<void> {
    if (!this.settings.dailyNoteReminder) return;
    const horizon = Number(this.settings.dailyNoteHorizonDays);
    if (!Number.isFinite(horizon) || horizon <= 0) return;
    const today = todayKey();
    const end = addDaysKey(today, horizon);
    const dates = new Set(
      this.getReviewCards()
        .filter((c) => c.revisit >= today && c.revisit <= end)
        .map((c) => c.revisit),
    );
    for (const dateKey of dates) await this.syncDailyNoteForDate(dateKey);
  }

  private async openReviewView(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(REVIEW_VIEW_TYPE);
    if (leaves.length) {
      await this.app.workspace.revealLeaf(leaves[0]);
      const view = leaves[0].view;
      if (view instanceof ConceptReviewView) view.render();
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: REVIEW_VIEW_TYPE, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  public async markReviewed(file: TFile): Promise<void> {
    const stage = stageOf(this.app, file);
    const days = this.reviewIntervalFor(stage);
    const nextDate = revisitDate(days);
    try {
      const text = await this.app.vault.read(file);
      const next = setFrontmatterField(text, "revisit", nextDate);
      await this.app.vault.modify(file, next);
      new Notice(`已复查「${file.basename}」，${days} 天后（${nextDate}）再看`);
      this.refreshReviewStatus();
      void this.syncDailyNoteForDate(nextDate);
      void this.syncDailyReview(false);
    } catch (e) {
      this.reportError(e, "记录复查失败");
    }
  }

  private async maybeSuggestStage(file: TFile | null): Promise<void> {
    if (!this.settings.stageSuggestions || !file || file.extension !== "md") return;
    const front = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!front?.card_format) return;
    const stage = stageOf(this.app, file);
    const format: CardFormat = front.card_format === "full" ? "full" : "lite";
    const revisit = String(front.revisit ?? "");
    let text = "";
    try {
      text = await this.app.vault.cachedRead(file);
    } catch {
      return;
    }
    const suggestion = suggestStageFor(text, stage, format, revisit, todayKey());
    if (!suggestion) return;
    const key = `${file.path}::${stage}::${suggestion}`;
    if (this.suggested.has(key)) return;
    this.suggested.add(key);
    new Notice(`「${file.basename}」的留白已填写，可升级为「${suggestion}」。命令：概念卡：按建议更新阶段`, 8000);
  }

  private async applyStageSuggestionActive(): Promise<void> {
    const file = this.activeCardFile();
    if (!file) {
      new Notice("请先打开一张概念卡");
      return;
    }
    const front = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!front?.card_format) {
      new Notice("这不是本插件生成的概念卡");
      return;
    }
    const stage = stageOf(this.app, file);
    const format: CardFormat = front.card_format === "full" ? "full" : "lite";
    const revisit = String(front.revisit ?? "");
    try {
      const text = await this.app.vault.read(file);
      const suggestion = suggestStageFor(text, stage, format, revisit, todayKey());
      if (!suggestion) {
        new Notice("当前没有可执行的阶段建议（留白未填够，或还没到复查日）");
        return;
      }
      const nextDate = revisitDate(this.reviewIntervalFor(suggestion));
      let next = setFrontmatterField(text, "stage", JSON.stringify(suggestion));
      next = setFrontmatterField(next, "updated", nowISO().iso);
      next = setFrontmatterField(next, "revisit", nextDate);
      await this.app.vault.modify(file, next);
      new Notice(`✅ 已按建议升级为「${suggestion}」`);
      this.refreshReviewStatus();
      void this.syncDailyNoteForDate(nextDate);
    } catch (e) {
      this.reportError(e, "更新阶段失败");
    }
  }

  private reportError(e: unknown, context: string): void {
    const message = e instanceof AiError ? e.message : e instanceof Error ? e.message : String(e);
    new Notice(`${context}：${message}`, 10000);
    console.error(`[概念卡生成器] ${context}`, e);
  }
}
