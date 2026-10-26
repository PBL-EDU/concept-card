/**
 * 设置页。
 */
import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type ConceptCardPlugin from "./main";
import { CARD_TYPES, DEFAULT_SETTINGS, type ConceptCardSettings, type ProviderId } from "./types";
import type { CardStage } from "./card";
import { testConnection } from "./ai";
import { resolveMappedPath } from "./core";
import { allFolderPaths, listSubfolders, resolveRootFolder } from "./vault";

const PROVIDER_PRESETS: Record<Exclude<ProviderId, "custom">, { label: string; baseUrl: string; model: string }> = {
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  deepseek: { label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  ollama: { label: "Ollama（本地）", baseUrl: "http://127.0.0.1:11434/v1", model: "qwen2.5:7b" },
};

/** 文本输入合并写盘，避免每敲一个字符就写一次 data.json */
function deferSave(plugin: ConceptCardPlugin): () => void {
  let timer: number | undefined;
  return () => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = window.setTimeout(() => void plugin.saveSettings(), 400);
  };
}

export class ConceptCardSettingTab extends PluginSettingTab {
  plugin: ConceptCardPlugin;
  private folders: string[] = [];

  constructor(app: App, plugin: ConceptCardPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    this.folders = allFolderPaths(this.app).sort((a, b) => a.localeCompare(b, "zh"));

    const settings = this.plugin.settings;
    const saveSoon = deferSave(this.plugin);
    const root = resolveRootFolder(this.app, settings) || "";
    const detected = this.detectRoot();
    const subfolders = listSubfolders(this.app, root);

    containerEl.createEl("h2", { text: "概念卡生成器" });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "选中人名 / 理论 / 概念 → 右键「生成概念卡」→ AI 生成卡片并归档到知识库。阅读视图的右键菜单由本插件接管，可用下方开关关闭。",
    });

    /* ---------------- 归档位置 ---------------- */
    containerEl.createEl("h3", { text: "归档位置" });

    new Setting(containerEl)
      .setName("概念卡放在库根目录")
      .setDesc("根目录直接设为库根（跳过自动检测）；卡片仍会按下方规则进入根下的子文件夹，比如 3.基本概念")
      .addToggle((toggle) =>
        toggle.setValue(settings.useVaultRoot).onChange(async (value) => {
          settings.useVaultRoot = value;
          await this.plugin.saveSettings();
          this.display();
        }),
      );

    new Setting(containerEl)
      .setName("概念卡根目录")
      .setDesc(
        settings.useVaultRoot
          ? "当前：库根目录（关闭上方开关可改用指定目录）"
          : `留空则自动检测。当前检测到：${detected || "（没有匹配目录，将放在库根目录）"}。当前使用：${root || "库根目录"}`,
      )
      .addText((text) => {
        text.inputEl.disabled = settings.useVaultRoot;
        text
          .setPlaceholder("例如：知识库/概念卡")
          .setValue(settings.cardRootFolder)
          .onChange(async (value) => {
            settings.cardRootFolder = value.trim();
            await this.plugin.saveSettings();
          });
      })
      .addButton((btn) => {
        btn.setDisabled(settings.useVaultRoot);
        btn.setButtonText("填入检测结果").onClick(async () => {
          if (!detected) {
            new Notice("没有检测到合适的目录，请手动填写");
            return;
          }
          settings.cardRootFolder = detected;
          await this.plugin.saveSettings();
          this.display();
        });
      })
      .addButton((btn) => {
        btn.setDisabled(settings.useVaultRoot);
        btn.setButtonText("选择已有目录").onClick((evt) =>
          this.showFolderPicker(evt, async (path) => {
            settings.cardRootFolder = path;
            await this.plugin.saveSettings();
            this.display();
          }),
        );
      });

    new Setting(containerEl)
      .setName("自动匹配子文件夹")
      .setDesc("开启：按类型关键词在根目录下找现成子文件夹（如 概念 → 3.基本概念、作品 → 1..书籍、文献）；关闭：只认下方显式指定的类型目录")
      .addToggle((toggle) =>
        toggle.setValue(settings.autoMatchSubfolders).onChange(async (value) => {
          settings.autoMatchSubfolders = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("AI 选择下级子文件夹")
      .setDesc("目标文件夹里还有子文件夹时，让 AI 根据卡片内容再选一层（例如 3.基本概念 → 3.基本概念/心理学）；失败则留在原目录")
      .addToggle((toggle) =>
        toggle.setValue(settings.aiSubfolder).onChange(async (value) => {
          settings.aiSubfolder = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("找不到匹配子文件夹时")
      .setDesc("关闭：直接放在根目录；开启：按类型新建子文件夹（如「理论」）")
      .addToggle((toggle) =>
        toggle.setValue(settings.autoCreateSubfolder).onChange(async (value) => {
          settings.autoCreateSubfolder = value;
          await this.plugin.saveSettings();
        }),
      );

    if (subfolders.length) {
      containerEl.createEl("p", {
        cls: "setting-item-description",
        text: `根目录下已有子文件夹：${subfolders.join(" / ")}`,
      });
    } else {
      containerEl.createEl("p", {
        cls: "setting-item-description",
        text: "根目录下还没有子文件夹；建议先建好几个常用分类，插件会把不同卡片分别放进去。",
      });
    }

    for (const type of CARD_TYPES) {
      const current = settings.subfolderMap[type] ?? "";
      const desc = (value: string) =>
        value.trim()
          ? `固定归档到：${resolveMappedPath(value, root) || "（库根目录）"}`
          : "留空 = 自动匹配（找名字里含该类型关键词的子文件夹）";
      const row = new Setting(containerEl).setName(`${type}类卡片`).setDesc(desc(current));
      row.addText((text) =>
        text
          .setPlaceholder("子文件夹名，或库内路径，如 3-知识/人物卡")
          .setValue(current)
          .onChange((value) => {
            settings.subfolderMap[type] = value.trim();
            row.setDesc(desc(value));
            saveSoon();
          }),
      );
      row.addButton((btn) =>
        btn.setButtonText("选择目录").onClick((evt) =>
          this.showFolderPicker(evt, async (path) => {
            settings.subfolderMap[type] = path;
            await this.plugin.saveSettings();
            this.display();
          }),
        ),
      );
    }

    /* ---------------- 卡片内容 ---------------- */
    containerEl.createEl("h3", { text: "卡片内容" });

    new Setting(containerEl)
      .setName("卡片语言")
      .setDesc("默认简体中文；「跟随原文」会按材料语言出卡")
      .addDropdown((dd) =>
        dd
          .addOption("zh", "简体中文（默认）")
          .addOption("auto", "跟随原文")
          .addOption("en", "English")
          .setValue(settings.language)
          .onChange(async (value) => {
            settings.language = value as ConceptCardSettings["language"];
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("中英对照")
      .setDesc("中文卡片里，重要人名、理论、著作、概念首次出现时写成「中文（English）」，英文原名同时进 aliases")
      .addToggle((toggle) =>
        toggle.setValue(settings.bilingual).onChange(async (value) => {
          settings.bilingual = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("带上上下文")
      .setDesc("把选中文字前后的段落一起发给 AI，卡片会更贴近原文语境")
      .addToggle((toggle) =>
        toggle.setValue(settings.includeContext).onChange(async (value) => {
          settings.includeContext = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("上下文字数")
      .setDesc("前后合计大约取多少字（200-3000）")
      .addText((text) => {
        text.inputEl.type = "number";
        text
          .setValue(String(settings.contextChars))
          .onChange(async (value) => {
            const n = Number(value);
            if (Number.isFinite(n)) {
              settings.contextChars = Math.max(200, Math.min(3000, Math.round(n)));
              await this.plugin.saveSettings();
            }
          });
      });

    new Setting(containerEl)
      .setName("关联已有卡片")
      .setDesc("把知识库里已有的卡片标题发给 AI，让它在相关概念里直接写双链")
      .addToggle((toggle) =>
        toggle.setValue(settings.linkExistingCards).onChange(async (value) => {
          settings.linkExistingCards = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("关联卡片数量上限")
      .setDesc("标题太多会浪费 token，一般 100-200 足够")
      .addText((text) => {
        text.inputEl.type = "number";
        text
          .setValue(String(settings.maxExistingCards))
          .onChange(async (value) => {
            const n = Number(value);
            if (Number.isFinite(n)) {
              settings.maxExistingCards = Math.max(0, Math.min(1000, Math.round(n)));
              await this.plugin.saveSettings();
            }
          });
      });

    new Setting(containerEl)
      .setName("额外写作要求")
      .setDesc("会追加到提示词里，例如：多举中国语境下的例子 / 面向高中生 / 每段不超过三句话")
      .addTextArea((area) => {
        area
          .setPlaceholder("可选")
          .setValue(settings.extraInstructions)
          .onChange((value) => {
            settings.extraInstructions = value;
            saveSoon();
          });
        area.inputEl.rows = 3;
      });

    /* ---------------- 保存行为 ---------------- */
    containerEl.createEl("h3", { text: "保存行为" });

    new Setting(containerEl)
      .setName("保存前预览")
      .setDesc("开启：生成后先弹窗确认（可改标题、正文、目录）；关闭：直接写入并打开")
      .addToggle((toggle) =>
        toggle.setValue(settings.previewBeforeSave).onChange(async (value) => {
          settings.previewBeforeSave = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("生成后打开卡片")
      .addToggle((toggle) =>
        toggle.setValue(settings.openAfterCreate).onChange(async (value) => {
          settings.openAfterCreate = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("自动建立双向链接")
      .setDesc("新建或命中已有卡片后，自动把原文里的选中关键词变成 [[卡片]] 双链；阅读视图也会写回文件（长段落保留原文，只在末尾补链接）")
      .addToggle((toggle) =>
        toggle.setValue(settings.linkBackToSource).onChange(async (value) => {
          settings.linkBackToSource = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("文件名格式")
      .addDropdown((dd) =>
        dd
          .addOption("title", "概念名")
          .addOption("type-title", "类型-概念名")
          .addOption("title-type", "概念名（类型）")
          .setValue(settings.filenamePattern)
          .onChange(async (value) => {
            settings.filenamePattern = value as ConceptCardSettings["filenamePattern"];
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("同名卡片")
      .addDropdown((dd) =>
        dd
          .addOption("open", "打开已有的")
          .addOption("suffix", "新建并加 -2 后缀")
          .addOption("overwrite", "覆盖已有内容")
          .setValue(settings.onDuplicate)
          .onChange(async (value) => {
            settings.onDuplicate = value as ConceptCardSettings["onDuplicate"];
            await this.plugin.saveSettings();
          }),
      );

    /* ---------------- 复查与阶段 ---------------- */
    containerEl.createEl("h3", { text: "复查与阶段" });
    const intervalRows: Array<{ key: CardStage; label: string }> = [
      { key: "幼苗", label: "幼苗复查间隔（天）" },
      { key: "成长", label: "成长复查间隔（天）" },
      { key: "常青", label: "常青复查间隔（天）" },
    ];
    for (const row of intervalRows) {
      new Setting(containerEl)
        .setName(row.label)
        .addText((text) => {
          text.inputEl.type = "number";
          text.setValue(String(settings.reviewIntervals[row.key] ?? 14)).onChange(async (value) => {
            const n = Number(value);
            if (Number.isFinite(n) && n > 0) {
              settings.reviewIntervals[row.key] = Math.max(1, Math.min(365, Math.round(n)));
              await this.plugin.saveSettings();
            }
          });
        });
    }

    new Setting(containerEl)
      .setName("阶段建议")
      .setDesc("打开卡片时，如果留白已填写，提示可升级阶段（不会自动改）")
      .addToggle((toggle) =>
        toggle.setValue(settings.stageSuggestions).onChange(async (value) => {
          settings.stageSuggestions = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("启动时提示到期复查")
      .setDesc("打开 Obsidian 时，如果有到期的概念卡，弹一次提示（右下角状态栏也会显示数量）")
      .addToggle((toggle) =>
        toggle.setValue(settings.reviewReminder).onChange(async (value) => {
          settings.reviewReminder = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("写入今日日记")
      .setDesc("启动或复查后，把今日到期的卡片写进今天的日记；用一个自动标记块，重复执行不会重复添加（日记不存在时不会自动创建）")
      .addToggle((toggle) =>
        toggle.setValue(settings.dailyNoteReminder).onChange(async (value) => {
          settings.dailyNoteReminder = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("日记文件夹")
      .setDesc("例如 Daily Notes/我的/{YYYY}年；{YYYY}/{MM}/{DD} 会按目标日期替换；留空 = 库根目录")
      .addText((text) =>
        text
          .setPlaceholder("例如：日记")
          .setValue(settings.dailyNoteFolder)
          .onChange((value) => {
            settings.dailyNoteFolder = value.trim();
            saveSoon();
          }),
      );

    new Setting(containerEl)
      .setName("日记文件名格式")
      .setDesc("例如 YYYY-MM-DD；留空默认 YYYY-MM-DD")
      .addText((text) =>
        text
          .setPlaceholder("YYYY-MM-DD")
          .setValue(settings.dailyNoteFormat)
          .onChange((value) => {
            settings.dailyNoteFormat = value.trim();
            saveSoon();
          }),
      );

    new Setting(containerEl)
      .setName("提前预写天数")
      .setDesc("启动时，为未来多少天内到期的卡片预写那天的日记（0 = 不预写，只在安排复查时写）")
      .addText((text) => {
        text.inputEl.type = "number";
        text.setValue(String(settings.dailyNoteHorizonDays)).onChange(async (value) => {
          const n = Number(value);
          if (Number.isFinite(n)) {
            settings.dailyNoteHorizonDays = Math.max(0, Math.min(365, Math.round(n)));
            await this.plugin.saveSettings();
          }
        });
      });

    /* ---------------- 交互 ---------------- */
    containerEl.createEl("h3", { text: "交互" });

    new Setting(containerEl)
      .setName("阅读视图右键菜单")
      .setDesc("阅读模式下选中文字后右键，会显示插件自己的菜单（包含「生成概念卡」与「复制」）")
      .addToggle((toggle) =>
        toggle.setValue(settings.readingViewMenu).onChange(async (value) => {
          settings.readingViewMenu = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("左侧栏图标")
      .setDesc("改动后需要重新加载插件（或在命令面板执行「重新加载应用」）")
      .addToggle((toggle) =>
        toggle.setValue(settings.showRibbon).onChange(async (value) => {
          settings.showRibbon = value;
          await this.plugin.saveSettings();
        }),
      );

    /* ---------------- AI ---------------- */
    containerEl.createEl("h3", { text: "AI 服务" });

    new Setting(containerEl)
      .setName("服务商")
      .setDesc("选择后会填入默认 Base URL 与模型，可再手动改")
      .addDropdown((dd) => {
        dd.addOption("openai", "OpenAI");
        dd.addOption("deepseek", "DeepSeek");
        dd.addOption("ollama", "Ollama（本地）");
        dd.addOption("custom", "自定义（OpenAI 兼容）");
        dd.setValue(settings.provider).onChange(async (value) => {
          settings.provider = value as ProviderId;
          if (value !== "custom" && value in PROVIDER_PRESETS) {
            const preset = PROVIDER_PRESETS[value as Exclude<ProviderId, "custom">];
            settings.baseUrl = preset.baseUrl;
            settings.model = preset.model;
          }
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName("Base URL")
      .setDesc("OpenAI 兼容接口地址，通常以 /v1 结尾")
      .addText((text) =>
        text
          .setPlaceholder("https://api.deepseek.com/v1")
          .setValue(settings.baseUrl)
          .onChange((value) => {
            settings.baseUrl = value.trim();
            saveSoon();
          }),
      );

    new Setting(containerEl)
      .setName("API Key")
      .setDesc("只保存在本库的 .obsidian/plugins/concept-card/data.json，不会上传到别处")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("sk-...")
          .setValue(settings.apiKey)
          .onChange((value) => {
            settings.apiKey = value.trim();
            saveSoon();
          });
      });

    new Setting(containerEl)
      .setName("模型")
      .setDesc("例如 gpt-4o-mini / deepseek-chat / qwen2.5:7b")
      .addText((text) =>
        text
          .setValue(settings.model)
          .onChange((value) => {
            settings.model = value.trim();
            saveSoon();
          }),
      );

    new Setting(containerEl)
      .setName("温度")
      .setDesc("0.2 更稳、更贴事实；0.7 更有发散性")
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.05)
          .setValue(settings.temperature)
          .setDynamicTooltip()
          .onChange(async (value) => {
            settings.temperature = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("最大输出 token")
      .setDesc("卡片一般 1200-2000 足够")
      .addText((text) => {
        text.inputEl.type = "number";
        text
          .setValue(String(settings.maxTokens))
          .onChange(async (value) => {
            const n = Number(value);
            if (Number.isFinite(n)) {
              settings.maxTokens = Math.max(200, Math.min(16000, Math.round(n)));
              await this.plugin.saveSettings();
            }
          });
      });

    new Setting(containerEl)
      .setName("超时（秒）")
      .addText((text) => {
        text.inputEl.type = "number";
        text
          .setValue(String(Math.round(settings.timeoutMs / 1000)))
          .onChange(async (value) => {
            const n = Number(value);
            if (Number.isFinite(n)) {
              settings.timeoutMs = Math.max(5, Math.min(600, Math.round(n))) * 1000;
              await this.plugin.saveSettings();
            }
          });
      });

    new Setting(containerEl)
      .setName("测试连接")
      .setDesc("用当前配置发一个极小的请求，确认 Key / 地址 / 模型可用")
      .addButton((btn) =>
        btn.setButtonText("测试").onClick(async () => {
          btn.setButtonText("测试中…");
          btn.setDisabled(true);
          try {
            const reply = await testConnection(this.plugin.settings);
            new Notice(`✅ 连接正常：${reply}`);
          } catch (e) {
            new Notice(`❌ ${(e as Error).message}`, 8000);
          } finally {
            btn.setButtonText("测试");
            btn.setDisabled(false);
          }
        }),
      );

    /* ---------------- 重置 ---------------- */
    containerEl.createEl("h3", { text: "维护" });
    new Setting(containerEl)
      .setName("恢复默认设置")
      .setDesc("会清空 AI 配置（Base URL / API Key / 模型等），不会删除已生成的卡片")
      .addButton((btn) =>
        btn.setButtonText("恢复默认").onClick(async () => {
          this.plugin.settings = { ...DEFAULT_SETTINGS, subfolderMap: { ...DEFAULT_SETTINGS.subfolderMap } };
          await this.plugin.saveSettings();
          this.display();
          new Notice("已恢复默认设置（AI 配置已清空）");
        }),
      );
  }

  private detectRoot(): string {
    return resolveRootFolder(this.app, { ...this.plugin.settings, cardRootFolder: "" });
  }

  /** 简易目录选择：把文件夹列表挂到按钮下方的浮层里（在 popout 窗口里也能用） */
  private showFolderPicker(evt: MouseEvent, onPick: (path: string) => void): void {
    const anchor = evt.currentTarget as HTMLElement;
    const doc = anchor.ownerDocument ?? document;
    const parent = anchor.parentElement;
    parent?.querySelector(".cc-folder-picker")?.remove();

    const picker = doc.createElement("div");
    picker.className = "cc-folder-picker";
    const search = doc.createElement("input");
    search.type = "text";
    search.className = "cc-folder-search";
    search.placeholder = "搜索目录…";
    const list = doc.createElement("div");
    list.className = "cc-folder-list";
    picker.append(search, list);

    const render = (filter: string) => {
      list.empty();
      const items = this.folders.filter((f) => f.toLowerCase().includes(filter.toLowerCase())).slice(0, 300);
      if (!items.length) {
        const empty = doc.createElement("div");
        empty.className = "cc-folder-empty";
        empty.textContent = "没有匹配目录";
        list.appendChild(empty);
      }
      for (const path of items) {
        const item = doc.createElement("div");
        item.className = "cc-folder-item";
        item.textContent = path;
        item.addEventListener("click", () => {
          picker.remove();
          onPick(path);
        });
        list.appendChild(item);
      }
    };

    search.addEventListener("input", () => render(search.value));
    render("");
    parent?.appendChild(picker);
    window.setTimeout(() => search.focus(), 30);
    const close = (e: MouseEvent) => {
      if (!picker.contains(e.target as Node)) {
        picker.remove();
        doc.removeEventListener("mousedown", close, true);
      }
    };
    doc.addEventListener("mousedown", close, true);
  }
}
