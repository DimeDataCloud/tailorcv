// core/render.js — the design engine: 9 self-contained HTML resume templates,
// each themed off a single --accent color, all sharing one auto-fit contract
// (see core/pdf.js): a .resume element at 816x1056px (US Letter @ 96dpi) with
// font-size:var(--base,10px) and every nested size in em.

function initialsOf(name) {
  return (name || '').split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join('');
}

// Build the shared view-model every template renders from.
// `tailored` = AI-rewritten fields (title/summary/skills/bullets), may be {} if unused.
// `master`   = the full resume record (see examples/example-resume.json for the schema).
function buildModel(tailored, master, opts) {
  opts = opts || {};
  const templateName = opts.template || 'dark-sidebar-accent';
  const known = TEMPLATES[templateName];
  // Unregistered template names are allowed as long as the caller supplies
  // an accent directly — this is the custom-template path (see bin/tailor.js
  // --custom-template), where the "template" is a user/agent-authored render
  // function that never gets added to the TEMPLATES registry.
  if (!known && !opts.accent) {
    throw new Error(`Unknown template "${templateName}". Available: ${Object.keys(TEMPLATES).join(', ')}`);
  }
  const accent = opts.accent || known.defaultAccent;
  const workHistory = master.workHistory.map((w, i) => {
    const bulletText = tailored.bullets && tailored.bullets[i] ? tailored.bullets[i] : w.bullets;
    const bullets = bulletText.split('\n').map(b => b.trim().replace(/^[-*•]\s*/, '')).filter(Boolean);
    return { title: w.title, company: w.company, location: w.location || '', dates: w.dates, bullets };
  });
  return {
    template: templateName,
    accent,
    name: master.name,
    initials: initialsOf(master.name),
    title: tailored.title || master.title,
    phone: master.phone,
    email: master.email,
    location: master.location,
    linkedin: master.linkedin,
    summary: tailored.summary || master.summary,
    skills: tailored.skills || master.skills,
    tools: master.tools || [],
    education: master.education,
    languages: master.languages || [],
    workHistory,
    extraSections: master.extraSections || [],
  };
}

function liList(items) { return items.map(i => `<li>${i}</li>`).join('\n'); }

// Shared CSS every template includes: the auto-fit contract. .resume MUST be
// 816x1056px (Letter @ 96dpi) with font-size:var(--base,10px) and every
// nested size in em — the binary-search auto-fit in core/pdf.js resizes
// --base until content fills one page, then persists the fitted value by
// string-replacing the literal ".resume {" rule, so every template's root
// rule must open with exactly that substring.
const PRINT_RESET = `* { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { background: #dde3eb; display: flex; justify-content: center; padding: 36px 20px; }
  @media print { body { background: #fff; padding: 0; } .resume { box-shadow: none !important; } }`;

