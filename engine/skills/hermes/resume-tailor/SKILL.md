---
name: resume-tailor
description: "Use when the user asks to tailor a resume for a job, re-theme/re-color an existing resume, generate a print-ready single-page resume PDF from structured resume data, or wants a custom resume design built from a description or reference image. Wraps the resume-tailor-skill CLI: 9 self-contained HTML design templates (one --accent variable each) plus a --custom-template contract for agent-authored designs, an optional local-Ollama AI tailoring step that rewrites summary/bullets/skills to match a job description (optionally calibrated to a company's brand voice), and a Playwright auto-fit PDF export that guarantees exactly one US Letter page."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [resume, cv, job-search, tailoring, ai, ollama, pdf, templates]
    related_skills: [tailorcv, job-auto-apply]
---

# Resume Tailor

CLI-driven resume design + AI tailoring tool. Renders structured resume data
through one of 9 print-ready HTML templates and exports a single-page PDF.
AI tailoring (rewriting content to match a specific job posting) is optional
and runs entirely on a local Ollama model — no cloud API required.

Source: https://github.com/DimeDataCloud/tailorcv/tree/main/engine

## When to Use

- User says "tailor my resume for this job", "change my resume design",
  "make my resume [color]", "give me a resume PDF"
- User wants to match a resume to a specific job description without any
  cloud AI dependency (Ollama runs locally)
- User wants one of the 9 design presets or a custom accent color

Don't use for: full job-application auto-submission (see `job-auto-apply`),
the Expo/React Native TailorCV mobile app (see `tailorcv` — a different,
unrelated project despite the similar name), cover letters (not built).

## Architecture

Plain Node.js, no framework. Three modules under `core/`, one CLI entry
point under `bin/`:

| Module | Purpose |
|---|---|
| `core/render.js` | The 9 template renderers + `buildModel()` + `TEMPLATES` registry |
| `core/ai.js` | Optional Ollama call: prompt-builds, calls `/api/generate`, repairs truncated/malformed JSON from small local models |
| `core/select.js` | Trims a large multi-job resume pool down to the ~4 most relevant roles for a given job description |
| `core/pdf.js` | Playwright: binary-searches a `--base` font size so content fills exactly one Letter page, then exports the PDF |
| `bin/tailor.js` | CLI orchestrator — the only thing this skill needs to shell out to |

## Running It

```bash
# Just render a themed resume, no AI, no specific job:
node bin/tailor.js --resume my-resume.json --template editorial-serif-sidebar --accent "#0f766e" --no-ai

# Tailor to a specific job posting:
node bin/tailor.js --resume my-resume.json --jd job-posting.txt \
  --company "Acme Corp" --title "Account Executive" \
  --template dark-sidebar-accent --accent "#0076CE"

# Also calibrate to the company's brand voice (mission statement, About page, tone):
node bin/tailor.js --resume my-resume.json --jd job-posting.txt \
  --company "Acme Corp" --title "Account Executive" \
  --company-info-file acme-about-page.txt

# See all templates + their default accents:
node bin/tailor.js --list-templates

# Bring your own design instead of the 9 built-ins:
node bin/tailor.js --custom-template my-design.js --accent "#7c3aed"
```

Resume data schema: see `examples/example-resume.json`. Fields: `name,
title, email, phone, linkedin, location, skills[], tools[], education,
languages[], summary, workHistory[{title,company,location,dates,bullets}],
extraSections[]`.

## The Workflow

1. Collect or convert the user's resume into the JSON schema above — never
   invent job history, skills, or bullets that aren't in their source data.
2. Ask whether this render is job-specific (AI tailoring) or general
   (`--no-ai`). If job-specific, get the JD (paste/file/URL), company, role.
   Also ask if they want the rewrite to match the company's brand voice
   (mission statement, About page, careers-page tone) — pass it via
   `--company-info`/`--company-info-file` if they have it; it's optional,
   the model still infers tone from the JD itself if they don't.
3. Confirm template + accent color rather than assuming — list the 9-option
   gallery below. If none of the 9 fit (the user describes a specific look
   or hands you a reference design/screenshot), author a custom template
   instead — see "Custom Templates" below — rather than forcing a built-in.
