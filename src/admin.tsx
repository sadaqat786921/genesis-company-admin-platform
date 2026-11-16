import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Lock, Undo2, Save, X, Plus, Check, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { Btn, Modal, Field, InfoTip } from './ui';
import { TOKENS, TOKEN_LABEL } from './seed';

/* Building blocks every Company Admin page uses, so all pages look and behave the same:
   list → edit → Undo / Save → a short reason for important changes → an Audit history entry. */

/** A copy of saved settings to edit. `dirty` is true when it differs from what is saved. */
export function useDraft<T>(saved: T) {
  const key = JSON.stringify(saved);
  const [d, setD] = useState<T>(saved);
  useEffect(() => { setD(JSON.parse(key)); }, [key]);
  return { d, set: setD, patch: (p: Partial<T>) => setD(x => ({ ...x, ...p })), dirty: JSON.stringify(d) !== key, undo: () => setD(JSON.parse(key)) };
}

/** On / off switch. */
export function Toggle({ on, onChange, label, disabled, title }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; title?: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} title={title ?? label} disabled={disabled} className={`swt${on ? ' on' : ''}`} onClick={e => { e.stopPropagation(); onChange(!on); }}><i /></button>;
}

/** Sticky bar at the bottom of every editor: what changed, Undo and Save. Important changes ask for a short reason first. */
export function SaveBar({ dirty, onUndo, onSave, important, note, saveLabel = 'Save changes', blocked }: { dirty: boolean; onUndo: () => void; onSave: (reason?: string) => void; important?: boolean | string; note?: ReactNode; saveLabel?: string; blocked?: string }) {
  const [ask, setAsk] = useState(false);
  return <>
    <div className={`savebar${dirty ? ' on' : ''}`} role="region" aria-label="Save changes">
      <span className={`svdot${dirty ? ' on' : ''}`} />
      <div className="stack grow"><b>{dirty ? 'You have changes that are not saved' : 'Everything is saved'}</b>{(blocked && dirty) ? <span className="caption" style={{ color: 'var(--err)' }}>{blocked}</span> : note && <span className="caption">{note}</span>}</div>
      <Btn kind="outline" icon={<Undo2 size={16} />} disabled={!dirty} onClick={onUndo}>Undo</Btn>
      <Btn icon={<Save size={16} />} disabled={!dirty || !!blocked} onClick={() => important ? setAsk(true) : onSave()}>{saveLabel}</Btn>
    </div>
    {ask && <ReasonModal title="Why are you making this change?" sub={typeof important === 'string' ? important : 'This change is important, so the reason is saved in the Audit history.'} cta={saveLabel} onClose={() => setAsk(false)} onDone={r => { setAsk(false); onSave(r); }} />}
  </>;
}

export function ReasonModal({ title, sub, cta = 'Save', danger, onClose, onDone, children }: { title: string; sub?: string; cta?: string; danger?: boolean; onClose: () => void; onDone: (r: string) => void; children?: ReactNode }) {
  const [r, setR] = useState('');
  return <Modal title={title} sub={sub} onClose={onClose} footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn kind={danger ? 'danger' : 'primary'} disabled={r.trim().length < 3} onClick={() => onDone(r.trim())}>{cta}</Btn></>}>
    {children}
    <Field label="Reason" hint="Saved in the Audit history. It can't be changed later."><textarea className="input" value={r} autoFocus onChange={e => setR(e.target.value)} placeholder="For example: client asked for 5 days instead of 3" /></Field>
  </Modal>;
}

/** Ask before deleting. A reason is always asked for, because deleting can't be undone. */
export function DeleteModal({ what, detail, onClose, onDone }: { what: string; detail?: string; onClose: () => void; onDone: (r: string) => void }) {
  return <ReasonModal danger title={`Delete ${what}?`} sub={detail ?? "This can't be undone. The Audit history keeps a record of it."} cta="Delete" onClose={onClose} onDone={onDone} />;
}

/** A small grey chip with a lock: this part is set by the client's flow chart or by law and can't be changed here. */
export function Locked({ why, children = 'Locked' }: { why: string; children?: ReactNode }) {
  return <span className="lockchip"><Lock size={12} />{children}<InfoTip label={why}>{why}</InfoTip></span>;
}

