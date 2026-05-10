# Graded CSV Column Template

Columns are dynamic — expand the per-subject block for every subject in the input.

## Header pattern

```
{name},{subject},{subject}_letter,{subject}_gpa,...,average,overall_letter,overall_gpa
```

## Per-subject columns (repeated for each subject)

| Column | Value |
|--------|-------|
| `{subject}` | Original mark value (preserved as-is; blank if missing) |
| `{subject}_letter` | Letter grade for this subject (blank if mark is missing) |
| `{subject}_gpa` | GPA point for this subject (blank if mark is missing) |

## Trailing columns (appended once, after all subjects)

| Column | Value |
|--------|-------|
| `average` | Arithmetic mean of subject percentages, 2 decimal places |
| `overall_letter` | Letter grade looked up from `average` |
| `overall_gpa` | GPA point looked up from `average` |

## Example

Input columns: `name, math, science`

Output header:
```
name,math,math_letter,math_gpa,science,science_letter,science_gpa,average,overall_letter,overall_gpa
```

Example data row:
```
Alice,95,A,4.0,88,B+,3.3,91.50,A-,3.7
```
