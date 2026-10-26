/**
 * 集成冒烟测试：用 mock 的 obsidian 模块加载真实 main.js。
 * 覆盖：两档生成、右键菜单、归档、预览、同名策略、升级、生命周期。
 *
 * 运行：node test/integration.cjs
 */
const fs = require("fs");
const path = require("path");
const Module = require("module");

/* ------------------------------------------------------------------ */
/* 极简 DOM                                                            */
/* ------------------------------------------------------------------ */
function fakeEl(tag = "div") {
  const el = {
    tagName: String(tag).toUpperCase(),
    children: [],
    style: {},
    dataset: {},
    textContent: "",
    innerHTML: "",
    value: "",
    spellcheck: true,
    placeholder: "",
    rows: 0,
    className: "",
    classList: { add() {}, remove() {} },
    createEl(t, opts = {}) {
      const child = fakeEl(t);
      if (opts && opts.cls) child.className = opts.cls;
      if (opts && opts.text) child.textContent = opts.text;
      if (opts && opts.type) child.type = opts.type;
      el.children.push(child);
      return child;
    },
    createDiv(opts = {}) {
      return el.createEl("div", opts);
    },
    createSpan(opts = {}) {
      return el.createEl("span", opts);
    },
    addClass() {},
    removeClass() {},
    empty() {
      el.children = [];
    },
    remove() {},
    appendChild(child) {
      el.children.push(child);
      return child;
    },
    addEventListener() {},
    setAttribute() {},
    getAttribute() {
      return null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    contains() {
      return true;
    },
    focus() {},
    blur() {},
    setSelectionRange() {},
    setText(t) {
      el.textContent = t;
    },
  };
  return el;
}

global.createDiv = () => fakeEl();
global.createEl = (t) => fakeEl(t);
global.CSS = { escape: (s) => String(s) };
global.window = {
  setTimeout: (fn) => setTimeout(fn, 0),
  clearTimeout: (id) => clearTimeout(id),
  getSelection: () => global.__selection,
  document: null,
};
global.document = {
  addEventListener() {},
  removeEventListener() {},
  createElement: (t) => fakeEl(t),
};
global.window.document = global.document;

/* ------------------------------------------------------------------ */
/* mock obsidian                                                       */
/* ------------------------------------------------------------------ */
const state = {
  notices: [],
  menus: [],
  commands: {},
  ribbons: [],
  menuHandlers: {},
  domHandlers: {},
  requestResponder: async () => ({ status: 500, text: "not configured" }),
  openedFiles: [],
  modal: null,
  settingsTab: null,
};

class TFile {
  constructor(p) {
    this.path = p;
    this.name = p.split("/").pop();
    this.basename = this.name.replace(/\.md$/, "");
    this.extension = "md";
  }
}

class TFolder {
  constructor(p) {
    this.path = p;
    this.name = p === "/" ? "" : p.split("/").pop();
    this.children = [];
  }
}

function normalizePath(p) {
  let s = String(p).replace(/\\/g, "/");
  s = s.replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "");
  return s;
}

function parseFrontmatter(md) {
  const m = String(md).match(/^---\n([\s\S]*?)\n---\n/);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split("\n")) {
    const mm = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    fm[mm[1]] = v;
  }
  return fm;
}

class Notice {
  constructor(message, duration) {
    this.message = message;
    this.duration = duration;
    this.hidden = false;
    state.notices.push(this);
  }
  setMessage(m) {
    this.message = m;
    return this;
  }
  hide() {
    this.hidden = true;
    return this;
  }
}

class MenuItem {
  constructor() {
    this.title = "";
    this.icon = "";
    this.callback = null;
  }
  setTitle(t) {
    this.title = t;
    return this;
  }
  setIcon(i) {
    this.icon = i;
    return this;
  }
  onClick(cb) {
    this.callback = cb;
    return this;
  }
}

class Menu {
  constructor() {
    this.items = [];
    state.menus.push(this);
  }
  addItem(cb) {
    const item = new MenuItem();
    cb(item);
    this.items.push(item);
    return this;
  }
  addSeparator() {
    this.items.push({ separator: true });
    return this;
  }
  showAtMouseEvent(evt) {
    this.shownAt = { x: evt.clientX, y: evt.clientY };
    return this;
  }
}

class Modal {
  constructor(app) {
    this.app = app;
    this.scope = { register() {} };
    this.contentEl = fakeEl();
    this.modalEl = fakeEl();
    this.titleEl = fakeEl();
    state.modal = this;
  }
  open() {
    this.onOpen();
  }
  close() {
    this.onClose();
  }
}

class Plugin {
  constructor(app, manifest) {
    this.app = app;
    this.manifest = manifest || { id: "concept-card" };
    this._data = {};
  }
  registerEvent() {}
  registerView() {}
  addStatusBarItem() {
    return fakeEl();
  }
  registerDomEvent(el, type, cb, options) {
    state.domHandlers[type] = cb;
    state.domHandlers[`${type}:capture`] = options && options.capture;
  }
  addCommand(cmd) {
    state.commands[cmd.id] = cmd;
    return cmd;
  }
  addRibbonIcon(icon, title, cb) {
    state.ribbons.push({ icon, title, cb });
    return fakeEl();
  }
  addSettingTab(tab) {
    state.settingsTab = tab;
  }
  async loadData() {
    return this._data;
  }
  async saveData(d) {
    this._data = d;
  }
}