/** Choose several options as chips. */
export function MultiPick<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T[]; onChange: (v: T[]) => void; label: string }) {
  return <div className="mpick" role="group" aria-label={label}>{options.map(o => { const on = value.includes(o); return <button key={o} type="button" aria-pressed={on} className={on ? 'on' : ''} onClick={() => onChange(on ? value.filter(x => x !== o) : [...value, o])}>{on && <Check size={13} />}{o}</button>; })}</div>;
}

/** Type a value and press Enter to add it as a chip (postcodes, list items). */
export function ChipsInput({ value, onChange, placeholder, upper, label }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; upper?: boolean; label: string }) {
  const [t, setT] = useState('');
  const add = () => { const v = (upper ? t.toUpperCase() : t).trim(); if (v && !value.includes(v)) onChange([...value, v]); setT(''); };
  return <div className="chipsin">
    {value.map(v => <span key={v} className="chipx">{v}<button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter(x => x !== v))}><X size={12} /></button></span>)}
    <input aria-label={label} value={t} placeholder={placeholder} onChange={e => setT(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} onBlur={add} />
    {t && <button type="button" className="chipadd" onClick={add}><Plus size={13} />Add</button>}
  </div>;
}

/** Put sample values into {details}. */
export const fill = (text: string, over: Record<string, string> = {}) => text.replace(/\{(\w+)\}/g, (m, k) => over[k] ?? TOKENS[k] ?? m);
export const tokensIn = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]))];
export const unknownTokens = (text: string) => tokensIn(text).filter(k => !(k in TOKENS));

/** Subject and message fields with clickable details that are put in where the cursor is. */
export function TokenFields({ fields, tokens }: { fields: { label: string; value: string; set: (v: string) => void; rows?: number; hint?: ReactNode }[]; tokens: string[] }) {
  const refs = useRef<(HTMLInputElement | HTMLTextAreaElement | null)[]>([]);
  const [focus, setFocus] = useState(fields.length - 1);
  const pos = useRef<number[]>([]);
  const insert = (k: string) => {
    const i = focus; const f = fields[i]; const el = refs.current[i];
    const at = pos.current[i] ?? f.value.length; const tok = `{${k}}`;
    f.set(f.value.slice(0, at) + tok + f.value.slice(at));
    pos.current[i] = at + tok.length;
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + tok.length, at + tok.length); });
  };
  return <div className="col" style={{ gap: 14 }}>
    {fields.map((f, i) => <Field key={f.label} label={f.label}>
      {f.rows ? <textarea ref={el => { refs.current[i] = el; }} className="input" rows={f.rows} value={f.value} onFocus={() => setFocus(i)} onSelect={e => { pos.current[i] = e.currentTarget.selectionStart; }} onChange={e => { pos.current[i] = e.target.selectionStart; f.set(e.target.value); }} style={{ minHeight: f.rows * 22 }} />
        : <input ref={el => { refs.current[i] = el; }} className="input" value={f.value} onFocus={() => setFocus(i)} onSelect={e => { pos.current[i] = e.currentTarget.selectionStart ?? f.value.length; }} onChange={e => { pos.current[i] = e.target.selectionStart ?? 0; f.set(e.target.value); }} />}
      {f.hint}
    </Field>)}
    <div className="stack" style={{ gap: 8 }}>
      <span className="caption">Click a detail to put it in <b style={{ color: 'var(--text-primary)' }}>{fields[focus]?.label.toLowerCase()}</b> where the cursor is</span>
      <div className="tokens">{tokens.map(k => <button key={k} type="button" onMouseDown={e => e.preventDefault()} onClick={() => insert(k)} title={`Sample: ${TOKENS[k]}`}><span>{'{'}{k}{'}'}</span>{TOKEN_LABEL[k] ?? k}</button>)}</div>
    </div>
  </div>;
}

