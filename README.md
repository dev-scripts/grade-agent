# grade-agent

A Node.js agent built on the Claude Agent SDK that grades a CSV of student
marks. The whole behaviour lives in a skill — `src/index.js` is a thin shim
that hands the request to the SDK, which auto-discovers the skill from
`.claude/skills/`.

## Layout

```
grade-agent/
├── package.json
├── .env.example
├── data/
│   └── sample-marks.csv        # sample input
├── output/                     # generated on first run
│   ├── graded.csv
│   └── report.md
├── .claude/
│   └── skills/
│       └── grade-csv/
│           ├── SKILL.md        # grading rules + workflow (source of truth)
│           └── templates/
│               ├── graded.template.md   # CSV column layout spec
│               └── report.template.md  # markdown report skeleton
└── src/
    └── index.js                # ~30 lines — just calls query()
```

## How the pieces fit

1. **`SKILL.md`** holds the grading band table and the step-by-step workflow.
   It's the only place grading rules live.
2. **`templates/graded.template.md`** defines the output CSV column layout —
   per-subject `_letter` / `_gpa` columns followed by `average`,
   `overall_letter`, and `overall_gpa`.
3. **`templates/report.template.md`** is the markdown report skeleton with
   `{{students}}`, `{{mean_average}}`, `{{distribution_table}}`, and
   `{{students_table}}` as substitution placeholders.
4. **`src/index.js`** doesn't read any of those files directly. It calls
   `query()` with `skills: "all"`; the SDK discovers the skill and Claude
   invokes it based on the description match in `SKILL.md`'s front matter.

## Setup

Requires Node 18+.

```bash
npm install
cp .env.example .env   # set ANTHROPIC_API_KEY=sk-ant-...
```

## Run

```bash
# grade the bundled sample data
npm run grade

# or point at your own CSV
node src/index.js \
  --input  path/to/marks.csv \
  --output path/to/graded.csv \
  --report path/to/report.md \
  --maxMark 50          # optional; defaults to 100
```

Output defaults (when called directly without flags):
- graded CSV → `data/output/graded.csv`
- markdown report → `data/output/report.md`

## Editing the rules

All rule changes go in the skill folder — nothing in `src/` needs to change.

| What to change | Where |
|---|---|
| Grading thresholds (A, B+, etc.) | Band table in `SKILL.md` |
| Output CSV column layout | `templates/graded.template.md` |
| Report structure / sections | `templates/report.template.md` |
