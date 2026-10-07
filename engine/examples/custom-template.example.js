// examples/custom-template.example.js — a starter contract for --custom-template.
//
// Copy this file, rename it, and rewrite render() to match whatever design
// was described to you or handed to you as a reference. Point the CLI at it:
//
//   node bin/tailor.js --custom-template my-custom-design.js --accent "#7c3aed"
//
// The rest of the pipeline (AI tailoring, single-page auto-fit, PDF export)
// works with this exactly like it works with the 9 built-in templates in
// core/render.js, because it's the same contract:
//
// 1. Export { render(model), defaultAccent }. `render(model)` must return a
//    complete HTML document string.
// 2. The root element that holds the resume content MUST be a `.resume` div
//    whose CSS rule opens with the literal substring `.resume {` (note the
//    single space before the brace) — core/pdf.js persists the auto-fit
//    font size by string-replacing that exact substring. Getting this wrong
//    doesn't break the PDF, only the saved .html file's fitted size.
// 3. That `.resume` element must be sized `width: 816px` and support
//    `height` being toggled between `auto` and `1056px` by the auto-fit
//    step — in practice this just means: don't hardcode height in a way
//    that fights inline style overrides, and set
//    `font-size: var(--base, 10px)` on it with every nested size in `em`,
//    so the auto-fit's binary search actually changes the rendered size.
// 4. `model` is the same shape core/render.js's buildModel() produces:
//    { accent, name, initials, title, phone, email, location, linkedin,
//      summary, skills: [string], tools: [string], education: string,
//      languages: [string],
//      workHistory: [{ title, company, location, dates, bullets: [string] }],
//      extraSections: [{ title, items: [string] }] }

function render(m) {
  const workHtml = m.workHistory.map(w => `
        <section class="job">
          <h3>${w.title} — ${w.company}</h3>
          <div class="dates">${w.dates}</div>
          <ul>${w.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
        </section>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${m.name} — Resume</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { background: #dde3eb; display: flex; justify-content: center; padding: 36px 20px; font-family: Arial, sans-serif; }
  @media print { body { background: #fff; padding: 0; } .resume { box-shadow: none !important; } }

  .resume {
    width: 816px; height: 1056px; overflow: hidden; flex-shrink: 0;
    background: #fff; box-shadow: 0 10px 50px rgba(0,0,0,0.2);
    font-size: var(--base, 10px);
    padding: 2.4em;
    border-top: 6px solid ${m.accent};
  }
  h1 { font-size: 2.2em; margin-bottom: 0.2em; }
  .role { color: ${m.accent}; font-weight: 700; font-size: 1.1em; margin-bottom: 1em; }
  .contact { font-size: 0.9em; color: #444; margin-bottom: 1.4em; }
  h2 { font-size: 1.15em; border-bottom: 2px solid ${m.accent}; padding-bottom: 0.3em; margin: 1em 0 0.7em; }
  .job h3 { font-size: 1em; }
  .job .dates { font-size: 0.85em; color: #666; margin-bottom: 0.4em; }
  .job ul { padding-left: 1.2em; font-size: 0.9em; }
  .job li { margin-bottom: 0.3em; }
</style>
</head>
<body>
  <div class="resume">
    <h1>${m.name}</h1>
    <div class="role">${m.title}</div>
    <div class="contact">${m.phone} · ${m.email} · ${m.location}</div>
    <p>${m.summary}</p>
    <h2>Experience</h2>
${workHtml}
    <h2>Skills</h2>
    <p>${m.skills.join(', ')}</p>
  </div>
</body>
</html>`;
}

module.exports = { defaultAccent: '#7c3aed', render };
