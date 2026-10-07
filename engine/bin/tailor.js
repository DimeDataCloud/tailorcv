#!/usr/bin/env node
// bin/tailor.js — CLI entry point.
//
// Render a resume through one of 9 design templates, optionally tailoring it
// to a specific job description first via a local Ollama model. AI tailoring
// is entirely optional: omit --jd/--url/--text (or pass --no-ai) to just
// render the master resume as-is.
//
//   node bin/tailor.js --resume examples/example-resume.json --template dark-sidebar-accent
//   node bin/tailor.js --resume my-resume.json --jd posting.txt --company "Acme" --title "AE" --template editorial-serif-sidebar --accent "#0f766e"
//   node bin/tailor.js --list-templates

const fs = require('fs');
const path = require('path');
const { TEMPLATES, buildModel } = require('../core/render');
const { selectRelevantMaster } = require('../core/select');

function usage() {
  console.log(`Usage:
  node bin/tailor.js --resume <path.json> [options]

Job tailoring (all optional — omit to just render the resume as-is):
  --jd <file>            Read the job description from a text file
  --url <url>            Fetch the job description from a URL
  --text "<jd text>"     Pass the job description inline
  --company "<name>"     Target company (default: "Unknown Company")
  --title "<role>"       Target role (default: "Unknown Role")
  --company-info "<text>"      Company background/brand voice (mission, About page, tone) —
                                used only to calibrate word choice/formality, never copied in
  --company-info-file <file>   Same, read from a file
  --no-ai                Skip the Ollama tailoring step even if --jd/--url/--text is given
  --model <name>         Ollama model to use (default: gemma3)
  --ollama-url <url>     Ollama base URL (default: http://localhost:11434)

Design:
  --template <name>      One of: ${Object.keys(TEMPLATES).join(', ')}
                          (default: dark-sidebar-accent)
  --accent "#hex"        Theme color (default: the template's own default accent)
  --custom-template <file.js>  Use your own design instead of the 9 built-ins — a JS file
                          exporting { render(model), defaultAccent }. See
                          examples/custom-template.example.js for the contract and
                          README.md's "Custom Templates" section for how to have an
                          agent (Claude Code/Hermes) write one from a description or
                          reference design. Overrides --template.

Output:
  --out <dir>            Output directory (default: ./output/<date>-<slug>/)
  --no-pdf               Skip PDF export (HTML + JSON only — no Playwright required)

  --list-templates       Print the template gallery and exit
`);
}

