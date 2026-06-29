#!/usr/bin/env node
/* reverify.mjs — recompute the H1 citation-verification over gate0_1.transcript.json with
 * the corrected normalization (strips markdown backticks/quotes). The harness stored a
 * `verify` field using whatever norm() was loaded at run time; this is the authoritative,
 * after-the-fact pass used by EVIDENCE/gate0_1.md. It re-fetches the SAME pinned corpus and
 * literal-matches every stored quote — no harness calls, no model, fully reproducible. */
import { readFileSync } from 'node:fs';

const REPO = 'c-u-l8er/AmpersandBoxDesign', REF = '353d1679a799bd4b6f0bea0dc126ddbe085462cc', PREFIX = 'box-and-box/';
const RAW = `https://raw.githubusercontent.com/${REPO}/${REF}/${PREFIX}`;
const PATHS = ['README.md', 'bridge.mjs', 'value.mjs', 'score.mjs', 'govern.mjs', 'reflexive.mjs', 'compose.mjs', 'index.mjs', 'test/laws.mjs'];
const FILESET = new Set(PATHS);
const norm = (s) => String(s || '').toLowerCase().replace(/[`"""'']/g, '').replace(/\s+/g, ' ').trim();

const BY = {};
for (const p of PATHS) { const r = await fetch(RAW + p, { cache: 'no-store' }); BY[p] = r.ok ? await r.text() : ''; }
const verify = (cites = []) => {
  const checked = cites.map((c) => {
    const src = BY[c.file]; const inCorpus = FILESET.has(c.file);
    const verified = !!src && norm(src).includes(norm(c.quote));
    return { file: c.file, quote: c.quote, inCorpus, verified };
  });
  const total = checked.length, ok = checked.filter((c) => c.verified).length;
  return { total, verified: ok, verify_rate: total ? +(ok / total).toFixed(3) : 0, checked };
};

const t = JSON.parse(readFileSync(new URL('./gate0_1.transcript.json', import.meta.url), 'utf8'));
const mean = (xs) => xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(3) : 0;
const rows = { single: [], sampled: [], board: [] };
for (const tid of t.single.map((x) => x.tid)) {
  const s = t.single.find((x) => x.tid === tid);
  const k = t.sampled.find((x) => x.tid === tid);
  const b = t.board.find((x) => x.tid === tid);
  const vs = verify(s?.cites), vk = k ? verify(k.chosen.cites) : null, vb = b ? verify(b.cites) : null;
  rows.single.push(vs.verify_rate); if (vk) rows.sampled.push(vk.verify_rate); if (vb) rows.board.push(vb.verify_rate);
  console.log(`${tid}:  A ${vs.verified}/${vs.total} (${vs.verify_rate})   A' ${vk ? vk.verified + '/' + vk.total + ' (' + vk.verify_rate + ')' : '—'}   B' ${vb ? vb.verified + '/' + vb.total + ' (' + vb.verify_rate + ')  in_posts=' + (b.extractive?.in_posts_rate ?? '?') : '—'}`);
  if (vb) for (const c of vb.checked) if (!c.verified) console.log(`     B' UNVERIFIED: ${c.file} :: ${c.quote.slice(0, 70)}${c.inCorpus ? '' : ' [file not in corpus]'}`);
}
console.log('\nmean citation_verify_rate:  single', mean(rows.single), ' sampled', mean(rows.sampled), ' board', mean(rows.board));
