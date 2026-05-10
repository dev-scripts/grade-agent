# grade-agent

A Node.js agent built on the Claude Agent SDK that grades a CSV of student
marks. The whole behaviour lives in a skill — `src/index.js` is just a thin
shim that hands the request to the SDK, which auto-discovers the skill from
`.claude/skills/`.

## Layout

```
grade-agent/
├── package.json
├── .env.example
├── data/
│   └── sample-marks.csv
├── .claude/
│   └── skills/
│       └── grade-csv/
│           ├── SKILL.md          # rules + output format + workflow (source of truth)
│           └── scripts/
│               └── grade.mjs     # bundled CLI; parses rules from SKILL.md
└── src/
    └── index.js                  # ~30 lines — just calls query()
```

## How the pieces fit

1. **`SKILL.md`** holds the band table, the graded-CSV column spec, and the
   report template. It's the only place rules live.
2. **`scripts/grade.mjs`** reads `SKILL.md` at startup, parses those three
   things out of it, and uses them to compute and write outputs.
3. **`src/index.js`** doesn't read SKILL.md, doesn't pick tools, doesn't
   build a system prompt. It calls `query()` with `settingSources:
   ["project"]` and `skills: "all"`; the SDK discovers the skill in
   `.claude/skills/grade-csv/` and Claude invokes it based on the
   description match.

## Setup

```bash
cd grade-agent
npm install
cp .env.example .env   # add ANTHROPIC_API_KEY
```

## Run

```bash
npm run grade
# or with custom paths:
node src/index.js --input mine.csv --output graded.csv --report report.md
```

## Use the skill without the LLM

The skill is a normal CLI too — handy for testing or deterministic batch
runs:

```bash
npm run skill:run     # grade the sample data
npm run skill:test    # run the script's built-in self-test
```

## Editing the rules

All rule changes are SKILL.md edits — nothing else needs to change:

- Edit the **band table** to change grading thresholds.
- Edit the **`graded-csv-spec` JSON block** to change CSV column shape.
- Edit the **`report-template` markdown block** to change report layout.

After a change, run `npm run skill:test` to confirm the parser still
accepts the file.
