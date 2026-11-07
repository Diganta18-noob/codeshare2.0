'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SavedSqlQuery } from '@/lib/sql-types';
import { useEditorStore } from '@/store/editorStore';
import { socket } from '@/lib/socket';

export default function SqlHistory({ roomId, isReadOnly }: { roomId: string; isReadOnly: boolean }) {
  const [queries, setQueries] = useState<SavedSqlQuery[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [opening, setOpening] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/sql?history=1&page=${page}`, { cache: 'no-store', signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load query history.');
      if (signal?.aborted) return;
      setQueries(data.queries); setHasMore(data.hasMore);
      setSelectedId(current => data.queries.some((q: SavedSqlQuery) => q._id === current) ? current : data.queries[0]?._id || null);
    } catch (err: any) { if (!signal?.aborted) setError(err.message); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [roomId, page]);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const refresh = () => load(controller.signal);
    window.addEventListener('codeshare-sql-history-updated', refresh);
    return () => { controller.abort(); window.removeEventListener('codeshare-sql-history-updated', refresh); };
  }, [load]);
  const selected = queries.find(q => q._id === selectedId);
  async function copy() {
    if (!selected) return;
    try { await navigator.clipboard.writeText(selected.sql); setNotice('SQL copied.'); }
    catch { setNotice('Clipboard is unavailable. Select and copy the SQL text below.'); }
  }
  async function openFile() {
    if (!selected || isReadOnly) return;
    setOpening(true); setNotice('');
    const store = useEditorStore.getState();
    const base = `query-${selected._id.slice(-8)}`;
    let name = `${base}.sql`;
    for (let n = 2; store.files.some(file => file.name === name); n++) name = `${base}-${n}.sql`;
    const files = [...store.files, { name, code: selected.sql, language: 'sql' }];
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ files }) });
      if (!res.ok) throw new Error('Could not save the SQL file. Your existing files have not been changed.');
      // Preserve any edits made while the save was in flight.
      useEditorStore.getState().addFile(name, selected.sql, 'sql');
      socket.emit('file-tree-change', { roomId, files: useEditorStore.getState().files });
      setNotice(`Opened ${name}. Press Run to execute it.`);
    } catch (err: any) { setNotice(err.message); }
    finally { setOpening(false); }
  }
  return <section className="sql-history" aria-label="Saved SQL query history">
    <div className="sql-summary"><div><strong>Query history</strong><span>Every submitted script is saved in MongoDB, including failed runs.</span></div><button className="sql-small-button" onClick={() => load()} disabled={loading}>Refresh</button></div>
    {error ? <p className="sql-history-error" role="alert">{error}</p> : loading ? <p className="sql-explorer-note" role="status">Loading saved queries…</p> : !queries.length ? <p className="sql-explorer-note">No saved queries yet. Run SQL to start your history. Earlier runs from before this feature cannot be recovered.</p> : <div className="sql-history-layout">
      <div className="sql-history-list" aria-label="Previous SQL runs">{queries.map(query => <button key={query._id} className={`sql-history-item ${query._id === selectedId ? 'is-selected' : ''}`} aria-pressed={query._id === selectedId} onClick={() => { setSelectedId(query._id); setNotice(''); }}><span className={`sql-query-status is-${query.status}`}>{query.status === 'running' ? 'Started' : query.status === 'error' ? 'Error' : 'Success'}</span><time dateTime={query.createdAt}>{new Date(query.createdAt).toLocaleString()}</time><code>{query.sql.replace(/\s+/g, ' ').slice(0, 120)}</code></button>)}</div>
      {selected && <article className="sql-history-detail" aria-label="Selected query"><div className="sql-history-detail-heading"><span>{new Date(selected.createdAt).toLocaleString()} · {selected.executionTime ?? '—'} ms</span><div><button className="sql-small-button" onClick={copy}>Copy SQL</button>{!isReadOnly && <button className="sql-small-button" onClick={openFile} disabled={opening}>{opening ? 'Opening…' : 'Open SQL file'}</button>}</div></div><pre className="sql-history-code"><code>{selected.sql}</code></pre>{selected.error && <div className="sql-history-error"><strong>Run error</strong><pre>{selected.error}</pre>{selected.diagnostic && <p>{selected.diagnostic.hint}</p>}</div>}<p className="sql-explorer-note">{selected.status === 'running' ? 'The query was saved before execution. Its final outcome has not been recorded; refresh to check.' : selected.status === 'error' ? 'This run did not save changes to the room database.' : selected.databaseSaved ? 'Successful run · database saved in MongoDB.' : 'Successful read-only run · no database changes saved.'} Opening a query does not execute it or restore old table data.</p>{notice && <p className="sql-history-notice" role="status">{notice}</p>}</article>}
    </div>}
    <div className="sql-pagination"><button className="sql-small-button" disabled={page === 0 || loading} onClick={() => setPage(page - 1)}>Newer</button><span>Page {page + 1}</span><button className="sql-small-button" disabled={!hasMore || loading} onClick={() => setPage(page + 1)}>Older</button></div>
  </section>;
}
