
// Usage:
//   node src/index.js --input data/sample-marks.csv \
//                     --output data/output/graded.csv \
//                     --report data/output/report.md

import path from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "@anthropic-ai/claude-agent-sdk";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    args[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return args;
}

const args = parseArgs(process.argv);
const input = args.input ?? "data/sample-marks.csv";
const output = args.output ?? "data/output/graded.csv";
const report = args.report ?? "data/output/report.md";
const maxMark = args.maxMark ? Number(args.maxMark) : 100;

const prompt =
  `Grade the marks in "${input}". Use ${maxMark} as the per-subject ` +
  `maximum. Write the graded CSV to "${output}" and the markdown report ` +
  `to "${report}".`;

const response = query({
  prompt,
  options: {
    cwd: PROJECT_ROOT,
    settingSources: ["project"], 
    skills: "all",                
    allowedTools: ["Bash", "Read"],
  },
});

for await (const msg of response) {
  if (msg.type === "assistant") {
    for (const block of msg.message.content) {
      if (block.type === "text") process.stdout.write(block.text);
    }
  } else if (msg.type === "result" && msg.is_error) {
    console.error("\nAgent error:", msg.result);
    process.exit(1);
  }
}
