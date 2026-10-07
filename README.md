# TailorCV

**Paste a job posting, get your resume rewritten for that job, and export it as a
one-page PDF.** Two ways to run it, sharing one idea: the job decides what your resume
leads with.

<p>
<img src="engine/.github/previews/dark-sidebar-accent.png" width="32%" alt="dark-sidebar-accent template">
<img src="engine/.github/previews/editorial-serif-sidebar.png" width="32%" alt="editorial-serif-sidebar template">
<img src="engine/.github/previews/bold-two-column-timeline.png" width="32%" alt="bold-two-column-timeline template">
</p>

| | [`engine/`](engine) | [`app/`](app) |
|---|---|---|
| **What** | CLI plus native Claude Code and Hermes Agent skills | Mobile app (iOS, Android, web) |
| **Tailoring** | A local Ollama model. Your resume never leaves the machine | Groq `llama-3.3-70b`, called from a Supabase Edge Function so no key ships in the app |
| **Designs** | 9 templates, any accent colour, auto-fit to exactly one printed page | 5 presets |
| **Stack** | Node 18+, Playwright for the PDF | Expo SDK 56, React Native, TypeScript, Supabase |
| **Start** | `cd engine && node bin/tailor.js --help` | `cd app && npm install && npx expo start` |

Each folder has its own README with full setup.

## Why two

The engine came first: a design-and-tailoring core that runs from a terminal or inside an
agent, for people who would rather not upload a resume anywhere. The app puts the same
workflow on a phone for people who will never open a terminal. They share the approach
(tailor the content to the posting, then fit it to one page), not code: the app's renderer
is React Native, the engine's is HTML and Playwright.

## License

MIT, see [LICENSE](LICENSE). Built by [Dime Data](https://dimedata.cloud).