class PluginSettingTab {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = fakeEl();
  }
}

function component() {
  const c = {
    inputEl: fakeEl("input"),
    selectEl: fakeEl("select"),
    setPlaceholder() {
      return c;
    },
    setValue() {
      return c;
    },
    onChange() {
      return c;
    },
    addOption() {
      return c;
    },
    setLimits() {
      return c;
    },
    setDynamicTooltip() {
      return c;
    },
    setButtonText() {
      return c;
    },
    setIcon() {
      return c;
    },
    setCta() {
      return c;
    },
    setDisabled() {
      return c;
    },
    onClick() {
      return c;
    },
  };
  return c;
}

class Setting {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.infoEl = fakeEl();
    this.controlEl = fakeEl();
  }
  setName() {
    return this;
  }
  setDesc() {
    return this;
  }
  setHeading() {
    return this;
  }
  addText(cb) {
    cb(component());
    return this;
  }
  addTextArea(cb) {
    cb(component());
    return this;
  }
  addDropdown(cb) {
    cb(component());
    return this;
  }
  addToggle(cb) {
    cb(component());
    return this;
  }
  addSlider(cb) {
    cb(component());
    return this;
  }
  addButton(cb) {
    cb(component());
    return this;
  }
}

const obsidianMock = {
  Plugin,
  PluginSettingTab,
  Setting,
  Notice,
  Menu,
  MenuItem,
  Modal,
  ItemView: class ItemView {
    constructor(leaf) {
      this.leaf = leaf;
      this.containerEl = fakeEl();
      this.contentEl = fakeEl();
    }
  },
  TFile,
  TFolder,
  MarkdownView: class MarkdownView {},
  normalizePath,
  requestUrl: async (param) => state.requestResponder(param),
  setIcon() {},
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "obsidian") return obsidianMock;
  return originalLoad.call(this, request, parent, isMain);
};

/* ------------------------------------------------------------------ */
/* fake app                                                            */
/* ------------------------------------------------------------------ */
function makeApp(opts = {}) {
  const folderPaths = new Set(opts.folders || []);
  const files = new Map();
  for (const [p, c] of Object.entries(opts.files || {})) files.set(normalizePath(p), c);

  const rebuild = () => {
    const root = new TFolder("/");
    const map = new Map([["", root]]);
    const ensure = (p) => {
      const clean = normalizePath(p);
      if (map.has(clean)) return map.get(clean);
      const segs = clean.split("/").filter(Boolean);
      let cur = "";
      let node = root;
      for (const seg of segs) {
        cur = cur ? `${cur}/${seg}` : seg;
        let next = map.get(cur);
        if (!next) {
          next = new TFolder(cur);
          map.set(cur, next);
          node.children.push(next);
        }
        node = next;
      }
      return node;
    };
    for (const p of folderPaths) ensure(p);
    for (const [p] of files) {
      const clean = normalizePath(p);
      const parent = clean.includes("/") ? clean.slice(0, clean.lastIndexOf("/")) : "";
      ensure(parent).children.push(new TFile(clean));
    }
    return [...map.values()];
  };

  const vault = {
    getRoot: () => rebuild()[0],
    getAllLoadedFiles: () => rebuild(),
    getMarkdownFiles: () => [...files.keys()].map((p) => new TFile(p)),
    getAbstractFileByPath: (p) => {
      const clean = normalizePath(p);
      const all = rebuild();
      const folder = all.find((f) => f instanceof TFolder && f.path === clean);
      if (folder) return folder;
      return files.has(clean) ? new TFile(clean) : null;
    },
    createFolder: async (p) => {
      const clean = normalizePath(p);
      if (folderPaths.has(clean)) throw new Error(`Folder already exists: ${clean}`);
      folderPaths.add(clean);
    },
    create: async (p, content) => {
      const clean = normalizePath(p);
      if (files.has(clean)) throw new Error(`File already exists: ${clean}`);
      files.set(clean, content);
      return new TFile(clean);
    },
    modify: async (file, content) => {
      files.set(file.path, content);
    },
    rename: async (file, newPath) => {
      const clean = normalizePath(newPath);
      const content = files.get(file.path);
      if (content === undefined) throw new Error(`File not found: ${file.path}`);
      files.delete(file.path);
      files.set(clean, content);
      return new TFile(clean);
    },
    process: async (file, fn) => {
      const cur = files.get(file.path) ?? "";
      const next = await fn(cur);
      if (next !== cur) files.set(file.path, next);
      return next;
    },
    read: async (file) => files.get(file.path) || "",
    cachedRead: async (file) => files.get(file.path) || "",
  };

  return {
    app: {
      vault,
      metadataCache: {
        getFileCache: (file) => ({ frontmatter: parseFrontmatter(files.get(file.path) || "") }),
      },
      workspace: {
        on(name, cb) {
          state.menuHandlers[name] = cb;
          return () => {};
        },
        onLayoutReady(cb) {
          cb();
        },
        getLeavesOfType() {
          return [];
        },
        getRightLeaf() {
          return {
            setViewState: async () => {},
          };
        },
        revealLeaf() {},
        getActiveViewOfType(cls) {
          if (cls === obsidianMock.MarkdownView) return opts.view || null;
          return null;
        },
        getLeaf() {
          return {
            openFile: async (file) => {
              state.openedFiles.push(file.path);
            },
          };
        },
      },
    },
    files,
  };
}

