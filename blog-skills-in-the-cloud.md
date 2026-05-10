+++
title = "Skills in the Cloud: How a 30-Line Agent Beats a 3,000-Line One"
date = 2026-05-10
draft = false
tags = ["claude", "agents", "skills", "ai", "node"]
categories = ["engineering"]
description = "A walkthrough of the 'skill' pattern in modern AI agents — what it is, why it scales, and how a tiny grading agent shows the whole idea in under 100 lines of code."
+++

## Introduction

Every agent project starts the same way. Version one is a single file: a system prompt, a couple of tool definitions, a `while` loop, ship it. Version two is a 3,000-line monolith — prompt fragments stitched together by `if` statements, a tool registry nobody fully understands, a deploy process that terrifies anyone who touches it.

The third version is supposed to be different. It usually isn't.

There is a pattern emerging that actually fixes this. I've come to call it **skills in the cloud**: the *behaviour* of your agent lives in portable, declarative bundles that the runtime discovers at startup, not in your source code. Your agent becomes a thin shim. Your skills become the product. Add a new capability? Drop a folder. Change a business rule? Edit a markdown file. Redeploy? Not needed.

This post walks through exactly what that looks like, using a small project called `grade-agent` as a concrete example. The entire agent is thirty lines. Everything that actually matters — grading rules, output format, report layout — lives in one skill folder that the agent itself never reads directly.

---

## What Is a Skill?

In the Claude Agent SDK, a skill is a folder. Inside that folder is a `SKILL.md` file with YAML front matter and a body of instructions, plus any supporting assets the skill needs — templates, reference data, examples.

When the SDK starts, it scans `.claude/skills/` and reads the front matter of every `SKILL.md` it finds. The front matter has two keys that matter: `name` and `description`.

```yaml
---
name: grade-csv
description: Calculate letter grades and 4.0-scale GPAs from a marks CSV.
  Use this skill whenever the user asks to grade marks, compute GPAs,
  build a report card, or calculate class averages — even if they don't
  say "GPA" explicitly.
---
```

When a user prompt arrives, the model reads all installed skill descriptions and decides which (if any) match. Only then does it load the full body of the matching `SKILL.md` into context. If the user asks about the weather, the grading skill stays on disk — it costs nothing and adds nothing to the context window.

That last point is the unlock. You can have fifty skills installed and the agent only pays for the one that fires. Skills don't bloat your context until they're needed.

---

## A Worked Example: grade-agent

The repo layout is small enough to fit in your head:

```
grade-agent/
├── src/
│   └── index.js          # the entire agent
├── data/
│   └── sample-marks.csv
└── .claude/
    └── skills/
        └── grade-csv/
            ├── SKILL.md
            └── templates/
                ├── graded.template.md
                └── report.template.md
```

### The Agent

Here is the complete agent, lightly trimmed:

```js
import { query } from "@anthropic-ai/claude-agent-sdk";

const prompt =
  `Grade the marks in "${input}". Use ${maxMark} as the per-subject ` +
  `maximum. Write the graded CSV to "${output}" and the report to "${report}".`;

const response = query({
  prompt,
  options: {
    cwd: PROJECT_ROOT,
    settingSources: ["project"],
    skills: "all",
    allowedTools: ["Bash", "Read"],
  },
});
```

Notice what this file does *not* do. It doesn't read `SKILL.md`. It doesn't build a system prompt with grading rules in it. It doesn't know what an A− is, or that GPAs exist, or what a class report should look like. All it does is build a one-sentence prompt and hand it to the SDK with `skills: "all"`. The SDK handles discovery, matching, and invocation.

If you wanted to add a second skill — say, `summarize-feedback` for parsing teacher comments — you would not change a single character of `index.js`. Drop a new folder under `.claude/skills/` and you're done.

### The Skill

The skill is where all the real logic lives. `SKILL.md` is the source of truth for three things: the grading rules, the shape of the output CSV, and the layout of the markdown report.

The grading rules are a plain markdown table:

```
| Percentage | Letter | GPA  |
|------------|--------|------|
| 93–100     | A      | 4.0  |
| 90–92      | A-     | 3.7  |
| 87–89      | B+     | 3.3  |
...
| < 60       | F      | 0.0  |
```

The skill body walks through the workflow step by step: confirm paths, read the CSV, compute per-subject percentages, look up letter and GPA for each, compute the student's mean, look up the *overall* grade from that mean (not by averaging GPA points — a subtle but important distinction), and write both output files using the templates.

This is what matters most: **the skill is the contract.** If a teacher decides next term that 92 % should round up to an A, you change one cell in a markdown table. You don't redeploy the agent, rebuild a Docker image, or touch a prompt template buried in a Python module.

---

## Templates as First-Class Citizens

Supporting assets belong next to the skill that uses them — not scattered across the project or inlined into `SKILL.md`. In `grade-agent`, both output templates live in a `templates/` subfolder:

- **`graded.template.md`** — defines the CSV column layout: per-subject `{subject}_letter` and `{subject}_gpa` columns, followed by the trailing `average`, `overall_letter`, and `overall_gpa` columns.
- **`report.template.md`** — the markdown report skeleton, with `{{students}}`, `{{mean_average}}`, `{{distribution_table}}`, and `{{students_table}}` as substitution placeholders.