4. Run `bin/tailor.js` with the assembled flags.
5. Report the printed output paths (HTML always produced; PDF produced
   unless Playwright's browser binary isn't installed, in which case the
   CLI prints the exact fix command — relay that, don't just say "it
   failed").

## Design Presets (9 templates)

| Template | Look | Default Accent |
|---|---|---|
| `dark-sidebar-accent` | Dark navy sidebar, accent-colored labels/rules | `#0076CE` |
| `editorial-serif-sidebar` | Monochrome, serif name, framed initials badge | `#111111` |
| `bold-two-column-timeline` | Pill-tag skills, circle-marker experience timeline | `#2b3fe0` |
| `modern-accent-photo-header` | "Hello, I'm..." header, 3-column experience row | `#d6342c` |
| `bold-poster-statement` | Oversized outline-type headline, cream background | `#d9622b` |
| `handwritten-highlight-creative` | Graph-paper background, highlighter-marker headings | `#f5e14a` |
| `playful-retro-window` | OS-window chrome, dotted education timeline | `#2f6fed` |
| `warm-spotlight-poster` | Warm radial spotlight, oversized poster headline, translucent cards | `#d8b25f` |
| `paper-id-card` | Paper sheet on a dark desk, clipped ID-card header, handwritten highlights | `#fbd934` |

All 9 skip photos entirely (initials monogram/tile instead) since this tool
is meant to run unattended — there's no one to prompt for a photo mid-run.

## No-CLI Option

For a user who just wants a fillable file with no Node/CLI involved at
all, use `templates/<name>.html` instead of `bin/tailor.js` — same 9
designs, `{{token}}` placeholders instead of real data, a comment block at
the top of each file explains the fill-in-and-duplicate-job-blocks
convention. You can also fill those tokens in directly yourself if the
user gives you their info in-conversation.

## Custom Templates

When the user describes a design the 9 built-ins don't cover, or hands you
a reference (screenshot, existing HTML, a link), write a new template file
yourself — don't force one of the 9 to fit:

1. Copy `examples/custom-template.example.js` and follow its contract
   exactly: export `{ render(model), defaultAccent }`; the root `.resume`
   element's CSS rule must open with the literal substring `.resume {`
   (required for `core/pdf.js`'s auto-fit persistence), sized
   `width: 816px`, `font-size: var(--base, 10px)`, every nested size in
   `em`. `model`'s shape is fixed — map the requested design onto the
   existing fields (name, title, contact, summary, skills, tools,
   education, languages, workHistory, extraSections) rather than inventing
   new ones.
2. If working from an image/screenshot, describe the layout back to the
   user before writing code, to confirm you understood the reference
   correctly.
3. Save the file (e.g. `custom-templates/<slug>.js`) and run the CLI with
   `--custom-template <path>` instead of `--template`/`--accent`. The CLI
   warns (doesn't fail) if the `.resume {` contract is missed — treat that
   as a bug to fix in the file, not something to ignore.

## AI Tailoring Pipeline (optional)

- Sends only summary/bullets/skills/title to the LLM — never asks it to
  restructure work history (titles/companies/dates come straight from the
  master resume). Keeps output under ~2K tokens, avoiding truncation on
  small local models.
- Hard rule enforced in the prompt: no numbers, metrics, percentages, or
  dollar amounts anywhere except dates — prevents fabricated statistics.
- Optional `--company-info`/`--company-info-file` (mission statement, About
  page, brand tone notes) calibrates word choice/formality only — the
  prompt explicitly forbids copying it verbatim or inventing any claim
  about the candidate's relationship to the company. Without it, tone is
  still inferred from the job description's own wording.
- `core/ai.js`'s `parseJSON()` repairs the most common small-model JSON
  failures in order: strip markdown fences → escape raw newlines inside
  string literals → close unclosed brackets/braces → strip trailing commas.
  If all repairs fail, the CLI logs a warning and falls back to rendering
  the resume untailored rather than crashing.

## Common Pitfalls

1. **No Ollama running.** `--jd`/`--url`/`--text` without `ollama serve`
   running will time out after 300s, then fall back to untailored
   rendering with a warning — not a crash. Tell the user to start Ollama
   if they expected AI tailoring to actually run.

2. **Playwright browser binary missing.** `npm install playwright` alone
   does not download Chromium. The CLI catches this and prints
   `npx playwright install chromium` — relay that exact command, don't
   just report a generic failure.

3. **JS-rendered job boards.** `--url` uses a plain HTTP GET + tag-strip
   (no headless browser) for portability, so heavily JS-rendered job
   boards (LinkedIn, some ATS pages) may return mostly boilerplate. Prefer
   `--jd <file>` or `--text "..."` (copy-pasted description) for those.

4. **`.resume {` literal string dependency.** `core/pdf.js` persists the
   auto-fit font size by string-replacing the literal substring
   `.resume {` in the rendered HTML. If you ever add a 10th template,
   its root CSS rule must open with exactly that substring or the fitted
   size silently fails to persist into the saved `.html` file (the PDF
   itself would still be correct — only the saved HTML would revert to
   the unfitted default).

## Verification Checklist

- [ ] `node bin/tailor.js --list-templates` prints all 9 templates
- [ ] `node bin/tailor.js --no-ai --no-pdf` (no other flags) renders the
      bundled example resume without error
- [ ] Ollama running + `--jd`/`--text` produces tailored content that
      still contains zero fabricated numbers/metrics
- [ ] PDF export produces exactly one Letter page (check the console's
      `Auto-fit base font: Xpx (content Ypx / 1056px page)` line — Y should
      be ≤ 1038)