function makeView({ path: p = "笔记/阅读笔记.md", text = "", selection = "", mode = "source" } = {}) {
  return {
    file: new TFile(normalizePath(p)),
    containerEl: {
      contains: () => true,
      ownerDocument: { defaultView: { getSelection: () => global.__selection } },
    },
    getViewData: () => text,
    getMode: () => mode,
    editor: {
      getSelection: () => selection,
      replaceSelection: () => {},
    },
  };
}

/* ------------------------------------------------------------------ */
/* 测试脚手架                                                          */
/* ------------------------------------------------------------------ */
let passed = 0;
const failures = [];
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures.push({ name, error: e });
    console.log(`  FAIL ${name}`);
    console.log(`       ${e && e.message}`);
  }
}
function expect(actual, expected, label) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label || "值"} 不匹配\n  实际: ${a}\n  期望: ${b}`);
}
function ok(value, label) {
  if (!value) throw new Error(label || "断言失败");
}
const tick = () => new Promise((r) => setTimeout(r, 80));
const countH2 = (md) => (md.match(/^## (?!出处)/gm) || []).length;

const CARD = {
  title: "认知失调",
  type: "理论",
  aliases: ["Cognitive Dissonance"],
  tags: ["心理学", "社会心理学"],
  summary: "信念与行为不一致时产生的不适。",
  quote: "人会为自己的选择找理由。",
  sections: {
    definition: { body: "第一层解释。\n\n第二层解释。", source: "text" },
    examples: { body: "花大价钱买课后更相信它有用。", source: "common" },
    boundaries: { body: "信息不足导致的误判不属于认知失调。", source: "common" },
    origins: { body: "费斯汀格 1957 年提出。", source: "common" },
    confusions: { body: "与自我辩解不同：前者是状态，后者是策略。", source: "common" },
    perspectives: { body: "支持者看重解释力，批评者认为难以证伪。", source: "inference" },
    connections: { body: "与 [[态度改变]] 属于因果关系。", source: "common" },
  },
  selftest: ["买课后的态度变化属于什么？", "什么情况不算认知失调？"],
  uncertainties: [],
  confidence: "high",
};

const UPGRADE = {
  sections: {
    origins: { body: "AI 补的沿革", source: "common" },
    perspectives: { body: "AI 补的争议", source: "inference" },
    connections: { body: "AI 补的连接", source: "common" },
  },
};

function aiOk(cardJson = CARD) {
  state.requestResponder = async (param) => {
    let body = {};
    try {
      body = JSON.parse(param.body || "{}");
    } catch {
      /* ignore */
    }
    const system = body.messages?.[0]?.content ?? "";
    if (system.includes("分类助手")) {
      return { status: 200, text: JSON.stringify({ choices: [{ message: { content: JSON.stringify({ folder: "心理学" }) } }] }) };
    }
    const payload = system.includes("补全为完整版") ? UPGRADE : cardJson;
    return { status: 200, text: JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }) };
  };
}

async function loadPlugin(opts) {
  const { app, files } = makeApp(opts);
  state.notices = [];
  state.menus = [];
  state.commands = {};
  state.ribbons = [];
  state.menuHandlers = {};
  state.domHandlers = {};
  state.openedFiles = [];
  state.modal = null;
  state.settingsTab = null;

  const mod = require("../main.js");
  const PluginClass = mod.default || mod;
  const plugin = new PluginClass(app, { id: "concept-card", name: "概念卡生成器" });
  await plugin.onload();
  plugin.settings.apiKey = plugin.settings.apiKey || "test-key";
  plugin.settings.provider = "custom";
  return { plugin, app, files };
}

/* ------------------------------------------------------------------ */
/* 用例                                                                */
/* ------------------------------------------------------------------ */
(async () => {
  await test("插件加载并注册两档命令、右键处理器、设置页", async () => {
    const { plugin } = await loadPlugin({ folders: ["概念卡"], view: makeView() });
    ok(typeof plugin.onload === "function", "应有 onload");
    ok(state.commands["generate-lite"], "应注册精简版命令");
    ok(state.commands["generate-full"], "应注册完整版命令");
    ok(state.commands["upgrade-card-ai"], "应注册升级命令");
    ok(state.commands["apply-stage-suggestion"], "应注册阶段建议命令");
    ok(state.commands["write-daily-review"], "应注册写入今日日记命令");
    ok(state.commands["write-daily-due"], "应注册写入复查日日记命令");
    ok(state.commands["mark-evergreen"], "应注册常青命令");
    ok(state.settingsTab, "应有设置页");
    ok(state.menuHandlers["editor-menu"], "应监听 editor-menu");
    ok(state.menuHandlers["file-menu"], "应监听 file-menu");
    ok(state.domHandlers["contextmenu"], "应监听阅读视图右键");
  });

  await test("编辑视图选区右键出现「精简 / 完整」两项", async () => {
    const view = makeView({ selection: "认知失调" });
    await loadPlugin({ folders: ["概念卡"], view });
    const menu = new Menu();
    state.menuHandlers["editor-menu"](menu, { getSelection: () => "认知失调" }, view);
    expect(menu.items.length, 2);
    expect(menu.items[0].title, "生成概念卡（精简）");
    expect(menu.items[1].title, "生成概念卡（完整）");
  });

  await test("阅读视图右键出现两档生成 + 复制", async () => {
    global.__selection = {
      isCollapsed: false,
      toString: () => "认知失调",
      rangeCount: 1,
      getRangeAt: () => ({ commonAncestorContainer: {} }),
    };
    const previewEl = fakeEl();
    const target = fakeEl();
    target.closest = (sel) => (sel === ".markdown-preview-view" ? previewEl : null);
    let prevented = false;
    const evt = { target, clientX: 10, clientY: 20, preventDefault: () => (prevented = true), stopPropagation: () => {} };

    await loadPlugin({ folders: ["概念卡"], view: makeView() });
    state.domHandlers["contextmenu"](evt);
    ok(prevented, "应阻止默认菜单");
    const menu = state.menus[state.menus.length - 1];
    const titles = menu.items.map((i) => i.title);
    ok(titles.includes("生成概念卡（精简）"), "应有精简版");
    ok(titles.includes("生成概念卡（完整）"), "应有完整版");
    ok(titles.includes("复制"), "应有复制");
  });

  await test("全库已有同名卡时直接打开，不再新建（跨目录判重）", async () => {
    aiOk({ ...CARD, title: "生涯适应力" });
    const view = makeView({ selection: "生涯适应力", text: "生涯适应力" });
    const { plugin, files } = await loadPlugin({
      folders: ["概念卡", "概念卡/理论卡片", "3-知识", "3-知识/理论"],
      files: { "3-知识/理论/生涯适应力.md": "已有卡片内容" },
      view,
    });
    plugin.settings.previewBeforeSave = false;
    state.commands["generate-full"].callback();
    await tick();
    expect([...files.keys()], ["3-知识/理论/生涯适应力.md"], "不应新建文件");
    ok(state.openedFiles.includes("3-知识/理论/生涯适应力.md"), "应打开已有卡片");
    ok(state.notices.some((n) => /库中已有/.test(n.message)), "应提示已有");
  });

  await test("文件名不同但 frontmatter title 相同时也能判重", async () => {
    aiOk({ ...CARD, title: "生涯适应力" });
    const view = makeView({ selection: "生涯适应力", text: "生涯适应力" });
    const existing = `---\ntitle: "生涯适应力"\ntype: "理论"\n---\n\n# 生涯适应力\n\n已有内容。\n`;
    const { plugin, files } = await loadPlugin({
      folders: ["概念卡", "概念卡/理论卡片", "3-知识", "3-知识/理论"],
      files: { "3-知识/理论/AD理论.md": existing },
      view,
    });
    plugin.settings.previewBeforeSave = false;
    state.commands["generate-full"].callback();
    await tick();
    expect([...files.keys()], ["3-知识/理论/AD理论.md"], "不应新建文件");
    ok(state.openedFiles.includes("3-知识/理论/AD理论.md"), "应打开 title 命中的卡片");
  });

  await test("生成完整版：10 小节 + 生命周期字段 + 归档", async () => {
    aiOk();
    const view = makeView({ text: "认知失调理论", selection: "认知失调" });
    const { plugin, files } = await loadPlugin({
      folders: ["知识库", "知识库/概念卡", "知识库/概念卡/人物卡片", "知识库/概念卡/理论卡片"],
      view,
    });
    plugin.settings.previewBeforeSave = false;
    state.commands["generate-full"].callback();
    await tick();

    const created = [...files.keys()];
    const target = "知识库/概念卡/理论卡片/认知失调.md";
    ok(created.includes(target), `应落在理论卡片，实际: ${created.join(",")}`);
    const content = files.get(target);
    expect(countH2(content), 10);
    ok(content.includes("card_format: full"), "应标完整版");
    ok(content.includes('stage: "幼苗"'), "应是幼苗");
    ok(content.includes("revisit: "), "应有复查日期");
    ok(content.includes('  - "[[阅读笔记]]"'), "sources 应写来源");
    ok(content.includes("## 我的看法"), "应有留白");
    ok(content.includes("> [!question] 待你补充"), "留白应是追问");
  });

  await test("生成精简版：7 小节 + card_format lite", async () => {
    aiOk();
    const view = makeView({ text: "认知失调", selection: "认知失调" });
    const { plugin, files } = await loadPlugin({ folders: ["概念卡", "概念卡/理论"], view });
    plugin.settings.previewBeforeSave = false;
    state.commands["generate-lite"].callback();
    await tick();
    const content = files.get("概念卡/理论/认知失调.md");
    ok(content, "应创建卡片");
    expect(countH2(content), 7);
    ok(content.includes("card_format: lite"), "应标精简版");
    ok(!content.includes("## 来龙去脉"), "精简版不应有沿革");
  });

  await test("显式映射把某类型固定到自定义子文件夹", async () => {
    aiOk();
    const view = makeView({ selection: "认知失调" });
    const { plugin, files } = await loadPlugin({ folders: ["概念卡", "概念卡/理论"], view });
    plugin.settings.previewBeforeSave = false;
    plugin.settings.subfolderMap["理论"] = "自定义/理论卡";
    state.commands["generate-full"].callback();
    await tick();
    ok([...files.keys()].includes("概念卡/自定义/理论卡/认知失调.md"), `应按映射归档，实际: ${[...files.keys()].join(",")}`);
  });

  await test("库根目录 + 自动匹配：概念卡进入根下「3.基本概念」", async () => {
    aiOk({ ...CARD, type: "概念" });
    const view = makeView({ selection: "认知失调" });
    const { plugin, files } = await loadPlugin({ folders: ["1..书籍、文献", "2.学者、组织", "3.基本概念"], view });
    plugin.settings.previewBeforeSave = false;
    plugin.settings.useVaultRoot = true;
    state.commands["generate-full"].callback();
    await tick();
    ok(
      [...files.keys()].includes("3.基本概念/认知失调.md"),
      `应进入 3.基本概念，实际: ${[...files.keys()].join(",")}`,
    );
  });

  await test("库根目录 + 关闭自动匹配：卡片直接放库根", async () => {
    aiOk({ ...CARD, type: "概念" });
    const view = makeView({ selection: "认知失调" });
    const { plugin, files } = await loadPlugin({ folders: ["1..书籍、文献", "3.基本概念"], view });
    plugin.settings.previewBeforeSave = false;
    plugin.settings.useVaultRoot = true;
    plugin.settings.autoMatchSubfolders = false;
    state.commands["generate-full"].callback();
    await tick();
    ok([...files.keys()].includes("认知失调.md"), `应落在库根，实际: ${[...files.keys()].join(",")}`);
  });

  await test("库根目录 + 显式类型目录：仍按映射进子文件夹", async () => {
    aiOk({ ...CARD, type: "概念" });
    const view = makeView({ selection: "认知失调" });
    const { plugin, files } = await loadPlugin({ folders: ["3.基本概念", "3.基本概念/核心概念"], view });
    plugin.settings.previewBeforeSave = false;
    plugin.settings.useVaultRoot = true;
    plugin.settings.subfolderMap["概念"] = "3.基本概念/核心概念";
    state.commands["generate-full"].callback();
    await tick();
    ok(
      [...files.keys()].includes("3.基本概念/核心概念/认知失调.md"),
      `应按映射归档，实际: ${[...files.keys()].join(",")}`,
    );
  });

  await test("指定目录后由 AI 选择下一级子文件夹", async () => {
    aiOk();
    const view = makeView({ selection: "认知失调" });
    const { plugin, files } = await loadPlugin({
      folders: ["3.基本概念", "3.基本概念/心理学", "3.基本概念/社会学"],
      view,
    });
    plugin.settings.previewBeforeSave = false;
    plugin.settings.subfolderMap["理论"] = "3.基本概念";
    state.commands["generate-full"].callback();
    await tick();
    ok(
      [...files.keys()].includes("3.基本概念/心理学/认知失调.md"),
      `应进入 AI 选择的子目录，实际: ${[...files.keys()].join(",")}`,
    );
  });

  await test("把复查写入下次复查日的日记（预告，含新建）", async () => {
    const card = `---\ntitle: "A"\ncard_format: lite\nstage: "幼苗"\nrevisit: 2026-11-01\n---\n\n# A\n`;
    const view = makeView({ path: "概念卡/A.md", text: card });
    const { files } = await loadPlugin({
      folders: ["概念卡"],
      files: { "概念卡/A.md": card },
      view,
    });
    state.commands["write-daily-due"].callback();
    await tick();
    ok([...files.keys()].includes("2026-11-01.md"), `应新建预告日记，实际: ${[...files.keys()].join(",")}`);
    ok(files.get("2026-11-01.md").includes("[[A]]"), "预告日记应包含卡片双链");
  });

  await test("预览弹窗保存后落盘", async () => {
    aiOk();
    const view = makeView({ selection: "认知失调" });
    const { plugin, files } = await loadPlugin({ folders: ["概念卡", "概念卡/理论"], view });
    plugin.settings.previewBeforeSave = true;
    state.commands["generate-full"].callback();
    await tick();
    ok(state.modal, "应弹出预览");
    expect(state.modal.title, "认知失调", "应带标题");
    await state.modal.save();
    ok([...files.keys()].includes("概念卡/理论/认知失调.md"), `应创建文件，实际: ${[...files.keys()].join(",")}`);
  });

  await test("同名覆盖先备份旧卡", async () => {
    aiOk();
    const view = makeView({ selection: "认知失调", text: "认知失调" });
    const { plugin, files } = await loadPlugin({
      folders: ["概念卡", "概念卡/理论"],
      files: { "概念卡/理论/认知失调.md": "用户旧内容" },
      view,
    });
    plugin.settings.previewBeforeSave = false;
    plugin.settings.onDuplicate = "overwrite";
    state.commands["generate-full"].callback();
    await tick();
    const keys = [...files.keys()];
    ok(keys.includes("概念卡/理论/认知失调.md"), "应写新卡");
    const backup = keys.find((k) => k.includes("旧版"));
    ok(backup, `应留备份，实际: ${keys.join(",")}`);
    expect(files.get(backup), "用户旧内容", "备份应保留旧内容");
  });

  await test("同名打开 / 大小写判重 / 加后缀", async () => {
    aiOk({ ...CARD, title: "Cognitive Dissonance" });
    let view = makeView({ selection: "Cognitive Dissonance", text: "Cognitive Dissonance" });
    let ctx = await loadPlugin({
      folders: ["概念卡", "概念卡/理论"],
      files: { "概念卡/理论/cognitive dissonance.md": "old" },
      view,
    });
    ctx.plugin.settings.previewBeforeSave = false;
    ctx.plugin.settings.onDuplicate = "open";
    state.commands["generate-full"].callback();
    await tick();
    expect([...ctx.files.keys()], ["概念卡/理论/cognitive dissonance.md"], "不应新增文件");
    ok(state.openedFiles.includes("概念卡/理论/cognitive dissonance.md"), "应打开已有卡");

    aiOk();
    view = makeView({ selection: "认知失调", text: "认知失调" });
    ctx = await loadPlugin({
      folders: ["概念卡", "概念卡/理论"],
      files: { "概念卡/理论/认知失调.md": "old" },
      view,
    });
    ctx.plugin.settings.previewBeforeSave = false;
    ctx.plugin.settings.onDuplicate = "suffix";
    state.commands["generate-full"].callback();
    await tick();
    ok([...ctx.files.keys()].includes("概念卡/理论/认知失调-2.md"), "应加 -2");
  });

  await test("API Key 无效时提示且不写文件", async () => {
    state.requestResponder = async () => ({ status: 401, text: '{"error":{"message":"invalid api key"}}' });
    const view = makeView({ selection: "认知失调" });
    const { plugin, files } = await loadPlugin({ folders: ["概念卡"], view });
    plugin.settings.previewBeforeSave = false;
    state.commands["generate-full"].callback();
    await tick();
    expect([...files.keys()], []);
    ok(state.notices.some((n) => /API Key 无效/.test(n.message)), "应提示 API Key 无效");
  });

  await test("AI 返回非 JSON 时重试一次", async () => {
    let calls = 0;
    state.requestResponder = async () => {
      calls++;
      if (calls === 1) return { status: 200, text: JSON.stringify({ choices: [{ message: { content: "不是 JSON" } }] }) };
      return { status: 200, text: JSON.stringify({ choices: [{ message: { content: JSON.stringify(CARD) } }] }) };
    };
    const view = makeView({ selection: "认知失调" });
    const { plugin, files } = await loadPlugin({ folders: ["概念卡"], view });
    plugin.settings.previewBeforeSave = false;
    state.commands["generate-full"].callback();
    await tick();
    ok(calls >= 2, "应重试");
    ok([...files.keys()].some((p) => p.includes("认知失调.md")), "最终应写入一张卡");
  });

  await test("设置页能渲染", async () => {
    const { plugin } = await loadPlugin({ folders: ["概念卡", "概念卡/人物"], view: makeView() });
    state.settingsTab.display();
    ok(state.settingsTab.containerEl.children.length > 0, "设置页应有内容");
    ok(plugin.settings.provider, "应有默认服务商");
  });

  await test("短选区回链替换为双链", async () => {
    aiOk();
    let replaced = null;
    const view = makeView({ selection: "认知失调", text: "认知失调理论" });
    view.editor.replaceSelection = (t) => {
      replaced = t;
    };
    const { plugin } = await loadPlugin({ folders: ["概念卡", "概念卡/理论"], view });
    plugin.settings.previewBeforeSave = false;
    plugin.settings.linkBackToSource = true;
    state.commands["generate-full"].callback();
    await tick();
    expect(replaced, "[[认知失调]]", "应替换成双链");
  });

  await test("选区多带修饰语时只链核心词", async () => {
    aiOk({ ...CARD, title: "认知失调" });
    global.__selection = {
      isCollapsed: false,
      toString: () => "费斯汀格提出的认知失调理论",
      rangeCount: 1,
      getRangeAt: () => ({ commonAncestorContainer: {} }),
    };
    const text = "费斯汀格提出的认知失调理论";
    const view = makeView({ path: "笔记/读书.md", text, selection: "费斯汀格提出的认知失调理论", mode: "preview" });
    const { plugin, files } = await loadPlugin({
      folders: ["概念卡", "概念卡/理论"],
      files: { "笔记/读书.md": text },
      view,
    });
    plugin.settings.previewBeforeSave = false;
    state.commands["generate-full"].callback();
    await tick();
    expect(files.get("笔记/读书.md"), "费斯汀格提出的[[认知失调]]理论");
  });

  await test("提炼不出关键词时不自动改原文", async () => {
    aiOk({ ...CARD, title: "认知失调" });
    global.__selection = {
      isCollapsed: false,
      toString: () => "某种模糊说法",
      rangeCount: 1,
      getRangeAt: () => ({ commonAncestorContainer: {} }),
    };
    const text = "某种模糊说法";
    const view = makeView({ path: "笔记/读书.md", text, selection: "某种模糊说法", mode: "preview" });
    const { plugin, files } = await loadPlugin({
      folders: ["概念卡", "概念卡/理论"],
      files: { "笔记/读书.md": text },
      view,
    });
    plugin.settings.previewBeforeSave = false;
    state.commands["generate-full"].callback();
    await tick();
    expect(files.get("笔记/读书.md"), text);
  });

  await test("长选区只链其中的关键词，保留前后文", async () => {
    aiOk();
    let replaced = null;
    const longSel = "费斯汀格在1957年提出认知失调理论，用来解释人们为什么会改变态度。".repeat(2);
    const view = makeView({ selection: longSel, text: longSel });
    view.editor.replaceSelection = (t) => {
      replaced = t;
    };
    const { plugin } = await loadPlugin({ folders: ["概念卡", "概念卡/理论"], view });
    plugin.settings.previewBeforeSave = false;
    plugin.settings.linkBackToSource = true;
    state.commands["generate-full"].callback();
    await tick();
    ok(replaced && replaced.includes("[[认知失调]]"), `应链关键词，实际: ${replaced}`);
    ok(replaced.includes("改变态度。"), "应保留后续原文");
    ok(!replaced.trimEnd().endsWith("[[认知失调]]"), "不应只在末尾补链接");
  });

  await test("精简版升级为完整版（AI）：补 3 节且保留用户内容", async () => {
    aiOk();
    const liteMd = `---
title: "认知失调"
type: "理论"
card_format: lite
stage: "幼苗"
revisit: 2026-11-01
sources:
  - "[[书A]]"
---

# 认知失调

> [!abstract] 一句话
> 信念与行为不一致时的不适。

## 定义与机制

旧定义内容 DEF

## 例子

旧例子。

## 边界与反例

旧边界。

## 易混淆辨析

旧辨析。

## 我的看法

> [!question] 待你补充
> - 我同意哪部分？

我的回答：我的私人笔记 XYZ

## 对我的意义与行动

> [!question] 待你补充
> - 能解释我经历过的哪个现象？

## 自测

1. 旧问题？

## 出处

- 来源：书A
`;
    const view = makeView({ path: "概念卡/理论/认知失调.md", text: liteMd });
    const { plugin, files } = await loadPlugin({
      folders: ["概念卡", "概念卡/理论"],
      files: { "概念卡/理论/认知失调.md": liteMd },
      view,
    });
    plugin.settings.previewBeforeSave = false;
    state.commands["upgrade-card-ai"].callback();
    await tick();
    ok(state.modal && state.modal.onConfirm, "应弹确认框");
    await state.modal.onConfirm();
    await tick();
    const content = files.get("概念卡/理论/认知失调.md");
    expect(countH2(content), 10);
    ok(content.includes("card_format: full"), "应标为完整版");
    ok(content.includes('stage: "成长"'), "应升级为成长");
    ok(content.includes("## 来龙去脉"), "应补沿革");
    ok(content.includes("AI 补的沿革"), "应写入 AI 内容");
    ok(content.includes("旧定义内容 DEF"), "旧内容必须保留");
    ok(content.includes("我的私人笔记 XYZ"), "用户内容必须保留");
    expect((content.match(/## 来龙去脉/g) || []).length, 1);
  });

  await test("空模板升级：插入待补小节，不调 AI", async () => {
    aiOk();
    let called = 0;
    const realResponder = state.requestResponder;
    state.requestResponder = async (p) => {
      called++;
      return realResponder(p);
    };
    const liteMd = `---
title: "心流"
type: "概念"
card_format: lite
stage: "幼苗"
revisit: 2026-11-01
sources:
  - "[[书B]]"
---

# 心流

## 定义与机制

旧内容。

## 我的看法

我的回答：自己的话。

## 出处

- 来源：书B
`;
    const view = makeView({ path: "概念卡/概念/心流.md", text: liteMd });
    const { plugin, files } = await loadPlugin({
      folders: ["概念卡", "概念卡/概念"],
      files: { "概念卡/概念/心流.md": liteMd },
      view,
    });
    plugin.settings.previewBeforeSave = false;
    state.commands["upgrade-card-blank"].callback();
    await tick();
    await state.modal.onConfirm();
    await tick();
    const content = files.get("概念卡/概念/心流.md");
    ok(content.includes("card_format: full"), "应标完整版");
    ok(content.includes("> [!todo] 待补"), "应插入待补");
    expect(called, 0, "空模板不应调用 AI");
  });

  await test("标记常青更新 stage 与复查日期", async () => {
    aiOk();
    const fullMd = `---
title: "认知失调"
type: "理论"
card_format: full
stage: "成长"
revisit: 2026-11-01
---

# 认知失调

## 定义与机制

内容。
`;
    const view = makeView({ path: "概念卡/理论/认知失调.md", text: fullMd });
    const { plugin, files } = await loadPlugin({
      folders: ["概念卡", "概念卡/理论"],
      files: { "概念卡/理论/认知失调.md": fullMd },
      view,
    });
    state.commands["mark-evergreen"].callback();
    await tick();
    const content = files.get("概念卡/理论/认知失调.md");
    ok(content.includes('stage: "常青"'), "应标记常青");
    ok(!content.includes("revisit: 2026-11-01"), "复查日期应更新");
  });

  await test("按建议更新阶段：留白填够后幼苗→成长", async () => {
    const md = `---
title: "心流"
type: "概念"
card_format: lite
stage: "幼苗"
revisit: 2026-11-01
---

# 心流

## 我的看法

> [!question] 待你补充
> - q

我的回答：我在写作时经常忘记时间，这大概就是心流。

## 对我的意义与行动

> [!question] 待你补充
> - q

我的回答：本周我准备在写作时关掉手机，观察一次心流是否出现。
`;
    const view = makeView({ path: "概念卡/概念/心流.md", text: md });
    const { plugin, files } = await loadPlugin({
      folders: ["概念卡", "概念卡/概念"],
      files: { "概念卡/概念/心流.md": md },
      view,
    });
    plugin.settings.previewBeforeSave = false;
    state.commands["apply-stage-suggestion"].callback();
    await tick();
    const content = files.get("概念卡/概念/心流.md");
    ok(content.includes('stage: "成长"'), "应升级为成长");
    ok(!content.includes("revisit: 2026-11-01"), "复查日期应顺延");
  });

  await test("复查列表包含未来排期，到期单独标记", async () => {
    const past = `---\ntitle: "A"\ncard_format: lite\nstage: "幼苗"\nrevisit: 2000-01-01\n---\n\n# A\n`;
    const future = `---\ntitle: "B"\ncard_format: full\nstage: "成长"\nrevisit: 2999-01-01\n---\n\n# B\n`;
    const { plugin } = await loadPlugin({
      folders: ["概念卡"],
      files: { "概念卡/A.md": past, "概念卡/B.md": future },
      view: makeView(),
    });
    const all = plugin.getReviewCards();
    const due = plugin.getDueCards();
    expect(all.length, 2);
    expect(due.length, 1);
    expect(due[0].file.basename, "A");
    expect(all.find((c) => c.file.basename === "B").due, false);
  });

  await test("把今日到期卡片写入 Daily Note（幂等）", async () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    const today = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const note = `# ${today}\n\n今天的日记正文。\n`;
    const card = `---\ntitle: "A"\ncard_format: lite\nstage: "幼苗"\nrevisit: 2000-01-01\n---\n\n# A\n`;
    const { plugin, files } = await loadPlugin({
      folders: ["概念卡"],
      files: { [`${today}.md`]: note, "概念卡/A.md": card },
      view: makeView(),
    });
    plugin.settings.previewBeforeSave = false;
    state.commands["write-daily-review"].callback();
    await tick();
    const content = files.get(`${today}.md`);
    ok(content.includes("<!-- concept-card-review:start -->"), "应写入标记块");
    ok(content.includes("[[A]]"), "应包含到期卡片");
    ok(content.includes("今天的日记正文。"), "应保留原文");
    state.commands["write-daily-review"].callback();
    await tick();
    const again = files.get(`${today}.md`);
    expect((again.match(/concept-card-review:start/g) || []).length, 1);
  });

  await test("阅读视图生成后自动写回双链", async () => {
    aiOk();
    global.__selection = {
      isCollapsed: false,
      toString: () => "认知失调",
      rangeCount: 1,
      getRangeAt: () => ({ commonAncestorContainer: {} }),
    };
    const text = "认知失调是一种理论。";
    const view = makeView({ path: "笔记/读书.md", text, selection: "认知失调", mode: "preview" });
    const { plugin, files } = await loadPlugin({
      folders: ["概念卡", "概念卡/理论"],
      files: { "笔记/读书.md": text },
      view,
    });
    plugin.settings.previewBeforeSave = false;
    state.commands["generate-full"].callback();
    await tick();
    ok(files.get("笔记/读书.md").includes("[[认知失调]]"), `应写回双链，实际: ${files.get("笔记/读书.md")}`);
  });

  await test("命中已有卡也会自动写回双链且不新建", async () => {
    aiOk({ ...CARD, title: "生涯适应力" });
    global.__selection = {
      isCollapsed: false,
      toString: () => "生涯适应力",
      rangeCount: 1,
      getRangeAt: () => ({ commonAncestorContainer: {} }),
    };
    const text = "生涯适应力很重要。";
    const view = makeView({ path: "笔记/读书.md", text, selection: "生涯适应力", mode: "preview" });
    const { files } = await loadPlugin({
      folders: ["概念卡", "概念卡/理论", "3-知识"],
      files: { "笔记/读书.md": text, "3-知识/生涯适应力.md": "# 已有卡\n" },
      view,
    });
    state.commands["generate-full"].callback();
    await tick();
    ok(files.get("笔记/读书.md").includes("[[生涯适应力]]"), `应写回双链，实际: ${files.get("笔记/读书.md")}`);
    ok(![...files.keys()].includes("概念卡/理论/生涯适应力.md"), "不应新建卡片");
  });

  await test("Daily Note 目录支持 {YYYY} 占位", async () => {
    const card = `---\ntitle: "A"\ncard_format: lite\nstage: "幼苗"\nrevisit: 2026-11-01\n---\n\n# A\n`;
    const view = makeView({ path: "概念卡/A.md", text: card });
    const { plugin, files } = await loadPlugin({
      folders: ["概念卡"],
      files: { "概念卡/A.md": card },
      view,
    });
    plugin.settings.dailyNoteFolder = "Daily Notes/测试/{YYYY}年";
    plugin.settings.dailyNoteFormat = "YYYY-MM-DD";
    state.commands["write-daily-due"].callback();
    await tick();
    ok(
      [...files.keys()].includes("Daily Notes/测试/2026年/2026-11-01.md"),
      `应按占位符建目录，实际: ${[...files.keys()].join(",")}`,
    );
  });

  Module._load = originalLoad;

  console.log("");
  if (failures.length) {
    console.log(`❌ ${passed} 通过，${failures.length} 失败`);
    for (const f of failures) {
      console.log(`\n[${f.name}]`);
      console.log(f.error && f.error.stack ? f.error.stack : f.error);
    }
    process.exit(1);
  } else {
    console.log(`✅ 全部 ${passed} 项通过`);
  }
})();
