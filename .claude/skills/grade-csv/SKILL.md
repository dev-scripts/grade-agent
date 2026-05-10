---
name: grade-csv
description: Calculate letter grades and 4.0-scale GPAs for students from a marks CSV, then produce a graded CSV and a markdown class report. Use this skill whenever the user asks to grade a CSV of marks, compute GPAs, build a report card, calculate class averages, or anything similar — even if they don't say "GPA" explicitly.
---

# Grade CSV

This skill turns a CSV of student marks into (1) a graded CSV with letter and
GPA columns appended and (2) a markdown class report.

**You (Claude) do all the computation directly.** Read the CSV with the Read
tool, compute grades using the band table below, and write both output files
with the Write tool. Do not run any external scripts.

## Inputs

The input CSV must have a header row.

- **Column 1** — student name or ID (any string).
- **Columns 2..N** — subject marks. Numeric. Default per-subject maximum is
  100; if the user specifies a different max, use that value throughout.

Missing or non-numeric cells are skipped when computing a student's average.
The original cell value is preserved in the graded CSV; the corresponding
`_letter` and `_gpa` columns are left blank.

## Grading scale (4.0 GPA, unweighted)

Use this table to assign letter grades and GPA values. Match the highest band
whose minimum the percentage meets or exceeds. The `< 60` row is the
catch-all for anything below 60.

| Percentage | Letter | GPA  |
|------------|--------|------|
| 93–100     | A      | 4.0  |
| 90–92      | A-     | 3.7  |
| 87–89      | B+     | 3.3  |
| 83–86      | B      | 3.0  |
| 80–82      | B-     | 2.7  |
| 77–79      | C+     | 2.3  |
| 73–76      | C      | 2.0  |
| 70–72      | C-     | 1.7  |
| 67–69      | D+     | 1.3  |
| 63–66      | D      | 1.0  |
| 60–62      | D-     | 0.7  |
| < 60       | F      | 0.0  |

The **overall** letter and GPA for a student come from looking up their
**arithmetic mean of subject percentages** in the same table — not by
averaging the per-subject GPA points. Averaging percentages is more faithful
to underlying performance since GPA points are non-linear.

## Workflow

Follow these steps in order when the user asks to grade a CSV.

### 1. Confirm paths

If the user did not specify output paths, default to `data/output/graded.csv` and
`data/output/report.md` placed next to the input file.

### 2. Read the CSV

Use the Read tool on the input path.

### 3. Compute grades

- **Row 0** is the header. Column 0 is the name column; columns 1..N are
  subject columns.
- For each student row:
  - For each subject column: `percentage = (mark / maxMark) * 100`. If the
    cell is empty or non-numeric, mark it as missing for this student.
  - Look up the letter and GPA for each percentage in the band table above.
  - `average = sum of valid percentages / count of valid subjects`, rounded
    to 2 decimal places. If every subject is missing, average = 0.
  - Look up the overall letter and GPA for the average.
- Compute class stats:
  - `mean_average` = mean of all students' averages, rounded to 2 decimal places.
  - `mean_gpa` = mean of all students' overall GPA values, rounded to 2 decimal places.
  - `distribution` = count of students per letter grade.

### 4. Write the graded CSV

Read `.claude/skills/grade-csv/templates/graded.template.md` and follow its
layout exactly. Use the Write tool to produce the output.

### 5. Write the markdown report

Read `.claude/skills/grade-csv/templates/report.template.md`, substitute every
`{{placeholder}}` with the computed value (see the placeholder reference in
that file), and write it with the Write tool.

### 6. Report to the user

Reply with a one-paragraph summary: students graded, mean average, mean GPA,
grade distribution, and the paths where the two files were written.

## Edge cases

- **Empty CSV / header-only CSV** — tell the user and stop; do not write
  empty output files.
- **Non-numeric mark** — skip that cell for the student's average; preserve
  the original value in the graded CSV with blank `_letter` / `_gpa` cells.
- **All marks missing for a student** — their average is 0, which falls in
  the F band.
- **Custom max mark** — use the user-specified value in place of 100 in the
  percentage formula; the band table itself is unchanged.