function parseArgs(argv) {
  const opts = {
    resume: null, jdFile: null, url: null, text: null,
    company: 'Unknown Company', title: 'Unknown Role',
    companyInfo: null, companyInfoFile: null,
    template: null, accent: null, customTemplate: null, out: null,
    noAi: false, noPdf: false,
    model: 'gemma3', ollamaUrl: 'http://localhost:11434',
    listTemplates: false, help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--resume' && argv[i + 1]) opts.resume = argv[++i];
    else if (a === '--jd' && argv[i + 1]) opts.jdFile = argv[++i];
    else if (a === '--url' && argv[i + 1]) opts.url = argv[++i];
    else if (a === '--text' && argv[i + 1]) opts.text = argv[++i];
    else if (a === '--company' && argv[i + 1]) opts.company = argv[++i];
    else if (a === '--title' && argv[i + 1]) opts.title = argv[++i];
    else if (a === '--company-info' && argv[i + 1]) opts.companyInfo = argv[++i];
    else if (a === '--company-info-file' && argv[i + 1]) opts.companyInfoFile = argv[++i];
    else if (a === '--template' && argv[i + 1]) opts.template = argv[++i];
    else if (a === '--accent' && argv[i + 1]) opts.accent = argv[++i];
    else if (a === '--custom-template' && argv[i + 1]) opts.customTemplate = argv[++i];
    else if (a === '--out' && argv[i + 1]) opts.out = argv[++i];
    else if (a === '--model' && argv[i + 1]) opts.model = argv[++i];
    else if (a === '--ollama-url' && argv[i + 1]) opts.ollamaUrl = argv[++i];
    else if (a === '--no-ai') opts.noAi = true;
    else if (a === '--no-pdf') opts.noPdf = true;
    else if (a === '--list-templates') opts.listTemplates = true;
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  return opts;
}

// Minimal, dependency-free JD fetch: no headless browser required. Good
// enough for static job postings; JS-rendered boards may need --text/--jd
// (copy-paste the description) instead.
function fetchJobFromUrl(url) {
  const lib = url.startsWith('https') ? require('https') : require('http');
  return new Promise((resolve, reject) => {
    lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchJobFromUrl(res.headers.location));
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const text = data
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
          .replace(/\s+/g, ' ').trim();
        resolve(text.slice(0, 8000));
      });
    }).on('error', reject);
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) { usage(); return; }

  if (opts.listTemplates) {
    console.log('Available templates:\n');
    for (const [name, t] of Object.entries(TEMPLATES)) {
      console.log(`  ${name}  (default accent: ${t.defaultAccent})`);
    }
    return;
  }

  let customRender = null;
  if (opts.customTemplate) {
    const customPath = path.resolve(process.cwd(), opts.customTemplate);
    if (!fs.existsSync(customPath)) {
      console.error(`--custom-template file not found: ${customPath}`);
      process.exit(1);
    }
    const customMod = require(customPath);
    if (typeof customMod.render !== 'function') {
      console.error(`--custom-template file must export { render(model), defaultAccent? } — no render() function found in ${customPath}`);
      console.error('See examples/custom-template.example.js for the contract.');
      process.exit(1);
    }
    customRender = customMod;
  } else if (opts.template && !TEMPLATES[opts.template]) {
    console.error(`Unknown --template "${opts.template}". Run --list-templates to see available options.`);
    process.exit(1);
  }

  const resumePath = opts.resume || path.join(__dirname, '..', 'examples', 'example-resume.json');
  if (!fs.existsSync(resumePath)) {
    console.error(`Resume file not found: ${resumePath}`);
    console.error('Pass --resume <path.json> (see examples/example-resume.json for the schema).');
    process.exit(1);
  }
  const master = JSON.parse(fs.readFileSync(resumePath, 'utf-8'));

  let jdText = opts.text || '';
  let jobTitle = opts.title;
  let companyName = opts.company;

  if (opts.jdFile) {
    jdText = fs.readFileSync(opts.jdFile, 'utf-8');
  } else if (opts.url) {
    console.log('Fetching job description from ' + opts.url + '...');
    jdText = await fetchJobFromUrl(opts.url);
  }

  const wantsAi = !opts.noAi && (jdText || opts.jdFile || opts.url);
  const activeMaster = jdText ? selectRelevantMaster(master, jdText, 4) : master;

  const companyInfo = opts.companyInfoFile ? fs.readFileSync(opts.companyInfoFile, 'utf-8') : opts.companyInfo;

  let tailored = {};
  if (wantsAi) {
    console.log(`Tailoring to: ${jobTitle} at ${companyName} (Ollama model: ${opts.model})${companyInfo ? ', with company brand-voice context' : ''}...`);
    try {
      const { tailorToJob } = require('../core/ai');
      const result = await tailorToJob(activeMaster, { jobTitle, companyName, jdText, companyInfo }, { ollamaUrl: opts.ollamaUrl, model: opts.model });
      if (result) {
        tailored = result;
        console.log('Tailored content received.');
      } else {
        console.warn('Could not parse Ollama output — rendering the resume untailored.');
      }
    } catch (e) {
      console.warn(`AI tailoring skipped (${e.message}) — rendering the resume untailored.`);
    }
  }

  const merged = {
    title: tailored.title || activeMaster.title,
    summary: tailored.summary || activeMaster.summary,
    bullets: tailored.bullets || [],
    skills: tailored.skills || activeMaster.skills,
  };

  let templateUsed, accentUsed, renderFn;
  if (customRender) {
    templateUsed = 'custom:' + path.basename(opts.customTemplate);
    accentUsed = opts.accent || customRender.defaultAccent || '#0076CE';
    renderFn = customRender.render;
  } else {
    templateUsed = opts.template || 'dark-sidebar-accent';
    accentUsed = opts.accent || TEMPLATES[templateUsed].defaultAccent;
    renderFn = TEMPLATES[templateUsed].render;
  }
  console.log(`Template: ${templateUsed}  Accent: ${accentUsed}`);
  const model = buildModel(merged, activeMaster, { template: templateUsed, accent: accentUsed });
  const html = renderFn(model);
  if (!html.includes('.resume {')) {
    console.warn('Warning: this template\'s root CSS rule does not open with the literal ".resume {" substring — the auto-fit engine (core/pdf.js) won\'t be able to persist its fitted font size into the saved .html file. The PDF itself will still render correctly.');
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const slug = (companyName === 'Unknown Company' ? master.name : companyName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const outDir = opts.out || path.join(process.cwd(), 'output', dateStr + '-' + slug);
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'resume.json'), JSON.stringify({
    tailored: merged,
    jobInfo: jdText ? { title: jobTitle, company: companyName, jdText: jdText.slice(0, 5000), companyInfo: companyInfo || null } : null,
    template: templateUsed, accent: accentUsed,
  }, null, 2));

  const htmlPath = path.join(outDir, 'resume.html');
  fs.writeFileSync(htmlPath, html);
  console.log('HTML:    ' + htmlPath);

  if (opts.noPdf) {
    console.log('\n=== DONE (HTML only — pass without --no-pdf for a PDF export) ===');
    return;
  }

  try {
    const { exportResume } = require('../core/pdf');
    const pdfPath = path.join(outDir, 'resume.pdf');
    const fit = await exportResume({ html, htmlPath, pdfPath });
    console.log(`Auto-fit base font: ${fit.baseFontPx}px (content ${fit.contentHeightPx}px / 1056px page)`);
    console.log('PDF:     ' + pdfPath);
    console.log('\n=== DONE ===');
  } catch (e) {
    console.warn(`\nPDF export skipped: ${e.message}`);
    console.warn('Install Playwright to enable PDF export: npm install playwright && npx playwright install chromium');
    console.log('\n=== DONE (HTML only) ===');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
