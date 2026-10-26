/**
 * 知识库读写：目录扫描、目标目录解析、已有卡片索引、文件创建。
 */
import { App, TFile, TFolder, normalizePath } from "obsidian";
import type { ConceptCardSettings } from "./types";
import { detectRootFolder, nextAvailableName, titleKey } from "./core";

/** 全部文件夹路径（不含库根） */
export function allFolderPaths(app: App): string[] {
  const out: string[] = [];
  for (const f of app.vault.getAllLoadedFiles()) {
    if (f instanceof TFolder && f.path && f.path !== "/") out.push(f.path);
  }
  return out;
}

/** 去掉首尾斜杠，并丢弃 "." / ".." 之类的路径片段，避免越出库根 */
export function safePath(p: string): string {
  const clean = normalizePath(String(p ?? "")).replace(/^\/+|\/+$/g, "");
  return clean
    .split("/")
    .filter((seg) => seg && seg !== "." && seg !== ".." && seg !== "\\")
    .join("/");
}

/** 设置里写死的根目录优先，否则从现有目录里猜 */
export function resolveRootFolder(app: App, settings: ConceptCardSettings): string {
  if (settings.useVaultRoot) return ""; // 显式要求放在库根目录，跳过自动检测
  const configured = safePath(settings.cardRootFolder || "");
  if (configured) return configured;
  return detectRootFolder(allFolderPaths(app));
}

/** 根目录下的第一层子文件夹名 */
export function listSubfolders(app: App, root: string): string[] {
  const target = root ? app.vault.getAbstractFileByPath(normalizePath(root)) : app.vault.getRoot();
  if (!(target instanceof TFolder)) return [];
  return target.children
    .filter((c): c is TFolder => c instanceof TFolder)
    .map((c) => c.name)
    .filter((name) => !name.startsWith("."))
    .sort((a, b) => a.localeCompare(b, "zh"));
}

/** 已有概念卡标题，给模型做 [[双链]] 用 */
export function collectExistingCardTitles(app: App, root: string, limit: number): string[] {
  const prefix = root ? `${normalizePath(root)}/` : "";
  const titles: string[] = [];
  const seen = new Set<string>();
  for (const file of app.vault.getMarkdownFiles()) {
    if (prefix && !file.path.startsWith(prefix)) continue;
    const base = file.basename;
    if (seen.has(base)) continue;
    seen.add(base);
    titles.push(base);
    if (titles.length >= limit) break;
  }
  return titles;
}

/** 已有标签，给模型复用，减少标签碎片化 */
export function collectExistingTags(app: App, root: string, limit = 80): string[] {
  const prefix = root ? `${safePath(root)}/` : "";
  const tags = new Set<string>();
  for (const file of app.vault.getMarkdownFiles()) {
    if (prefix && !file.path.startsWith(prefix)) continue;
    const front = app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined;
    if (!front) continue;
    const raw = front.tags;
    const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[,，]/) : [];
    for (const item of list) {
      const tag = String(item).replace(/^#/, "").trim();
      if (!tag) continue;
      tags.add(tag);
      if (tags.size >= limit) return [...tags];
    }
  }
  return [...tags];
}

export function getFolder(app: App, path: string): TFolder | null {
  if (!path) return app.vault.getRoot();
  const item = app.vault.getAbstractFileByPath(normalizePath(path));
  return item instanceof TFolder ? item : null;
}

/** 逐级创建目录（已存在则跳过；并发下重复创建也不报错） */
export async function ensureFolder(app: App, path: string): Promise<void> {
  const clean = safePath(path);
  if (!clean) return;
  const segs = clean.split("/");
  let current = "";
  for (const seg of segs) {
    current = current ? `${current}/${seg}` : seg;
    const existing = app.vault.getAbstractFileByPath(current);
    if (existing instanceof TFolder) continue;
    if (existing instanceof TFile) throw new Error(`创建目录失败：${current} 已是一个文件`);
    try {
      await app.vault.createFolder(current);
    } catch (e) {
      const again = app.vault.getAbstractFileByPath(current);
      if (!(again instanceof TFolder)) throw e;
    }
  }
}

export function folderExists(app: App, path: string): boolean {
  if (!path) return true;
  return app.vault.getAbstractFileByPath(safePath(path)) instanceof TFolder;
}

/** 该目录下已有的文件名（小写，用于判重） */
export function existingNamesInFolder(app: App, folderPath: string): Set<string> {
  const folder = getFolder(app, folderPath);
  const names = new Set<string>();
  if (!folder) return names;
  for (const child of folder.children) {
    if (child instanceof TFile && child.extension === "md") names.add(child.basename.toLowerCase());
  }
  return names;
}

export function uniqueCardPath(app: App, folderPath: string, baseName: string): { path: string; name: string } {
  const taken = existingNamesInFolder(app, folderPath);
  const name = nextAvailableName(baseName, taken);
  const path = folderPath ? `${normalizePath(folderPath)}/${name}.md` : `${name}.md`;
  return { path, name };
}

/** 按文件名找卡片；大小写不敏感，避免在大小写不敏感的文件系统上重复创建 */
export function getFileByName(app: App, folderPath: string, name: string): TFile | null {
  const folder = getFolder(app, folderPath);
  if (!folder) return null;
  const target = name.toLowerCase();
  for (const child of folder.children) {
    if (child instanceof TFile && child.extension === "md" && child.basename.toLowerCase() === target) {
      return child;
    }
  }
  return null;
}

/**
 * 全库按「文件名 / frontmatter title / aliases」找同名卡片。
 * 这是判重的正确范围：Obsidian 的双链是按全库解析的，别的目录已有同名卡同样会歧义。
 */
export function findCardsByTitle(app: App, title: string): TFile[] {
  const key = titleKey(title);
  if (!key) return [];
  const hits: TFile[] = [];
  for (const file of app.vault.getMarkdownFiles()) {
    if (titleKey(file.basename) === key) {
      hits.push(file);
      continue;
    }
    const front = app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined;
    if (!front) continue;
    const fmTitle = typeof front.title === "string" ? front.title : "";
    if (fmTitle && titleKey(fmTitle) === key) {
      hits.push(file);
      continue;
    }
    const rawAliases = front.aliases ?? front.alias;
    const aliases = Array.isArray(rawAliases) ? rawAliases : typeof rawAliases === "string" ? [rawAliases] : [];
    if (aliases.some((a) => titleKey(String(a)) === key)) hits.push(file);
  }
  return hits;
}

/** 在新标签页打开文件，避免打断正在读的笔记 */
export async function openFileInWorkspace(app: App, file: TFile, newTab = true): Promise<void> {
  const leaf = newTab ? app.workspace.getLeaf("tab") : app.workspace.getLeaf(false);
  await leaf.openFile(file);
}
