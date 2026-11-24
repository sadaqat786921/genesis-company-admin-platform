import { useEffect, useRef, useState } from 'react';
import { Heading2, Pilcrow } from 'lucide-react';
import type { AgVersion, Section } from '../seed';

/* Long documents (agreements): plain paragraphs, headings start with "# ".
   Shown as A4 pages; edited in a simple page editor (Heading / Text only, no bullet points). */

export interface Block { h?: boolean; t: string }
export const toBlocks = (body: string): Block[] => body.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).map(x => x.startsWith('# ') ? { h: true, t: x.slice(2).trim() } : { t: x });
export const bodyOf = (v: AgVersion) => v.body ?? v.sections.map(s => `# ${s.h}\n\n${s.t}`).join('\n\n');
export const sectionsOf = (body: string): Section[] => {
  const out: Section[] = [];
  toBlocks(body).forEach(b => { if (b.h || !out.length) out.push({ h: b.h ? b.t : 'Introduction', t: b.h ? '' : b.t }); else out[out.length - 1].t += (out[out.length - 1].t ? '\n\n' : '') + b.t; });
  return out;
};
export const wordsOf = (body: string) => body.replace(/^# /gm, '').split(/\s+/).filter(Boolean).length;
const PAGE = 2900; // characters that fit on one A4 page at this size
export function pagesOf(blocks: Block[]): Block[][] {
  const pages: Block[][] = [[]]; let used = 0;
  blocks.forEach((b, i) => {
    const size = b.h ? 160 : b.t.length + 80;
    const keep = b.h && blocks[i + 1] ? (blocks[i + 1].t.length + 80) : 0; // a heading never sits alone at the bottom
    if (used && used + size + keep > PAGE) { pages.push([]); used = 0; }
    pages[pages.length - 1].push(b); used += size;
  });
  return pages;
}
export const pageCount = (body: string) => body.trim() ? pagesOf(toBlocks(body)).length : 0;

/** The document on A4 pages: logo and title on page 1, page numbers on every page. */
export function DocPages({ title, sub, body, logo = 'images/logo.svg' }: { title: string; sub?: string; body: string; logo?: string }) {
  const pages = pagesOf(toBlocks(body));
  return <div className="docwrap pages">{pages.map((p, i) => <div key={i} className="paper a4">
    {i === 0 && <><div className="doc-h"><img className="doc-logo" src={logo} alt="LSP" /><div className="stack" style={{ alignItems: 'flex-end' }}><span>1 Upper Street, London N1 0PQ</span><span>020 7946 0000 · hello@lsp.co.uk</span></div></div>
      <div className="stack" style={{ gap: 4 }}><div className="doc-title">{title}</div>{sub && <span className="caption">{sub}</span>}</div></>}
    <div className="ag-body">{p.map((b, k) => b.h ? <h3 key={k} className="ag-h">{b.t}</h3> : <p key={k} className="ag-p">{b.t}</p>)}</div>
    <div className="doc-f"><span>{title}</span><span>Page {i + 1} of {pages.length}</span></div>
  </div>)}</div>;
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const toHtml = (body: string) => toBlocks(body).map(b => b.h ? `<h2>${esc(b.t)}</h2>` : `<p>${esc(b.t).replace(/\n/g, '<br>')}</p>`).join('') || '<p><br></p>';
function read(root: HTMLElement) {
  const out: string[] = [];
  root.childNodes.forEach(n => {
    const t = (n instanceof HTMLElement ? n.innerText : n.textContent ?? '').replace(/ /g, ' ').trim();
    if (!t) return;
    out.push(n instanceof HTMLElement && /^H[1-6]$/.test(n.tagName) ? '# ' + t.replace(/\s*\n\s*/g, ' ') : t);
  });
  return out.join('\n\n');
}

/** A page you type or paste into. Two styles only: Heading and Text. */
export function DocEditor({ value, onChange, title }: { value: string; onChange: (v: string) => void; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [kind, setKind] = useState<'h' | 'p'>('p');
  useEffect(() => { if (ref.current) ref.current.innerHTML = toHtml(value); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const on = () => { const sel = document.getSelection(); let n = sel?.anchorNode as Node | null; while (n && n.parentNode !== ref.current) n = n.parentNode; if (n) setKind(n instanceof HTMLElement && /^H\d$/.test(n.tagName) ? 'h' : 'p'); };
    document.addEventListener('selectionchange', on); return () => document.removeEventListener('selectionchange', on);
  }, []);
  const sync = () => { if (ref.current) onChange(read(ref.current)); };
  const style = (k: 'h' | 'p') => { ref.current?.focus(); document.execCommand('formatBlock', false, k === 'h' ? 'h2' : 'p'); setKind(k); sync(); };
  const words = wordsOf(value); const pages = pageCount(value);
  return <div className="docwrap pages">
    <div className="edtool">
      <div className="seg sm" role="group" aria-label="Style">
        <button type="button" className={kind === 'h' ? 'on' : ''} onMouseDown={e => { e.preventDefault(); style('h'); }}><Heading2 size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Heading</button>
        <button type="button" className={kind === 'p' ? 'on' : ''} onMouseDown={e => { e.preventDefault(); style('p'); }}><Pilcrow size={14} style={{ marginRight: 6, verticalAlign: -2 }} />Text</button>
      </div>
      <span className="grow" />
      <span className="caption">{words.toLocaleString('en-GB')} words · {pages} {pages === 1 ? 'page' : 'pages'}</span>
    </div>
    <div className="paper a4 edit">
      <div className="doc-h"><img className="doc-logo" src="images/logo.svg" alt="LSP" /></div><div className="doc-title">{title}</div>
      <div ref={ref} className="ag-ed" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Agreement text" data-ph="Type or paste the agreement here"
        onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
        onInput={sync}
        onPaste={e => { e.preventDefault(); const t = e.clipboardData.getData('text/plain'); const html = t.split(/\r?\n\s*\r?\n|\r?\n/).map(x => x.trim()).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join(''); document.execCommand('insertHTML', false, html); sync(); }} />
    </div>
  </div>;
}