// ── 1. dark-sidebar-accent — dark navy sidebar, accent-colored labels/rules ──
function renderDarkSidebarAccent(m) {
  const workHtml = m.workHistory.map(w => `        <div class="job">
          <div class="job-title">${w.title}</div>
          <div class="job-company">${w.company} — ${w.dates}</div>
          <ul class="job-bullets">\n${liList(w.bullets)}\n          </ul>
        </div>`).join('\n');
  const extra = m.extraSections.map(sec => `      <div class="section-header">${sec.title}</div>\n      <ul class="extra-items">\n${liList(sec.items)}\n      </ul>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${m.name} — Resume</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  ${PRINT_RESET}
  body { font-family: 'Inter', Arial, sans-serif; }
  .resume { display: flex; flex-shrink: 0; width: 816px; height: 1056px; overflow: hidden; background: #ffffff; box-shadow: 0 10px 50px rgba(0,0,0,0.2); border-top: 5px solid ${m.accent}; font-size: var(--base, 10px); }
  .left { width: 248px; min-width: 248px; background: #0D2137; padding: 2.2em 1.8em 0.8em; display: flex; flex-direction: column; }
  .left-name { font-size: 2.3em; font-weight: 800; color: #ffffff; letter-spacing: 1.5px; text-transform: uppercase; line-height: 1.2; }
  .left-role { font-size: 1.05em; font-weight: 600; color: ${m.accent}; letter-spacing: 2px; text-transform: uppercase; margin-top: 0.7em; }
  .left-divider { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1.4em 0; }
  .section-label { font-size: 0.9em; font-weight: 700; color: ${m.accent}; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 0.8em; }
  .contact-item { font-size: 0.95em; color: rgba(255,255,255,0.85); margin-bottom: 0.5em; line-height: 1.4; word-break: break-word; }
  .skills-list { list-style: none; }
  .skills-list li { font-size: 0.95em; color: rgba(255,255,255,0.85); margin-bottom: 0.5em; line-height: 1.3; padding-left: 1em; position: relative; }
  .skills-list li::before { content: '\\25AA'; position: absolute; left: 0; color: ${m.accent}; }
  .right { flex: 1; padding: 2.2em 2.4em; display: flex; flex-direction: column; }
  .summary { font-size: 1em; color: #333; line-height: 1.5; margin-bottom: 1.6em; }
  .section-header { font-size: 1.2em; font-weight: 700; color: #0D2137; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid ${m.accent}; padding-bottom: 0.4em; margin-bottom: 1.2em; }
  .job { margin-bottom: 1.4em; }
  .job-title { font-size: 1.1em; font-weight: 700; color: #0D2137; }
  .job-company { font-size: 0.95em; font-weight: 500; color: #555; margin-bottom: 0.5em; }
  .job-bullets { list-style: none; padding-left: 0; }
  .job-bullets li { font-size: 0.95em; color: #333; line-height: 1.4; margin-bottom: 0.4em; padding-left: 1.2em; position: relative; }
  .job-bullets li::before { content: '\\2022'; position: absolute; left: 0; color: ${m.accent}; }
  .extra-items { list-style: none; padding-left: 0; }
  .extra-items li { font-size: 0.95em; color: #333; line-height: 1.4; margin-bottom: 0.6em; padding-left: 1.2em; position: relative; }
  .extra-items li::before { content: '\\2022'; position: absolute; left: 0; color: ${m.accent}; }
</style>
</head>
<body>
  <div class="resume">
    <div class="left">
      <div class="left-name">${m.name}</div>
      <div class="left-role">${m.title}</div>
      <hr class="left-divider">
      <div class="section-label">Contact</div>
      <div class="contact-item">${m.phone}</div>
      <div class="contact-item">${m.email}</div>
      <div class="contact-item">${m.location}</div>
      <div class="contact-item">${m.linkedin}</div>
      <hr class="left-divider">
      <div class="section-label">Core Skills</div>
      <ul class="skills-list">\n${liList(m.skills)}\n      </ul>
      <hr class="left-divider">
      <div class="section-label">Technology</div>
      <ul class="skills-list">\n${liList(m.tools)}\n      </ul>
      <hr class="left-divider">
      <div class="section-label">Education</div>
      <div class="contact-item">${m.education}</div>
    </div>
    <div class="right">
      <div class="section-header">Professional Summary</div>
      <div class="summary">${m.summary}</div>
      <div class="section-header">Professional Experience</div>
${workHtml}
      ${extra}
    </div>
  </div>
</body>
</html>`;
}

// ── 2. editorial-serif-sidebar — monochrome, framed initials badge, serif+sans pairing ──
function renderEditorialSerifSidebar(m) {
  const workHtml = m.workHistory.map(w => `      <div class="exp-item">
        <div class="role">${w.title}</div>
        <div class="meta">${w.company} — ${w.dates}</div>
        <ul>\n${liList(w.bullets)}\n        </ul>
      </div>`).join('\n');
  const langHtml = m.languages.map(l => `<div class="lang-item">${l}</div>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${m.name} — Resume</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
  ${PRINT_RESET}
  body { font-family:'Inter',Arial,sans-serif; }
  .resume { display:grid; grid-template-columns:200px 1fr; flex-shrink:0; width:816px; height:1056px; overflow:hidden; background:#fff; box-shadow:0 10px 50px rgba(0,0,0,0.2); font-size:var(--base,10px); }
  .sidebar { border-right:2px solid #111; padding:2.4em 1.4em 2.4em 1.6em; overflow:hidden; }
  .sidebar h3 { font-family:'Playfair Display',serif; font-size:1.1em; font-weight:700; margin:0 0 0.6em; }
  .sidebar section { margin-bottom:1.7em; font-size:0.9em; color:#4a4a4a; }
  .initials-badge { width:64px; height:64px; border-radius:50%; background:#111; color:#fff; display:flex; align-items:center; justify-content:center; font-family:'Playfair Display',serif; font-size:1.6em; margin-bottom:1.2em; }
  .contact-item { margin-bottom:0.6em; overflow-wrap:anywhere; word-break:break-word; display:flex; align-items:flex-start; gap:0.6em; color:#333; }
  .icon-badge { flex-shrink:0; width:1.7em; height:1.7em; border-radius:50%; background:${m.accent}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.85em; margin-top:0.05em; }
  .sidebar ul { margin:0; padding-left:1.1em; }
  .sidebar li { margin-bottom:0.3em; }
  .main { padding:2.4em 2.2em; }
  .main h1 { font-family:'Playfair Display',serif; font-weight:400; font-size:2.4em; line-height:1.05; margin:0; }
  .main .role { font-size:0.85em; letter-spacing:1.5px; text-transform:uppercase; color:#555; margin:0.5em 0 1.4em; }
  .main h2 { font-size:1.2em; font-weight:700; border-bottom:1px solid #ddd; padding-bottom:0.3em; margin:0 0 0.9em; }
  .main section { margin-bottom:1.6em; }
  .exp-item { margin-bottom:1em; }
  .exp-item .role { font-weight:700; font-size:0.98em; }
  .exp-item .meta { font-size:0.85em; color:#666; margin-bottom:0.35em; }
  .exp-item ul { margin:0; padding-left:1.1em; font-size:0.88em; color:#444; }
  .exp-item li { margin-bottom:0.2em; }
</style>
</head>
<body>
  <div class="resume">
    <div class="sidebar">
      <div class="initials-badge">${m.initials}</div>
      <section>
        <h3>About</h3>
        <p>${m.summary}</p>
      </section>
      <section>
        <h3>Contact</h3>
        <div class="contact-item"><span class="icon-badge">&#9742;</span><span>${m.phone}</span></div>
        <div class="contact-item"><span class="icon-badge">&#9993;</span><span>${m.email}</span></div>
        <div class="contact-item"><span class="icon-badge">&#128205;</span><span>${m.location}</span></div>
        <div class="contact-item"><span class="icon-badge">&#128279;</span><span>${m.linkedin}</span></div>
      </section>
      <section>
        <h3>Skills</h3>
        <ul>\n${liList(m.skills)}\n        </ul>
      </section>
      <section>
        <h3>Languages</h3>
        ${langHtml}
      </section>
    </div>
    <div class="main">
      <h1>${m.name}</h1>
      <div class="role">${m.title}</div>
      <section>
        <h2>Experience</h2>
${workHtml}
      </section>
      <section>
        <h2>Education</h2>
        <div>${m.education}</div>
      </section>
    </div>
  </div>
</body>
</html>`;
}

// ── 3. bold-two-column-timeline — pill skills, circle-marker timeline, name lockup footer ──
function renderBoldTwoColumnTimeline(m) {
  const workHtml = m.workHistory.map(w => `        <div class="exp-item">
          <div class="role">${w.title}</div>
          <div class="meta">${w.company} · ${w.dates}</div>
          <ul>\n${liList(w.bullets)}\n          </ul>
        </div>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${m.name} — Resume</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap');
  ${PRINT_RESET}
  body { font-family:'Inter',Arial,sans-serif; }
  .resume { display:flex; flex-direction:column; flex-shrink:0; width:816px; height:1056px; overflow:hidden; background:#eef0f4; box-shadow:0 10px 50px rgba(0,0,0,0.2); font-size:var(--base,10px); padding:2.4em 2.2em; }
  h2 { font-family:'Poppins',sans-serif; color:${m.accent}; font-size:1.3em; font-weight:800; margin:0 0 0.6em; }
  .cols { display:grid; grid-template-columns:1fr 1.3fr; gap:1.6em; flex:1; }
  .pill-row { display:flex; flex-wrap:wrap; gap:0.5em; }
  .pill { background:rgba(0,0,0,0.05); border:1px solid ${m.accent}; color:#222; border-radius:999px; padding:0.3em 0.9em; font-size:0.85em; font-weight:600; }
  .contact-item { font-size:0.88em; margin-bottom:0.4em; }
  .timeline { position:relative; padding-left:1.4em; border-left:3px solid ${m.accent}; }
  .exp-item { position:relative; margin-bottom:1.1em; }
  .exp-item::before { content:''; position:absolute; left:-1.85em; top:0.15em; width:12px; height:12px; border-radius:50%; background:#fff; border:3px solid ${m.accent}; }
  .exp-item .role { font-weight:800; font-family:'Poppins',sans-serif; color:${m.accent}; font-size:1em; }
  .exp-item .meta { font-size:0.82em; color:#555; margin:0.15em 0 0.35em; }
  .exp-item ul { margin:0; padding-left:1.1em; font-size:0.85em; color:#333; }
  .exp-item li { margin-bottom:0.2em; }
  .footer-bar { display:flex; justify-content:space-between; align-items:center; border-top:2px solid ${m.accent}; padding-top:0.8em; margin-top:1em; }
  .footer-bar .lockup strong { display:block; font-family:'Poppins',sans-serif; font-size:1.8em; color:${m.accent}; font-weight:800; }
  .id-badge { position:relative; width:6.6em; height:6.6em; flex-shrink:0; }
  .id-badge .halo { position:absolute; inset:0.35em; border-radius:50%; background:${m.accent}; opacity:0.18; }
  .id-badge .ring-svg { position:absolute; inset:0; width:100%; height:100%; }
  .id-badge .id-circle { position:absolute; inset:1.5em; border-radius:50%; background:#fff; border:2px solid ${m.accent}; display:flex; align-items:center; justify-content:center; font-family:'Poppins',sans-serif; font-weight:800; color:${m.accent}; font-size:1.3em; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
</style>
</head>
<body>
  <div class="resume">
    <p style="font-size:0.92em; color:#333; line-height:1.5; margin-bottom:1.2em;">${m.summary}</p>
    <div class="cols">
      <div>
        <h2>Skills</h2>
        <div class="pill-row">\n${m.skills.map(s => `<span class="pill">${s}</span>`).join('\n')}\n        </div>
        <h2 style="margin-top:1.2em;">Contact</h2>
        <div class="contact-item">${m.phone}</div>
        <div class="contact-item">${m.email}</div>
        <div class="contact-item">${m.location}</div>
        <div class="contact-item">${m.linkedin}</div>
        <h2 style="margin-top:1.2em;">Education</h2>
        <div class="contact-item">${m.education}</div>
      </div>
      <div>
        <h2>Experience</h2>
        <div class="timeline">\n${workHtml}\n        </div>
      </div>
    </div>
    <div class="footer-bar">
      <div class="lockup">${m.title}<strong>${m.name}</strong></div>
      <div class="id-badge">
        <div class="halo"></div>
        <svg class="ring-svg" viewBox="0 0 200 200">
          <defs><path id="ringPath" d="M 100,100 m -84,0 a 84,84 0 1,1 168,0 a 84,84 0 1,1 -168,0"/></defs>
          <text font-size="12" letter-spacing="3" fill="${m.accent}" font-family="Poppins, sans-serif" font-weight="700">
            <textPath href="#ringPath" startOffset="0%">&#8226; ${m.title.toUpperCase()} &#8226; ${m.title.toUpperCase()}</textPath>
          </text>
        </svg>
        <div class="id-circle">${m.initials}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── 4. modern-accent-photo-header — "Hello, I'm..." header, initials tile, 3-col experience ──
// Star rating purely re-expresses the *order* buildModel() already put
// skills in (most job-relevant first) as a visual device — never asserts a
// self-rating the underlying data didn't already imply through ordering.
function starRating(rank) {
  const filled = Math.max(3, 5 - Math.floor(rank / 2));
  return '&#9733;'.repeat(filled) + '&#9734;'.repeat(5 - filled);
}

function renderModernAccentHeader(m) {
  const expCols = m.workHistory.slice(0, 3).map(w => `      <div class="exp-item">
        <div class="years">${w.dates}</div>
        <div class="company">${w.company}</div>
        <div class="role">${w.title}</div>
        <div class="summary">${w.bullets.slice(0, 2).join(' · ')}</div>
      </div>`).join('\n');
  const skillStars = m.skills.map((s, i) => `<div class="skill-row"><span>${s}</span><span class="stars">${starRating(i)}</span></div>`).join('\n');
  const refs = (m.extraSections || []).map(sec => `      <div>
        <h3 class="section-title">${sec.title}</h3>
${sec.items.map(i => `        <div class="line">${i}</div>`).join('\n')}
      </div>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${m.name} — Resume</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');
  ${PRINT_RESET}
  body { font-family:'Manrope',Arial,sans-serif; }
  .resume { flex-shrink:0; width:816px; height:1056px; overflow:hidden; background:#fff; box-shadow:0 10px 50px rgba(0,0,0,0.2); font-size:var(--base,10px); padding:2.4em 2.4em; position:relative; }
  .corner { position:absolute; top:0; right:0; width:5.5em; height:5.5em; overflow:hidden; z-index:0; }
  .corner::before { content:''; position:absolute; top:0; right:0; width:0; height:0; border-style:solid; border-width:0 5.5em 5.5em 0; border-color:transparent ${m.accent} transparent transparent; opacity:0.9; }
  .corner-dots { position:absolute; top:1.4em; right:1.4em; width:2.2em; height:2.2em; background-image:radial-gradient(#fff 1.1px, transparent 1.1px); background-size:5px 5px; opacity:0.8; }
  .header, .exp-row, .footer-grid, h3.section-title { position:relative; z-index:1; }
  .header { display:grid; grid-template-columns:1.4fr 1fr; gap:1.4em; align-items:center; margin-bottom:1.6em; }
  .header h1 { margin:0; font-size:1.15em; font-weight:400; color:#777; }
  .header h2 { margin:0.1em 0 0.5em; font-size:1.9em; font-weight:800; }
  .header .role { color:${m.accent}; font-weight:700; margin-bottom:0.6em; }
  .header p { font-size:0.85em; color:#666; line-height:1.5; margin:0 0 0.5em; }
  .initials-tile { width:120px; height:120px; border-radius:8px; border:5px solid ${m.accent}; background:#f4f4f4; display:flex; align-items:center; justify-content:center; font-size:2.4em; font-weight:800; color:${m.accent}; justify-self:end; }
  h3.section-title { color:#222; font-size:1.05em; font-weight:800; margin:0 0 0.7em; padding-left:0.5em; border-left:4px solid ${m.accent}; }
  .exp-row { display:grid; grid-template-columns:repeat(3,1fr); gap:1em; margin-bottom:1.6em; }
  .exp-item .years { color:${m.accent}; font-size:0.75em; font-weight:700; }
  .exp-item .company { font-weight:700; font-size:0.88em; }
  .exp-item .role { font-size:0.8em; color:#666; margin-bottom:0.3em; }
  .exp-item .summary { font-size:0.78em; color:#666; line-height:1.4; }
  .footer-grid { display:grid; grid-template-columns:1fr 1fr 1.2fr; gap:1.2em; font-size:0.85em; }
  .footer-grid div.line { margin-bottom:0.3em; color:#555; }
  .link-chip { display:inline-block; margin-top:0.3em; font-size:0.85em; color:${m.accent}; border:1px solid ${m.accent}; border-radius:999px; padding:0.2em 0.7em; text-decoration:none; }
  .skill-row { display:flex; justify-content:space-between; gap:0.6em; font-size:0.85em; color:#333; margin-bottom:0.35em; }
  .skill-row .stars { color:${m.accent}; letter-spacing:1px; white-space:nowrap; }
</style>
</head>
<body>
  <div class="resume">
    <div class="corner"></div>
    <div class="corner-dots"></div>
    <div class="header">
      <div>
        <h1>Hello... I'm</h1>
        <h2>${m.name}</h2>
        <div class="role">${m.title}</div>
        <p>${m.summary}</p>
        <a class="link-chip" href="${m.linkedin}">${m.linkedin}</a>
      </div>
      <div class="initials-tile">${m.initials}</div>
    </div>
    <h3 class="section-title">Experience</h3>
    <div class="exp-row">\n${expCols}\n    </div>
    <div class="footer-grid">
      <div>
        <h3 class="section-title">Contact</h3>
        <div class="line">${m.phone}</div>
        <div class="line">${m.email}</div>
        <div class="line">${m.location}</div>
      </div>
      <div>
        <h3 class="section-title">Education</h3>
        <div class="line">${m.education}</div>
      </div>
      <div>
        <h3 class="section-title">Skills</h3>
${skillStars}
      </div>
    </div>
    ${refs ? `<div class="footer-grid" style="margin-top:1.2em;">\n${refs}\n    </div>` : ''}
  </div>
</body>
</html>`;
}

// ── 5. bold-poster-statement — oversized outline headline, initials hero, cream background ──
// Derive a proficiency percentage from a language string's own wording
// (e.g. "English (Native)" -> 100) purely to re-express what the data
// already states as a ring — never invents a claim beyond it.
function languageProficiencyPct(label) {
  const l = label.toLowerCase();
  if (l.includes('native') || l.includes('bilingual')) return 100;
  if (l.includes('fluent')) return 90;
  if (l.includes('advanced') || l.includes('professional')) return 80;
  if (l.includes('intermediate') || l.includes('conversational')) return 60;
  if (l.includes('basic') || l.includes('beginner')) return 30;
  return 75;
}

function renderBoldPosterStatement(m) {
  const words = m.title.split(/\s+/);
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(' ');
  const line2 = words.slice(mid).join(' ') || m.title;
  const expCards = m.workHistory.slice(0, 2).map(w => `      <div class="exp-card">
        <div class="title">${w.title}</div>
        <div class="meta">${w.company} · ${w.dates}</div>
        <ul>\n${liList(w.bullets)}\n        </ul>
      </div>`).join('\n');
  const langRings = m.languages.map(l => {
    const pct = languageProficiencyPct(l);
    return `<div class="lang-ring" style="background:conic-gradient(${m.accent} ${pct}%, #e7ded0 0);"><div class="lang-ring-inner">${pct}%</div><div class="lang-lbl">${l}</div></div>`;
  }).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${m.name} — Resume</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700&display=swap');
  ${PRINT_RESET}
  body { font-family:'Inter',Arial,sans-serif; }
  .resume { flex-shrink:0; width:816px; height:1056px; overflow:hidden; background:#f6efe4; box-shadow:0 10px 50px rgba(0,0,0,0.2); font-size:var(--base,10px); padding:2.2em 2.2em; position:relative; }
  .orb { position:absolute; border-radius:50%; z-index:0; opacity:0.55; filter:blur(0.5px); }
  .orb.o1 { width:2.6em; height:2.6em; top:1.6em; right:6.2em; background:radial-gradient(circle at 32% 28%, #fff 0%, ${m.accent} 45%, ${m.accent} 100%); }
  .orb.o2 { width:1.1em; height:1.1em; top:4.6em; right:3.2em; background:radial-gradient(circle at 32% 28%, #fff 0%, #1a1a1a 60%, #1a1a1a 100%); opacity:0.35; }
  .squiggle { position:absolute; top:0.8em; right:0.6em; width:5.5em; z-index:0; }
  .headline, .byline, .hero, .rule, .section-title, .exp-grid, .tag-row, .lang-row { position:relative; z-index:1; }
  .headline { font-family:'Archivo Black',sans-serif; }
  .headline .l1 { font-size:2.6em; line-height:1; color:#1a1a1a; }
  .headline .l2 { font-size:2.6em; line-height:1; color:transparent; -webkit-text-stroke:2px #1a1a1a; }
  .byline { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:1.2em; }
  .byline .name { font-size:1.05em; font-weight:700; color:${m.accent}; }
  .byline .portfolio-btn { font-size:0.76em; font-weight:700; text-decoration:none; color:#1a1a1a; border:1.5px solid #1a1a1a; border-radius:999px; padding:0.35em 0.9em; display:inline-flex; align-items:center; gap:0.35em; }
  .hero { display:grid; grid-template-columns:1fr 1.7fr; gap:1.2em; align-items:start; margin-bottom:1.6em; }
  .initials-hero { aspect-ratio:3/4; border-radius:6px; background:${m.accent}; opacity:0.9; display:flex; align-items:center; justify-content:center; font-family:'Archivo Black',sans-serif; font-size:2.6em; color:#fff; }
  .about p { font-size:0.85em; color:#555; line-height:1.6; margin:0 0 0.8em; }
  .badge-row { display:flex; gap:1.6em; font-size:0.78em; }
  .badge-row .line { color:#555; margin-bottom:0.15em; }
  hr.rule { border:none; border-top:1.5px solid #1a1a1a; margin:1.2em 0; }
  h3.section-title { font-size:1.05em; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 0.8em; }
  .exp-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.2em; margin-bottom:1.4em; }
  .exp-card .title { font-weight:700; font-size:0.9em; }
  .exp-card .meta { font-size:0.76em; color:#666; margin-bottom:0.3em; }
  .exp-card ul { margin:0; padding-left:1em; font-size:0.8em; color:#555; }
  .tag-row { display:flex; flex-wrap:wrap; gap:0.5em; margin-bottom:1.2em; }
  .tag-row .tag { font-size:0.76em; background:#fff; border:1.5px solid #1a1a1a; border-radius:6px; padding:0.25em 0.6em; }
  .lang-row { display:flex; gap:1.4em; }
  .lang-ring { width:3.4em; height:3.4em; border-radius:50%; display:flex; align-items:center; justify-content:center; position:relative; text-align:center; }
  .lang-ring-inner { width:2.5em; height:2.5em; border-radius:50%; background:#f6efe4; display:flex; align-items:center; justify-content:center; font-size:0.62em; font-weight:700; }
  .lang-lbl { position:absolute; top:100%; left:50%; transform:translateX(-50%); white-space:nowrap; font-size:0.62em; color:#555; margin-top:0.4em; }
</style>
</head>
<body>
  <div class="resume">
    <div class="orb o1"></div>
    <div class="orb o2"></div>
    <svg class="squiggle" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 8C16 8 12 32 24 32C36 32 32 8 44 8C56 8 52 32 64 32C76 32 72 8 84 8C90 8 92 12 96 16" stroke="${m.accent}" stroke-width="5" stroke-linecap="round"/>
    </svg>
    <div class="headline"><div class="l1">${line1}</div><div class="l2">${line2}</div></div>
    <div class="byline">
      <div class="name">${m.name}</div>
      <a class="portfolio-btn" href="${m.linkedin}">Profile &#8599;</a>
    </div>
    <div class="hero">
      <div class="initials-hero">${m.initials}</div>
      <div class="about">
        <p>${m.summary}</p>
        <div class="badge-row">
          <div><strong>Education</strong><div class="line">${m.education}</div></div>
          <div><strong>Contact</strong><div class="line">${m.phone}</div><div class="line">${m.email}</div></div>
        </div>
      </div>
    </div>
    <hr class="rule">
    <h3 class="section-title">Experience</h3>
    <div class="exp-grid">\n${expCards}\n    </div>
    <h3 class="section-title">Skills &amp; Tools</h3>
    <div class="tag-row">\n${m.skills.map(s => `<span class="tag">${s}</span>`).join('\n')}\n${m.tools.map(t => `<span class="tag">${t}</span>`).join('\n')}\n    </div>
    <h3 class="section-title">Languages</h3>
    <div class="lang-row">\n${langRings}\n    </div>
  </div>
</body>
</html>`;
}

// ── 6. handwritten-highlight-creative — graph paper, rounded frame, highlighter headings ──
function renderHandwrittenHighlight(m) {
  const workHtml = m.workHistory.map(w => `        <div class="exp-line">
          <span class="company">${w.company}</span><br>
          <span class="tags">${w.title} — ${w.dates}</span>
          <ul>\n${liList(w.bullets)}\n          </ul>
        </div>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${m.name} — Resume</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Inter:wght@400;500;600&display=swap');
  ${PRINT_RESET}
  body { font-family:'Inter',Arial,sans-serif; }
  .resume { flex-shrink:0; width:816px; height:1056px; overflow:hidden; background:#fafafa; box-shadow:0 10px 50px rgba(0,0,0,0.2); font-size:var(--base,10px); padding:1.6em; }
  .frame { height:100%; border:2.5px solid #1a1a1a; border-radius:14px; padding:1.6em;
    background-image:linear-gradient(#d9d9d9 1px, transparent 1px), linear-gradient(90deg, #d9d9d9 1px, transparent 1px);
    background-size:22px 22px; background-color:#fff; display:grid; grid-template-columns:230px 1fr; column-gap:1.4em; overflow:hidden; }
  .name-heading { grid-column:1/-1; font-family:'Caveat',cursive; font-size:2.3em; font-weight:700; margin:0 0 0.7em; }
  h3.hl { display:inline-block; position:relative; font-family:'Caveat',cursive; font-size:1.5em; font-weight:700; margin:0 0 0.6em; z-index:1; }
  h3.hl::before { content:''; position:absolute; left:-6px; right:-6px; bottom:2px; top:35%; background:${m.accent}; z-index:-1; opacity:0.85; transform:rotate(-1deg); }
  .initials-block { width:70px; height:70px; border:2px solid #1a1a1a; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.8em; font-weight:800; margin-bottom:0.9em; }
  .sidebar section, .main section { margin-bottom:1.2em; }
  .sidebar p, .contact-line { font-size:0.85em; color:#4a4a4a; }
  .sidebar ul { margin:0; padding-left:1.1em; font-size:0.85em; color:#4a4a4a; }
  .exp-line { font-size:0.88em; margin-bottom:0.7em; }
  .exp-line .company { font-weight:700; }
  .exp-line .tags { color:#555; font-size:0.85em; }
  .exp-line ul { margin:0.2em 0 0; padding-left:1.1em; font-size:0.85em; color:#4a4a4a; }
</style>
</head>
<body>
  <div class="resume">
    <div class="frame">
      <div class="name-heading">${m.name}</div>
      <div class="sidebar">
        <div class="initials-block">${m.initials}</div>
        <section>
          <h3 class="hl">About</h3>
          <p>${m.summary}</p>
        </section>
        <section>
          <h3 class="hl">Skills</h3>
          <ul>\n${liList(m.skills)}\n          </ul>
        </section>
        <section>
          <div class="contact-line">${m.phone}</div>
          <div class="contact-line">${m.email}</div>
          <div class="contact-line">${m.location}</div>
        </section>
      </div>
      <div class="main">
        <section>
          <h3 class="hl">Experience</h3>
${workHtml}
        </section>
        <section>
          <h3 class="hl">Education</h3>
          <div>${m.education}</div>
        </section>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── 7. playful-retro-window — OS-window chrome, dotted education timeline, skill badges ──
function renderPlayfulRetroWindow(m) {
  const eduPoints = [m.education].map((e) => `<div class="edu-point" style="left:50%;"><div class="marker"></div><div class="lbl">${e}</div></div>`).join('\n');
  const flowNodes = m.workHistory.map((w, i) => `${i > 0 ? '<div class="flow-arrow">&#9660;</div>' : ''}
            <div class="flow-node">${w.title}<span class="flow-sub">${w.company} &middot; ${w.dates}</span></div>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${m.name} — Resume</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=JetBrains+Mono:wght@400;600;700&display=swap');
  ${PRINT_RESET}
  body { font-family:'JetBrains Mono',monospace; }
  .resume {
    flex-shrink:0; width:816px; height:1056px; overflow:hidden; position:relative;
    background: linear-gradient(180deg, #2f6fb0 0%, #6fa3d8 22%, #cfe3f5 38%, #eaf5ea 44%),
                radial-gradient(ellipse 60% 40% at 50% 100%, #6fb356 0%, #4f9a45 55%, transparent 75%);
    background-color:#cfe3f5; box-shadow:0 10px 50px rgba(0,0,0,0.2); font-size:var(--base,10px); padding:1.6em;
  }
  .window { height:100%; border:3px solid #1a1a1a; border-radius:8px; background:#fff; overflow:hidden; position:relative; z-index:1; }
  .titlebar { background:${m.accent}; color:#fff; display:flex; align-items:center; gap:0.6em; padding:0.6em 0.8em; font-family:'Press Start 2P',monospace; font-size:0.6em; letter-spacing:0.5px; }
  .dots { display:flex; gap:5px; margin-right:0.5em; }
  .dot { width:10px; height:10px; border-radius:50%; }
  .dot.r{background:#ff5f57;} .dot.y{background:#febc2e;} .dot.g{background:#28c840;}
  .body-pad { padding:1.4em; display:grid; grid-template-columns:1fr 1.3fr; gap:1.4em; }
  .side h3, .main h3 { font-family:'Press Start 2P',monospace; font-size:0.72em; font-weight:400; margin:0 0 0.9em; border-bottom:3px solid ${m.accent}; padding-bottom:0.4em; display:inline-block; }
  .side section, .main section { margin-bottom:1.3em; }
  .nested-window { border:2px solid #1a1a1a; border-radius:6px; overflow:hidden; margin-bottom:0.9em; }
  .nested-window .titlebar { background:#f2f2f2; color:#1a1a1a; font-size:0.5em; }
  .nested-window .content { padding:0.9em; font-family:Arial,sans-serif; font-size:0.82em; }
  .contact-row { margin-bottom:0.3em; }
  .edu-timeline { position:relative; height:40px; margin:1em 0 0.5em; }
  .edu-timeline::before { content:''; position:absolute; left:0; right:0; top:50%; height:2px; background:repeating-linear-gradient(90deg, ${m.accent} 0 6px, transparent 6px 12px); }
  .edu-point { position:absolute; top:50%; transform:translate(-50%,-50%); text-align:center; font-family:Arial,sans-serif; }
  .edu-point .marker { width:12px; height:12px; border-radius:50%; background:${m.accent}; margin:0 auto 4px; }
  .edu-point .lbl { font-size:0.68em; white-space:nowrap; color:#555; }
  .skills-head { display:flex; align-items:center; gap:0.5em; }
  .doodle-arrow { width:2.2em; height:auto; margin-bottom:0.5em; flex-shrink:0; }
  .skill-badges { display:flex; flex-wrap:wrap; gap:0.5em; }
  .skill-badge { padding:0.35em 0.7em; border-radius:6px; background:${m.accent}; color:#fff; font-family:Arial,sans-serif; font-weight:700; font-size:0.72em; }
  .flow { display:flex; flex-direction:column; align-items:center; font-family:Arial,sans-serif; }
  .flow-node { border:2px solid #1a1a1a; border-radius:20px; padding:0.5em 1.1em; font-weight:700; font-size:0.8em; text-align:center; background:#fff; box-shadow:2px 2px 0 rgba(0,0,0,0.12); }
  .flow-node .flow-sub { display:block; font-weight:400; font-size:0.82em; color:#666; margin-top:0.15em; }
  .flow-arrow { color:${m.accent}; font-size:0.9em; line-height:1; margin:0.25em 0; }
</style>
</head>
<body>
  <div class="resume">
    <div class="window">
      <div class="titlebar"><span class="dots"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span></span>MY RESUME</div>
      <div class="body-pad">
        <div class="side">
          <div class="nested-window">
            <div class="titlebar"><span class="dots"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span></span>www.about.me</div>
            <div class="content">
              <strong>${m.name}</strong>
              <div class="contact-row">${m.phone}</div>
              <div class="contact-row">${m.email}</div>
              <div class="contact-row">${m.location}</div>
              <p style="margin-top:0.4em; color:#555;">${m.summary}</p>
            </div>
          </div>
          <section>
            <div class="skills-head">
              <svg class="doodle-arrow" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6C10 6 8 18 18 16C26 14 22 26 34 24" stroke="${m.accent}" stroke-width="2.5" stroke-linecap="round"/>
                <path d="M28 21L34 24L32 30" stroke="${m.accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <h3>Skills</h3>
            </div>
            <div class="skill-badges">\n${m.skills.map(s => `<span class="skill-badge">${s}</span>`).join('\n')}\n            </div>
          </section>
        </div>
        <div class="main">
          <section>
            <h3>Education</h3>
            <div class="edu-timeline">\n${eduPoints}\n            </div>
          </section>
          <section>
            <h3>Worked As</h3>
            <div class="flow">\n${flowNodes}\n            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── 8. warm-spotlight-poster — warm radial spotlight, oversized poster headline, translucent cards ──
function renderWarmSpotlightPoster(m) {
  const words = m.name.split(/\s+/);
  const mid = Math.ceil(words.length / 2);
  const nameLine1 = words.slice(0, mid).join(' ');
  const nameLine2 = words.slice(mid).join(' ');
  const titleWords = m.title.split(/\s+/);
  const sideRest = titleWords.slice(1).join(' ') || 'RESUME';
  const journeyHtml = m.workHistory.map(w => `          <div class="jny-item">
            <div class="jny-role">${w.title}</div>
            <div class="jny-co">${w.company}</div>
            <div class="jny-dates">${w.dates}</div>
            <ul class="jny-bullets">\n${liList(w.bullets)}\n            </ul>
          </div>`).join('\n');
  const extraCards = m.extraSections.map(sec => `        <div class="card">
          <div class="card-title">${sec.title.toUpperCase()}</div>
${sec.items.map(i => `          <div class="card-lines">&#8226;&nbsp; ${i}</div>`).join('\n')}
        </div>`).join('\n');
  const toolsLine = m.tools.length ? `<div class="card-lines" style="margin-top:0.6em; color:#b5aa97;">${m.tools.join(' &#8226; ')}</div>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${m.name} — Resume</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Barlow:wght@400;500;600;700&display=swap');
  ${PRINT_RESET}
  body { font-family:'Barlow',Arial,sans-serif; }
  .resume { flex-shrink:0; width:816px; height:1056px; overflow:hidden; position:relative; color:#eae1d2;
    background:radial-gradient(120% 80% at 52% 40%, #837868 0%, #6a6053 42%, #514940 78%, #423b33 100%);
    box-shadow:0 10px 50px rgba(0,0,0,0.2); font-size:var(--base,10px); padding:2.4em 2.6em; display:flex; flex-direction:column; }
  .side-label { position:absolute; top:5em; right:1em; writing-mode:vertical-rl; font-size:1.05em; letter-spacing:3px; color:#cfc4b2; }
  .side-label b { font-weight:700; }
  .headline { font-family:'Archivo Black',sans-serif; font-size:3.4em; line-height:0.95; letter-spacing:1px; color:#efe7d8; text-shadow:0 3px 14px rgba(0,0,0,0.35); text-transform:uppercase; }
  .byline { margin-top:0.6em; font-size:1.3em; letter-spacing:3px; color:#d7cebc; text-transform:uppercase; }
  .byline b { color:${m.accent}; }
  .cols { display:grid; grid-template-columns:1fr 1.15fr; gap:1.6em; margin-top:1.8em; flex:1; align-content:start; }
  .col { display:flex; flex-direction:column; gap:1.4em; min-width:0; }
  .card { background:rgba(40,35,29,0.55); border-radius:6px; padding:1.2em 1.6em; }
  .card-title { font-size:1.5em; letter-spacing:2px; font-weight:600; color:#f3ecdc; }
  .card-title b { font-weight:800; }
  .card-kicker { margin-top:0.7em; font-size:1.05em; letter-spacing:2px; font-weight:700; color:${m.accent}; text-transform:uppercase; }
  .card-lines, .card p { margin-top:0.6em; font-size:0.95em; line-height:1.5; color:#c8bdaa; }
  .squiggle { width:7em; height:2.4em; align-self:flex-end; margin:-0.4em 1em 0 0; }
  .sec-title { font-size:1.7em; font-weight:800; letter-spacing:1px; color:#f2ead9; text-shadow:0 1px 6px rgba(0,0,0,0.65); }
  .edu-line { margin-top:0.7em; font-size:1.05em; font-weight:700; }
  .edu-line::before { content:'\\2022\\00a0\\00a0'; color:${m.accent}; }
  .jny-item { margin-top:1.1em; }
  .jny-item:first-of-type { margin-top:0.9em; }
  .jny-role { font-size:1.1em; font-weight:800; letter-spacing:0.5px; text-transform:uppercase; }
  .jny-co { font-size:0.95em; color:#cabfad; }
  .jny-dates { font-size:0.8em; color:#a99e8b; }
  .jny-bullets { margin:0.35em 0 0; padding-left:1.2em; font-size:0.88em; line-height:1.45; color:#c8bdaa; }
  .contact { display:flex; flex-direction:column; gap:0.7em; margin-top:0.4em; }
  .contact-row { display:flex; align-items:center; gap:1em; font-size:1em; }
  .contact-row .ico { width:2.4em; height:2.4em; border-radius:50%; background:#2c2620; display:flex; align-items:center; justify-content:center; font-size:1em; flex-shrink:0; }
  .contact-row a { color:${m.accent}; text-decoration:none; overflow-wrap:anywhere; }
</style>
</head>
<body>
  <div class="resume">
    <div class="side-label">${titleWords[0].toLowerCase()}<b>${sideRest.toUpperCase()}</b></div>
    <div class="headline">${nameLine1}${nameLine2 ? '<br>' + nameLine2 : ''}</div>
    <div class="byline">@ <b>${m.title}</b></div>
    <div class="cols">
      <div class="col">
        <div class="card">
          <div class="card-title">MY <b>DNA</b></div>
          <div class="card-kicker">${m.title}</div>
          <p>${m.summary}</p>
        </div>
        <div class="card">
          <div class="card-title"><b>SKILLS</b></div>
          <div class="card-lines">${m.skills.join(' &#8226; ')}</div>
          ${toolsLine}
        </div>
${extraCards}
        <div class="contact">
          <div class="contact-row"><span class="ico">&#9993;</span><span>${m.email}</span></div>
          <div class="contact-row"><span class="ico">&#9742;</span><span>${m.phone}</span></div>
          <div class="contact-row"><span class="ico">&#9679;</span><span>${m.location}</span></div>
          <div class="contact-row"><span class="ico">&#127760;</span><a href="${m.linkedin}">${m.linkedin}</a></div>
        </div>
      </div>
      <div class="col">
        <div>
          <div class="sec-title">EDUCATION</div>
          <div class="edu-line">${m.education}</div>
        </div>
        <svg class="squiggle" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 26 C 20 6, 34 6, 44 20 S 78 34, 96 12 L 112 4" stroke="${m.accent}" stroke-width="4" stroke-linecap="round"/>
        </svg>
        <div class="card" style="flex:1;">
          <div class="card-title">My <b>JOURNEY</b></div>
${journeyHtml}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── 9. paper-id-card — paper sheet on a dark desk, clipped ID-card header, handwritten highlights ──
function renderPaperIdCard(m) {
  const jobsHtml = m.workHistory.map(w => `          <div class="job">
            <div class="job-head"><b>${w.company}</b><span>${w.dates}</span></div>
            <div class="job-role">${w.title}</div>
            <ul>\n${liList(w.bullets)}\n            </ul>
          </div>`).join('\n');
  const pills = m.skills.map(s => `<span class="pill">${s}</span>`).join('\n');
  const toolsCard = m.tools.length ? `          <h3 class="hl" style="margin-top:1.6em;"><span>Toolbox</span></h3>
          <div class="note-card">
            <div class="pin"></div>
            <div class="note-lines">${m.tools.join('<br>')}</div>
          </div>` : '';
  const extras = m.extraSections.map(sec => `          <h3 class="hl" style="margin-top:1.6em;"><span>${sec.title}</span></h3>
          <ul class="plain-list">\n${liList(sec.items)}\n          </ul>`).join('\n');
  const langRow = m.languages.length ? `        <div class="tbl-row" style="border-top:1.5px solid #333;"><div class="tbl-cell"><b>LANG</b>&nbsp; ${m.languages.join(', ')}</div></div>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${m.name} — Resume</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Nunito+Sans:wght@400;600;700;800&display=swap');
  ${PRINT_RESET}
  body { font-family:'Nunito Sans',Arial,sans-serif; }
  .resume { flex-shrink:0; width:816px; height:1056px; overflow:hidden; background:#4f4f4f; box-shadow:0 10px 50px rgba(0,0,0,0.2); font-size:var(--base,10px); padding:1.4em; display:flex; }
  .paper { flex:1; background:#f4f2ec; background-image:radial-gradient(rgba(0,0,0,0.025) 1px, transparent 1px); background-size:4px 4px; padding:2.4em 3em; box-shadow:0 8px 30px rgba(0,0,0,0.4); color:#2a2a2a; overflow:hidden; display:flex; flex-direction:column; }
  .id-row { display:flex; gap:1.8em; align-items:flex-start; }
  .id-card { position:relative; flex-shrink:0; }
  .id-frame { background:${m.accent}; padding:0.7em; box-shadow:0 4px 10px rgba(0,0,0,0.15); }
  .monogram { width:10em; height:10em; background:#fdfcf8; display:flex; align-items:center; justify-content:center; font-family:'Caveat',cursive; font-weight:700; font-size:1em; }
  .monogram span { font-size:4.4em; }
  .clip { position:absolute; top:-0.9em; left:42%; width:1.3em; height:3.4em; border:0.26em solid #b9b9b9; border-radius:0.8em; transform:rotate(12deg); }
  .id-info { flex:1; min-width:0; }
  .script-name { font-family:'Caveat',cursive; font-size:2.6em; font-weight:700; line-height:1.1; }
  .id-info > p { font-size:0.92em; color:#555; line-height:1.45; margin:0.3em 0 0.9em; }
  .info-table { border:1.5px solid #333; font-size:0.9em; }
  .tbl-row { display:flex; }
  .tbl-row + .tbl-row { border-top:1.5px solid #333; }
  .tbl-cell { flex:1; padding:0.5em 0.8em; line-height:1.7; min-width:0; overflow-wrap:anywhere; }
  .tbl-cell + .tbl-cell { border-left:1.5px solid #333; }
  .tbl-link { flex:0 0 6em; border-left:1.5px solid #333; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.2em; text-decoration:none; color:#2a2a2a; text-align:center; }
  .tbl-link .arrow { font-size:1.6em; line-height:1; }
  .tbl-link .lbl { font-size:0.72em; font-weight:700; letter-spacing:0.5px; }
  .cols { display:grid; grid-template-columns:1fr 1fr; gap:2.6em; margin-top:2em; flex:1; align-content:start; }
  h3.hl { font-family:'Caveat',cursive; font-size:1.9em; font-weight:700; margin:0 0 0.5em; }
  h3.hl span { background:${m.accent}; padding:0.04em 0.28em; box-decoration-break:clone; -webkit-box-decoration-break:clone; }
  .job { margin-bottom:1.1em; }
  .job-head { display:flex; justify-content:space-between; gap:1em; font-size:0.95em; }
  .job-role { font-size:0.88em; color:#444; }
  .job ul { margin:0.4em 0 0; padding-left:1.4em; font-size:0.88em; color:#333; line-height:1.5; }
  .edu-line { font-size:0.92em; }
  .pill-row { display:flex; flex-wrap:wrap; gap:0.6em; }
  .pill { border:1.5px solid #555; border-radius:1.2em; padding:0.3em 1em; font-size:0.82em; background:#fbfaf5; }
  .note-card { position:relative; border:2px solid ${m.accent}; background:#fdfbe8; border-radius:6px; padding:1.2em 1.4em; }
  .note-card .pin { position:absolute; top:-0.5em; left:1.6em; width:1em; height:1em; border-radius:50%; background:#e05b4f; }
  .note-lines { font-size:1em; color:#333; line-height:1.9; text-align:center; }
  .plain-list { margin:0; padding-left:1.4em; font-size:0.88em; color:#333; line-height:1.5; }
</style>
</head>
<body>
  <div class="resume">
    <div class="paper">
      <div class="id-row">
        <div class="id-card">
          <div class="id-frame"><div class="monogram"><span>${m.initials}</span></div></div>
          <div class="clip"></div>
        </div>
        <div class="id-info">
          <div class="script-name">${m.name}</div>
          <p>${m.summary}</p>
          <div class="info-table">
            <div class="tbl-row"><div class="tbl-cell"><b>ROLE</b>&nbsp; ${m.title}</div><div class="tbl-cell"><b>LOC</b>&nbsp; ${m.location}</div></div>
            <div class="tbl-row"><div class="tbl-cell">&#9742; ${m.phone}<br>&#9993; ${m.email}<br>&#127760; ${m.linkedin}</div><a class="tbl-link" href="${m.linkedin}"><span class="arrow">&#8599;</span><span class="lbl">PROFILE</span></a></div>
${langRow}
          </div>
        </div>
      </div>
      <div class="cols">
        <div>
          <h3 class="hl"><span>Work Experience</span></h3>
${jobsHtml}
          <h3 class="hl" style="margin-top:0.5em;"><span>Education</span></h3>
          <div class="edu-line">${m.education}</div>
        </div>
        <div>
          <h3 class="hl"><span>Key Competencies</span></h3>
          <div class="pill-row">\n${pills}\n          </div>
${toolsCard}
${extras}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

const TEMPLATES = {
  'dark-sidebar-accent': { defaultAccent: '#0076CE', render: renderDarkSidebarAccent },
  'editorial-serif-sidebar': { defaultAccent: '#111111', render: renderEditorialSerifSidebar },
  'bold-two-column-timeline': { defaultAccent: '#2b3fe0', render: renderBoldTwoColumnTimeline },
  'modern-accent-photo-header': { defaultAccent: '#d6342c', render: renderModernAccentHeader },
  'bold-poster-statement': { defaultAccent: '#d9622b', render: renderBoldPosterStatement },
  'handwritten-highlight-creative': { defaultAccent: '#f5e14a', render: renderHandwrittenHighlight },
  'playful-retro-window': { defaultAccent: '#2f6fed', render: renderPlayfulRetroWindow },
  'warm-spotlight-poster': { defaultAccent: '#d8b25f', render: renderWarmSpotlightPoster },
  'paper-id-card': { defaultAccent: '#fbd934', render: renderPaperIdCard },
};

function renderHTML(tailored, master, opts) {
  const model = buildModel(tailored, master, opts || {});
  return TEMPLATES[model.template].render(model);
}

module.exports = { TEMPLATES, renderHTML, buildModel, initialsOf };