/** The LSP paper used for every document, filled with sample details. */
export function Paper({ title, body, footer, logo = 'images/logo.svg', stamp }: { title: string; body: string; footer: string; logo?: string; stamp?: string }) {
  return <div className="docwrap"><div className="paper" style={{ minHeight: 460 }}>
    <div className="doc-h"><img className="doc-logo" src={logo} alt="LSP" /><div className="stack" style={{ alignItems: 'flex-end' }}><span>1 Upper Street, London N1 0PQ</span><span>020 7946 0000 · hello@lsp.co.uk</span></div></div>
    <div className="doc-title">{fill(title)}{stamp && <span className="chip info nodot">{stamp}</span>}</div>
    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 13 }}>{fill(body)}</div>
    <div className="doc-f"><span>{fill(footer)}</span><span>Page 1 of 1</span></div>
  </div></div>;
}

/** Download rows as a CSV file. */
export function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** One line for the audit: a list of what changed between two objects. */
export function changed<T extends object>(before: T, after: T, labels: Partial<Record<keyof T, string>>): { what: string; before: string; after: string } {
  const keys = (Object.keys(labels) as (keyof T)[]).filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
  const show = (v: unknown) => Array.isArray(v) ? v.join(', ') || '—' : typeof v === 'boolean' ? (v ? 'On' : 'Off') : v === null || v === undefined || v === '' ? '—' : String(v);
  return {
    what: keys.length ? 'Changed ' + keys.map(k => labels[k]).join(', ').toLowerCase() : 'No change',
    before: keys.map(k => `${labels[k]}: ${show(before[k])}`).join(' · ') || '—',
    after: keys.map(k => `${labels[k]}: ${show(after[k])}`).join(' · ') || '—',
  };
}

/** Text message length: 160 characters per text (153 when it needs more than one). */
export const smsCount = (t: string) => { const n = t.length; return { n, parts: n <= 160 ? 1 : Math.ceil(n / 153) }; };

/** Edit a list of short texts: rename, move up or down, remove, add. Keeps at least `min` items. */
export function ListEditor({ items, onChange, min = 0, placeholder = 'Add an item', label, locked = [] }: { items: string[]; onChange: (v: string[]) => void; min?: number; placeholder?: string; label: string; locked?: string[] }) {
  const [t, setT] = useState('');
  const move = (i: number, by: number) => { const n = [...items]; const [v] = n.splice(i, 1); n.splice(i + by, 0, v); onChange(n); };
  const add = () => { const v = t.trim(); if (!v || items.some(x => x.toLowerCase() === v.toLowerCase())) return; onChange([...items, v]); setT(''); };
  const dup = t.trim() && items.some(x => x.toLowerCase() === t.trim().toLowerCase());
  return <div>
    {items.map((it, i) => <div key={i} className={`irow${locked.includes(it) ? ' lockd' : ''}`}>
      <span className="n">{i + 1}</span>
      <input className="input grow" aria-label={`${label} ${i + 1}`} value={it} onChange={e => onChange(items.map((x, k) => k === i ? e.target.value : x))} />
      <div className="icon-btns">
        <Btn sm kind="ghost" icon={<ArrowUp size={14} />} disabled={i === 0} onClick={() => move(i, -1)} title="Move up" />
        <Btn sm kind="ghost" icon={<ArrowDown size={14} />} disabled={i === items.length - 1} onClick={() => move(i, 1)} title="Move down" />
        <Btn sm kind="ghost" icon={<Trash2 size={14} />} disabled={items.length <= min || locked.includes(it)} onClick={() => onChange(items.filter((_, k) => k !== i))} title={items.length <= min ? `Keep at least ${min}` : 'Remove'} />
      </div>
    </div>)}
    {!items.length && <div className="empty" style={{ padding: 16 }}>Nothing here yet. Add the first one below.</div>}
    <div className="flex" style={{ marginTop: 10 }}>
      <input className="input grow" aria-label={`New ${label.toLowerCase()}`} value={t} placeholder={placeholder} onChange={e => setT(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
      <Btn kind="outline" icon={<Plus size={16} />} disabled={!t.trim() || !!dup} onClick={add}>Add</Btn>
    </div>
    {dup && <span className="caption" style={{ color: 'var(--err)' }}>That one is already in the list.</span>}
    {min > 0 && <span className="caption">Keep at least {min}.</span>}
  </div>;
}
