/**
 * 纯逻辑单元测试（不启动 Obsidian）。
 * 运行：node test/run.cjs
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const outDir = path.join(__dirname, ".build");
fs.mkdirSync(outDir, { recursive: true });

for (const file of ["types.ts", "core.ts", "card.ts", "prompt.ts", "daily-block.ts"]) {
  const source = fs.readFileSync(path.join(root, "src", file), "utf8");
  const out = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2018,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
    },
  }).outputText;
  fs.writeFileSync(path.join(outDir, file.replace(/\.ts$/, ".js")), out);
}

const core = require("./.build/core.js");
const card = require("./.build/card.js");
const prompt = require("./.build/prompt.js");
const daily = require("./.build/daily-block.js");

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
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

const countH2 = (md) => (md.match(/^## (?!出处)/gm) || []).length;

/* ---------------- 文本工具 ---------------- */
test("termFromSelection 去掉引号与句末标点", () => {
  expect(core.termFromSelection("「认知失调」"), "认知失调");
  expect(core.termFromSelection("  **心流**  "), "心流");
  expect(core.termFromSelection("建构主义。"), "建构主义");
});

test("sanitizeFilename 去掉非法字符与重复 .md", () => {
  const name = core.sanitizeFilename('a/b:c*d?"e<f>g|h#i^j[k]');
  ok(!/[\\/:*?"<>|#^[\]]/.test(name), `仍含非法字符: ${name}`);
  expect(core.sanitizeFilename("认知失调.md"), "认知失调");
  expect(core.sanitizeFilename("  ...  "), "未命名概念");
});

test("extractJson 支持代码围栏与嵌套", () => {
  expect(core.extractJson('```json\n{"a":1}\n```'), { a: 1 });
  expect(core.extractJson('说明：{"a":{"b":2},"c":"}"} 完毕'), { a: { b: 2 }, c: "}" });
  expect(core.extractJson("完全不是 JSON"), null);
});

/* ---------------- 目录 ---------------- */
test("detectRootFolder / matchSubfolder / resolveMappedPath", () => {
  expect(core.detectRootFolder(["附件", "概念卡", "知识库/概念卡子库"]), "概念卡");
  expect(core.matchSubfolder("理论", ["人物", "理论卡片"], false), { folder: "理论卡片", needsCreate: false });
  expect(core.matchSubfolder("作品", ["人物"], false), { folder: "", needsCreate: false });
  expect(core.matchSubfolder("作品", ["人物"], true), { folder: "作品", needsCreate: true });
  expect(core.resolveMappedPath("人物卡", "概念卡"), "概念卡/人物卡");
  expect(core.resolveMappedPath("/3-知识/人物卡", "概念卡"), "3-知识/人物卡");
});

test("nextAvailableName / sliceContext / formatTimestamp", () => {
  expect(core.nextAvailableName("认知失调", new Set(["认知失调"])), "认知失调-2");
  const text = "开头。" + "前".repeat(300) + "认知失调" + "后".repeat(300) + "结尾。";
  const out = core.sliceContext(text, "认知失调", 400);
  ok(out.includes("上文：") && out.includes("下文："), "应截取上下文");
  ok(!out.includes("结尾。"), "不应包含远处内容");
  const stamp = core.formatTimestamp(new Date(2026, 0, 5, 7, 8, 9));
  ok(/^2026-01-05T07:08:09[+-]\d{2}:\d{2}$/.test(stamp.iso), `iso 应带时区: ${stamp.iso}`);
});

/* ---------------- v3 卡片 ---------------- */
test("titleKey 归一化：忽略英文翻译括号，保留中文消歧义括号", () => {
  expect(core.titleKey("认知失调（Cognitive Dissonance）"), "认知失调");
  expect(core.titleKey("认知失调"), "认知失调");
  ok(core.titleKey("心流（心理学）") !== core.titleKey("心流（计算机）"), "中文括号应保留区分");
  expect(core.titleKey(" Cognitive  Dissonance "), "cognitivedissonance");
});

const ctxOf = (format) => ({
  sourceNote: "书A",
  sourcePath: "笔记/书A.md",
  selection: "认知失调",
  createdISO: "2026-10-25T11:00:00+08:00",
  createdHuman: "2026-10-25 11:00",
  updatedISO: "2026-10-25T11:00:00+08:00",
  updatedHuman: "2026-10-25 11:00",
  revisit: "2026-11-01",
  stage: "幼苗",
  format,
  model: "deepseek-chat",
  sources: ["书A"],
});

const RAW_CARD = {
  title: "认知失调",
  type: "Theory",
  aliases: ["Cognitive Dissonance"],
  tags: ["心理学"],
  summary: "信念与行为不一致时产生的不适。",
  quote: "人会为自己的选择找理由。",
  sections: {
    definition: { body: "第一层。\n\n第二层。", source: "text" },
    examples: { body: "花大价钱买课后更相信它有用。", source: "common" },
    boundaries: { body: "信息不足导致的误判不算。", source: "common" },
    origins: { body: "费斯汀格 1957 年提出。", source: "common" },
    confusions: { body: "与自我辩解不同：前者是状态，后者是策略。", source: "common" },
    perspectives: { body: "支持者看重解释力，批评者认为难以证伪。", source: "inference" },
    connections: { body: "与 [[态度改变]] 属于因果关系。", source: "common" },
  },
  selftest: ["买课后的态度变化属于什么？", "什么情况不算认知失调？"],
  uncertainties: [],
  confidence: "high",
};

test("normalizeCardV3 归一化类型、别名与小节来源", () => {
  const c = card.normalizeCardV3(RAW_CARD, "兜底");
  expect(c.type, "理论");
  expect(c.aliases, ["Cognitive Dissonance"]);
  expect(c.sections.definition, { body: "第一层。\n\n第二层。", source: "text" });
  expect(c.sections.perspectives.source, "inference");
  expect(c.selftest.length, 2);
});

test("渲染精简版：7 个小节 + 留白追问 + 生命周期字段", () => {
  const c = card.normalizeCardV3(RAW_CARD, "X");
  const md = card.renderCardMarkdownV3(c, ctxOf("lite"));
  expect(countH2(md), 7);
  ok(md.includes("> [!abstract] 一句话"), "应有一句话");
  ok(md.includes("> [!quote] 原文语境"), "应有原文语境");
  ok(md.includes("*来源：原文*"), "原文小节应标来源");
  ok(!md.includes("## 来龙去脉"), "精简版不应有来龙去脉");
  ok(!md.includes("## 不同视角与争议"), "精简版不应有争议");
  ok(md.includes("> [!question] 待你补充"), "留白应渲染成追问");
  ok(md.includes("---\n\n## 我的看法"), "我的看法前应有分栏横线");
  ok(md.includes("---\n\n## 出处"), "出处前应有分栏横线");
  ok(md.includes("我同意哪一部分"), "应有我的看法追问");
  ok(md.includes("本周可以试的一件小事"), "应有行动追问");
  ok(md.includes("1. 买课后的态度变化"), "自测应编号");
  ok(md.includes('card_format: lite'), "应记录 card_format");
  ok(md.includes('stage: "幼苗"'), "应记录 stage");
  ok(md.includes("revisit: 2026-11-01"), "应记录 revisit");
  ok(md.includes('  - "[[书A]]"'), "sources 应写双链");
});

test("渲染完整版：10 个小节，来龙去脉按类型命名", () => {
  const c = card.normalizeCardV3(RAW_CARD, "X");
  const md = card.renderCardMarkdownV3(c, ctxOf("full"));
  expect(countH2(md), 10);
  ok(md.includes("## 来龙去脉"), "理论卡应有用例标题");
  ok(md.includes("## 不同视角与争议"), "应有争议");
  ok(md.includes("## 与已有知识的连接"), "应有连接");

  const person = card.renderCardMarkdownV3({ ...c, type: "人物" }, ctxOf("full"));
  ok(person.includes("## 时代与生平"), "人物卡应有时代与生平");
});

test("留白小节不包含 AI 观点（只有问题与占位）", () => {
  const c = card.normalizeCardV3(RAW_CARD, "X");
  const md = card.renderCardMarkdownV3(c, ctxOf("full"));
  const myview = md.split("## 我的看法")[1] || "";
  ok(myview.includes("> [!question]"), "应是问句");
  ok(!myview.includes("*来源："), "留白不应有 AI 来源标记");
  ok(myview.includes("我的回答："), "应留出回答位置");
});

/* ---------------- 升级 ---------------- */
const additions = [
  { id: "origins", body: "新的沿革内容", source: "common" },
  { id: "perspectives", body: "新的争议内容", source: "inference" },
  { id: "connections", body: "新的连接内容", source: "common" },
];

test("insertMissingSections 只补缺失小节并按固定顺序插入", () => {
  const c = card.normalizeCardV3(RAW_CARD, "X");
  const lite = card.renderCardMarkdownV3(c, ctxOf("lite")).replace("我的回答：", "我的回答：\n\n我自己的笔记 XYZ");
  const full = card.insertMissingSections(lite, "理论", additions, "full");
  ok(full.includes("## 来龙去脉"), "应补沿革");
  ok(full.includes("新的沿革内容"), "应写入沿革内容");
  ok(full.includes("我自己的笔记 XYZ"), "用户内容必须保留");
  ok(full.indexOf("## 来龙去脉") < full.indexOf("## 易混淆辨析"), "沿革应在易混淆前");
  ok(full.indexOf("## 不同视角与争议") < full.indexOf("## 与已有知识的连接"), "争议应在连接前");
  ok(full.indexOf("## 与已有知识的连接") < full.indexOf("## 我的看法"), "连接应在我的看法前");
});

test("insertMissingSections 幂等：重复执行不会重复插入", () => {
  const c = card.normalizeCardV3(RAW_CARD, "X");
  const lite = card.renderCardMarkdownV3(c, ctxOf("lite"));
  const once = card.insertMissingSections(lite, "理论", additions, "full");
  const twice = card.insertMissingSections(once, "理论", additions, "full");
  expect((twice.match(/## 来龙去脉/g) || []).length, 1);
  expect((twice.match(/## 不同视角与争议/g) || []).length, 1);
});

test("setFrontmatterField 只改字段，不动正文", () => {
  const c = card.normalizeCardV3(RAW_CARD, "X");
  const md = card.renderCardMarkdownV3(c, ctxOf("lite"));
  const next = card.setFrontmatterField(card.setFrontmatterField(md, "card_format", "full"), "stage", '"成长"');
  ok(next.includes("card_format: full"), "应更新字段");
  ok(next.includes('stage: "成长"'), "应更新 stage");
  ok(next.includes("## 定义与机制"), "正文应保留");
  expect(countH2(next), countH2(md));
});

test("revisitDate 计算复查日期", () => {
  expect(card.revisitDate(7, new Date(2026, 9, 25)), "2026-11-01");
  expect(card.revisitDate(90, new Date(2026, 9, 25)), "2027-01-23");
});

/* ---------------- 提示词 ---------------- */
const promptInput = (format) => ({
  term: "认知失调",
  selection: "认知失调 是费斯汀格提出的理论。",
  sourceNote: "书A",
  sourcePath: "笔记/书A.md",
  context: "上文：…",
  existingCards: ["态度改变"],
  existingTags: ["心理学"],
  language: "zh",
  format,
  extraInstructions: "",
});

test("lite 提示词只要求 4 个 AI 小节，且带来源规则", () => {
  const messages = prompt.buildMessages(promptInput("lite"));
  ok(messages[0].content.includes("lite 精简版"), "应标明档位");
  ok(messages[0].content.includes('"definition"'), "应有定义");
  ok(!messages[0].content.includes('"origins"'), "lite 不应要求来龙去脉");
  ok(messages[0].content.includes("source"), "应要求来源标记");
  ok(messages[0].content.includes("不替读者表态"), "应禁止替读者表态");
  ok(messages[0].content.includes("中文（English）"), "应要求中英对照");
  ok(messages[1].content.includes("- 态度改变"), "应带已有卡片");
  ok(messages[1].content.includes("心理学"), "应带已有标签");
});

test("full 提示词要求 7 个 AI 小节", () => {
  const messages = prompt.buildMessages(promptInput("full"));
  for (const id of ["origins", "perspectives", "connections"]) {
    ok(messages[0].content.includes(`"${id}"`), `应要求 ${id}`);
  }
});

test("升级提示词只要求补缺失小节", () => {
  const messages = prompt.buildUpgradeMessages({
    existingMarkdown: "# 认知失调\n\n## 定义与机制\n内容",
    type: "理论",
    language: "zh",
    existingCards: ["态度改变"],
  });
  ok(messages[0].content.includes("只补缺失的小节"), "应说明只补缺失");
  ok(messages[0].content.includes("origins"), "应要求 origins");
  ok(messages[0].content.includes("perspectives"), "应要求 perspectives");
  ok(messages[1].content.includes("已有概念卡"), "应带既有卡片内容");
});

/* ---------------- 阶段建议 ---------------- */
const mkBlankCard = (viewAnswer, meaningAnswer) =>
  `---\ntitle: "X"\ncard_format: lite\nstage: "幼苗"\n---\n\n# X\n\n## 我的看法\n\n> [!question] 待你补充\n> - q\n\n我的回答：${viewAnswer}\n\n## 对我的意义与行动\n\n> [!question] 待你补充\n> - q\n\n我的回答：${meaningAnswer}\n`;

test("suggestStageFor 只在留白填够时给建议", () => {
  expect(card.suggestStageFor(mkBlankCard("", ""), "幼苗", "lite", "2026-11-01", "2026-10-25"), null);
  const filled = mkBlankCard(
    "我自己的生活里经常出现这种选择后辩护的情况，和书里的例子很像。",
    "本周我准备在买课前记录一下自己的理由，看看是否会为选择辩护。",
  );
  expect(card.suggestStageFor(filled, "幼苗", "lite", "2026-11-01", "2026-10-25"), "成长");
  expect(card.suggestStageFor(filled, "成长", "full", "2026-10-01", "2026-10-25"), "常青");
  expect(card.suggestStageFor(filled, "成长", "full", "2026-11-01", "2026-10-25"), null);
  expect(card.suggestStageFor(filled, "成长", "lite", "2026-10-01", "2026-10-25"), null);
});

/* ---------------- Daily Note 复查块 ---------------- */
test("buildReviewBlock / upsertReviewBlock 幂等且保留日记正文", () => {
  const block = daily.buildReviewBlock([{ basename: "A", stage: "幼苗", revisit: "2026-10-25" }]);
  ok(block.includes("[[A]]"), "应包含卡片双链");
  const note = "# 日记\n\n今天的正文。\n";
  const once = daily.upsertReviewBlock(note, block);
  ok(once.includes(daily.REVIEW_BLOCK_START), "应有起始标记");
  ok(once.includes("今天的正文。"), "应保留原文");
  const twice = daily.upsertReviewBlock(once, block);
  expect((twice.match(/concept-card-review:start/g) || []).length, 1);
  const empty = daily.upsertReviewBlock(twice, daily.buildReviewBlock([]));
  ok(empty.includes("今天没有到期"), "无到期时应更新为无内容提示");
});

test("linkFirstKeyword 只链核心词，找不到就返回 null", () => {
  const text = "费斯汀格提出的认知失调理论";
  expect(core.linkFirstKeyword(text, ["认知失调"], "认知失调"), "费斯汀格提出的[[认知失调]]理论");
  expect(core.linkFirstKeyword("某个说法", ["认知失调"], "认知失调"), null);
  expect(
    core.linkFirstKeyword("Cognitive Dissonance 解释了它", ["认知失调", "Cognitive Dissonance"], "认知失调"),
    "[[认知失调|Cognitive Dissonance]] 解释了它",
  );
  const linked = "关于[[认知失调]]的说明";
  expect(core.linkFirstKeyword(linked, ["认知失调"], "认知失调"), null);
});

/* ---------------- 汇总 ---------------- */
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
