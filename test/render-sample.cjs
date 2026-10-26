/**
 * 生成一张示例卡（lite / full），用于肉眼检查排版。
 * 运行：node test/render-sample.cjs [lite|full]
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const outDir = path.join(__dirname, ".build");
fs.mkdirSync(outDir, { recursive: true });
for (const file of ["types.ts", "core.ts", "card.ts"]) {
  const source = fs.readFileSync(path.join(root, "src", file), "utf8");
  fs.writeFileSync(
    path.join(outDir, file.replace(/\.ts$/, ".js")),
    ts.transpileModule(source, {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2018,
        esModuleInterop: true,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
      },
    }).outputText,
  );
}

const card = require("./.build/card.js");

const RAW = {
  title: "认知失调",
  type: "理论",
  aliases: ["Cognitive Dissonance", "认知不协调"],
  tags: ["心理学", "社会心理学"],
  summary: "信念与行为不一致时产生的不适感。",
  quote: "人会为自己的选择找理由。",
  sections: {
    definition: {
      body: "费斯汀格（Leon Festinger）1957 年提出：人需要保持内部一致，信念与行为冲突时会产生不适。\n\n缓解方式有三条：改变行为、改变信念、或给矛盾找新解释。",
      source: "text",
    },
    examples: { body: "花大价钱买了课程的人，会更相信课程有用。", source: "common" },
    boundaries: { body: "只是信息不足导致的误判，不属于认知失调。", source: "common" },
    origins: { body: "1957 年由费斯汀格提出；后续研究区分了“努力合理化”与“选择后偏好”。", source: "common" },
    confusions: { body: "与自我辩解不同：前者是不适状态，后者是缓解策略。", source: "common" },
    perspectives: { body: "支持者看重解释力；批评者认为难以证伪。", source: "inference" },
    connections: { body: "与 [[态度改变]] 属于因果关系。", source: "common" },
  },
  selftest: ["买课后的态度变化属于什么？", "什么情况不算认知失调？"],
  uncertainties: [],
  confidence: "high",
};

const ctx = {
  sourceNote: "社会心理学读书笔记",
  sourcePath: "笔记/社会心理学读书笔记.md",
  selection: "认知失调",
  createdISO: "2026-10-25T12:00:00+08:00",
  createdHuman: "2026-10-25 12:00",
  updatedISO: "2026-10-25T12:00:00+08:00",
  updatedHuman: "2026-10-25 12:00",
  revisit: "2026-11-01",
  stage: "幼苗",
  format: process.argv[2] === "full" ? "full" : "lite",
  model: "deepseek-chat",
  sources: ["社会心理学读书笔记"],
};

const c = card.normalizeCardV3(RAW, "X");
process.stdout.write(card.renderCardMarkdownV3(c, ctx));
