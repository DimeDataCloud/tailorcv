---
level: 2
name: resume-tailor
version: 1.0.0
description: |
  Tailor a resume to a specific job posting (or just re-theme it) and export
  a print-ready, single-page PDF, using the resume-tailor-skill CLI. Optional
  AI tailoring rewrites the summary/bullets/skills to match a job description
  (optionally calibrated to a company's brand voice) via a local Ollama
  model; the design layer always works standalone. Picks from 9
  self-contained HTML templates, each themed off one --accent color, or
  author a brand-new one from a description/reference image via the
  --custom-template contract.
triggers:
  - "tailor my resume"
  - "tailor a resume for this job"
  - "resume for [job posting]"
  - "build me a resume"
  - "change my resume template"
  - "change my resume color"
  - "resume-tailor"
tools:
  - Read
  - Write
  - Bash
mutating: true
type: skill
---

# Resume Tailor (Claude Code)

## What this skill wraps

This skill is a thin conversational front-end over the `resume-tailor-skill`
CLI (`bin/tailor.js` in this repo). All resume logic — the 9 templates, the
auto-fit single-page PDF export, the optional Ollama tailoring step — lives
in plain Node.js under `core/`, not in this file. Your job is to gather
inputs from the user, shell out to the CLI, and report results back clearly.

## No-CLI option

If the user just wants a plain, fillable file (no AI tailoring, no Node,
nothing to install) — point them at `templates/<name>.html` instead of
running the pipeline. Each is the same design as its `core/render.js`
counterpart with `{{token}}` placeholders in place of real data; you can
also fill those tokens in yourself directly (via Read + Edit) if the user
hands you their info in this conversation rather than wanting to hand-edit
the file themselves.

## Prerequisites (check once per repo clone)

- Node.js 18+
- `npm install playwright && npx playwright install chromium` inside the repo
  — only required for PDF export. If missing, the CLI still produces the
  HTML file and prints a clear message; tell the user that instead of
  failing silently.
- Ollama running locally (`ollama serve` + a pulled model like `gemma3`) —
  only required if the user wants AI-tailored content for a specific job.
  Without it, the skill still works: it renders the resume's existing
  content through the chosen template untouched.

## Phases

1. **Get the resume data.** Ask for (or read from a file the user points to)
   a resume in the schema documented in `examples/example-resume.json`:
   `name, title, email, phone, linkedin, location, skills[], tools[],
   education, languages[], summary, workHistory[{title,company,location,
   dates,bullets}], extraSections[]`. If the user has a resume in a
   different shape (a .docx, a plain-text dump, prior conversation), convert
   it into this JSON schema yourself and write it to a file — don't invent
   content that isn't in their source.

2. **Ask whether this is job-specific or general-purpose.**
   - If they have a target job posting: ask for the job description (paste,
     file, or URL), the company name, and the role title.
   - Also ask (don't assume) whether they want the rewrite to match the
     company's own brand voice — a mission statement, About page, or just
     "make it sound like their careers page." If they have that text, pass
     it via `--company-info`/`--company-info-file`; if not, the tailoring
     still infers tone from the job description's own wording, so it's
     optional, not blocking.
   - If they just want a themed resume rendered as-is (no AI rewrite): skip
     straight to template/color selection and pass `--no-ai`.

3. **Pick the template.** List the 9 options below (or point to
   `README.md`'s gallery table) and confirm rather than picking silently
   unless the user names one directly. If none of the 9 fit what they want
   — they describe a specific look in words, or hand you a reference
   (screenshot, existing HTML, a link to a design they like) — go to Phase
   3a instead of forcing one of the built-ins.

3a. **Custom template (only if Phase 3 didn't land on a built-in).** Write a
   new template file yourself, following
   `examples/custom-template.example.js`'s contract exactly:
   - Export `{ render(model), defaultAccent }` from a `.js` file.
   - `render(model)` returns a full HTML document. The root resume element
     must be `.resume`, its CSS rule opening with the literal substring
     `.resume {` (a hard requirement — the auto-fit engine in `core/pdf.js`
     persists its fitted font size by string-replacing exactly that
     substring), sized `width: 816px`, with `font-size: var(--base, 10px)`
     and every nested size in `em` so the auto-fit binary search actually
     works.
   - `model`'s shape is fixed (see the example file's header comment) —
     don't invent new fields; map the user's design onto the fields that
     exist (name, title, contact info, summary, skills, tools, education,
     languages, workHistory, extraSections).
   - If working from a reference image, read/view it first and describe
     the layout back to the user before writing code, so you're building
     the design they actually meant.
   - Save the file (e.g. `custom-templates/<slug>.js`, creating that folder
     if needed) and pass it to the CLI as `--custom-template <path>` in
     place of `--template`/`--accent` in the next step. The CLI warns (but
     doesn't fail) if the `.resume {` contract is missed — treat that
     warning as something to fix, not ignore.

4. **Pick the accent color** (skip if a custom template already set one).
   Always ask for a hex value or a color name you can resolve to hex —
   never assume one. Each built-in template has its own tasteful default if
   the user has no preference.

5. **Run the CLI** via Bash:
   ```
   node bin/tailor.js --resume <path.json> \
     [--jd <file> | --url <url> | --text "<pasted JD>"] \
     [--company "<name>" --title "<role>"] \
     [--company-info "<brand voice text>" | --company-info-file <file>] \
     [--template <name> --accent "<#hex>" | --custom-template <path.js>] \
     [--no-ai] [--out <dir>]
   ```
   Read the CLI's stdout — it reports which template/accent were used, the
   auto-fit font size, and the output paths (or a clear reason PDF export
   was skipped). Don't re-derive this yourself; relay what the tool printed.

6. **Report back:**
   - The HTML and PDF file paths.
   - That Print → Save as PDF (margins "None") is a fine manual alternative
     if the user wants to re-export after hand-editing the HTML — but the
     CLI's own PDF is already the finished, single-page-fitted deliverable.
   - Which template and accent were used, so future re-runs are easy.

## Template Gallery

| Template | Look |
|---|---|
| `dark-sidebar-accent` (default) | Dark navy sidebar, accent-colored labels/rules |
| `editorial-serif-sidebar` | Monochrome, serif name, framed initials badge |
| `bold-two-column-timeline` | Pill-tag skills, circle-marker experience timeline |
| `modern-accent-photo-header` | "Hello, I'm..." header, 3-column experience row |
| `bold-poster-statement` | Oversized outline-type headline, cream background |
| `handwritten-highlight-creative` | Graph-paper background, highlighter-marker headings |
| `playful-retro-window` | OS-window chrome, dotted education timeline |
| `warm-spotlight-poster` | Warm radial spotlight, oversized poster headline, translucent cards |
| `paper-id-card` | Paper sheet on a dark desk, clipped ID-card header, handwritten highlights |

## Anti-Patterns

- Do not invent job history, skills, or bullets not present in the source
  resume data — the AI tailoring step may only *rewrite/reorder* existing
  content, never fabricate new roles or metrics (the CLI's prompt already
  enforces no invented numbers/percentages/dollar amounts).
- Do not let company-info/brand-voice context become fabricated claims —
  it may only shift tone/word choice, never invent a relationship to the
  company, its products, or its culture that isn't already true.
- Do not hand-roll a one-off HTML design outside the 9-template gallery
  unless the user explicitly asks for something fully custom — and when you
  do, always go through the `--custom-template` contract (Phase 3a), never
  a design that skips the `.resume {816×1056px, var(--base,10px), em-sized}`
  contract, or auto-fit/PDF export silently breaks for that one file.
- Do not silently pick a template, accent, or job/no-job mode — all three
  are one-question confirmations.
- Do not claim a PDF was produced if the CLI reported PDF export was
  skipped (missing Playwright browser binary) — relay that limitation and
  the fix command instead.