The skill body tells the model to read each template before writing output. This keeps `SKILL.md` free of layout logic — it describes *what* to compute, while the templates describe *how* to present it. Want to add a column to the CSV? Edit `graded.template.md`. Want a different report header? Edit `report.template.md`. Neither change touches the grading logic or the agent code.

---

## Why "In the Cloud"?

So far this is a local-file pattern — and that's already valuable. But the reason I called this post "skills in the cloud" is that skills *travel*. They are content, not code, and content is much easier to move than code.

**Distribution looks like packaging, not deployment.** A skill folder can be published the same way you'd publish an npm package. Other agents — running anywhere — pull it in. There's no build step, no compatibility matrix beyond "the SDK can read markdown." A grading skill authored by one team can be dropped into a tutoring agent built by another, and it just works.

**Iteration decouples from release.** In a cloud-deployed agent that loads skills from object storage at startup, a content edit is a config change. You can A/B-test two grading rubrics by giving two cohorts different versions of the same skill. You can roll back a behaviour change without touching the agent binary.

**Skills compose.** A single agent can have ten skills installed and only pay context cost for the ones the model invokes. A tutor agent might pull in `grade-csv`, `explain-mistake`, `summarize-feedback`, and `email-parent` — each independently authored, versioned, and testable. The agent code stays a thin shim: "here is the user's prompt; figure out which of these to use."

**Skills are reviewable.** A markdown file with a band table and a workflow is something a domain expert can read and edit. The teacher whose grading policy the skill encodes can open a pull request to change the rubric. The product manager can read the report template and ask for a new column. None of them would ever have edited a Python file full of f-string prompts.

---

## Separating Policy from Mechanism

If you step back far enough, the skill pattern is an old idea wearing new clothes. We've spent decades learning that mixing *policy* (what the system should do) with *mechanism* (how it does it) produces software nobody can safely change. Configuration files, plugin systems, declarative pipelines — all attempts to push policy out of code and into a shape that domain experts can touch.

Agents have been bad at this. The first generation of LLM applications were policy-mechanism casseroles: business rules in a system prompt, Python logic branching on model output, more rules in the comments of that same Python file. Behaviour and runtime were welded together.

The skill pattern unwelds them. The SDK is mechanism: tool dispatch, message loop, model calls, settings discovery. The skill is policy: when to fire, what rules to apply, what the output should look like. In `grade-agent` the seam is visible: `index.js` doesn't know what grading is; `SKILL.md` doesn't know what the SDK is. Each can be modified, tested, and reasoned about independently.

---

## Running It Locally

The full example is on GitHub. You'll need Node 18+ and an Anthropic API key.

```bash
git clone https://github.com/your-org/grade-agent.git
cd grade-agent
npm install
cp .env.example .env          # then set ANTHROPIC_API_KEY=sk-ant-...
```

There are three ways to run it, each showing a different property of the skill pattern.

**Run the agent end-to-end** — the LLM-driven path. A prompt goes to Claude, the SDK discovers the skill, and the model invokes it. After a few seconds you'll see a one-paragraph summary in your terminal and two new files in `data/output/`: a graded CSV with appended `_letter` and `_gpa` columns, and a markdown class report.

```bash
npm run grade

# or point it at your own data
node src/index.js \
  --input ./my-class.csv \
  --output ./my-class-graded.csv \
  --report ./my-class-report.md \
  --maxMark 50
```

**Run the skill directly** — no model, no tokens, no network calls. Because the skill is also a standalone CLI script, you can run it deterministically. Use this for batch jobs or CI pipelines where you want guaranteed reproducibility.

```bash
npm run skill:run
```

**Run the self-test** — the skill ships with a built-in test that verifies the band table is still well-formed, the templates still parse, and the deterministic path still produces the expected output. This is what makes the rules safe to change:

```bash
npm run skill:test
```

The fastest way to feel why the pattern matters is to try editing a rule. Open `.claude/skills/grade-csv/SKILL.md`, tighten the A range — say, change `93–100` to `95–100` — then run `npm run skill:test` to confirm it parses, and `npm run grade` to see the new rubric reflected in the output. You didn't touch `index.js`. You didn't redeploy anything.

---

## Conclusion

The skill pattern isn't magic, and it does carry honest tradeoffs. Skills work through natural language instructions to a model, so the model must be capable enough to follow them reliably. For a 30-row CSV against a 12-row band table, that's straightforward. For numerically intensive computation at scale, you'll want the skill to delegate to a script — which is exactly the pattern `grade-agent` supports via its `templates/` and script hooks.

You also have to write good descriptions. The model's matching is only as good as the front matter prose. A vague description will misfire; a specific one with concrete trigger phrases — like `grade-csv`'s "even if they don't say 'GPA' explicitly" — will catch how users actually phrase things.

Those caveats aside, the invitation is simple. Take any agent you've built that has rules embedded in its source code. Pull the rules into a `SKILL.md`. Move the templates into a `templates/` folder next to it. Replace the code that interprets those rules with a single `query({ skills: "all" })` call. Keep going until the only thing left in your agent file is plumbing.

Then look at how much smaller the agent got — and how much safer the skill is to change. That's what skills in the cloud actually buys you. And that's why a thirty-line `grade-agent` will outlive the three-thousand-line version every single time.
