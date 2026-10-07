// core/select.js — when a master resume holds many jobs (a full career
// pool), keep only the most relevant to a specific job description. A
// resume should show ~4 roles, not a full career history. Preserves
// original (reverse-chronological) order among the kept jobs.
function selectRelevantMaster(master, jdText, cap = 4) {
  const jobs = master.workHistory || [];
  if (jobs.length <= cap) return master;
  const jd = (jdText || '').toLowerCase();
  const scored = jobs.map((w, idx) => {
    const text = (w.title + ' ' + w.company + ' ' + (w.bullets || '')).toLowerCase();
    const words = [...new Set(text.replace(/[^a-z0-9+#. ]/g, ' ').split(/\s+/).filter(t => t.length > 3))];
    return { idx, score: words.filter(t => jd.includes(t)).length };
  });
  const keep = new Set(scored.sort((a, b) => b.score - a.score).slice(0, cap).map(s => s.idx));
  const workHistory = jobs.filter((_, i) => keep.has(i)); // filter preserves original order
  return { ...master, workHistory };
}

module.exports = { selectRelevantMaster };
