'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SqlTable } from '@/lib/sql-types';

export default function SqlExplorer({ roomId }: { roomId: string }) {
  const [tables, setTables] = useState<SqlTable[]>([]);
  const [exists, setExists] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/sql`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load SQL tables');
      setTables(data.schema); setExists(data.exists); setError('');
    } catch (err: any) { setError(err.message); }
  }, [roomId]);
  useEffect(() => {
    load();
    const refresh = () => { load(); };
    window.addEventListener('codeshare-sql-saved', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('codeshare-sql-saved', refresh); window.removeEventListener('focus', refresh); };
  }, [load]);
  return <section className="sql-explorer" aria-label="SQL database explorer">
    <div className="sql-explorer-heading"><button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><span aria-hidden="true">{expanded ? '▾' : '▸'} ▱</span> SQL Database <small>{tables.length}</small></button><button className="sql-refresh" onClick={load} aria-label="Refresh SQL tables" title="Refresh SQL tables">↻</button></div>
    {expanded && <div className="sql-table-list">
      {error ? <p className="sql-explorer-note" role="status">{error}</p> : tables.length ? tables.map(table => <button key={table.name} className="sql-table-button" onClick={() => window.dispatchEvent(new CustomEvent('codeshare-sql-preview', { detail: { table: table.name } }))} title={`${table.name} · ${table.columns.map(c => `${c.name} ${c.type}`).join(', ')}`}><span aria-hidden="true">▦</span><span>{table.name}<small>{table.columns.length} columns</small></span><b>{table.rowCount}</b></button>) : <p className="sql-explorer-note">{exists ? 'No tables yet. Run CREATE TABLE to add one.' : 'Run SQL to create this room’s saved database.'}</p>}
    </div>}
    <button className="sql-history-open" onClick={() => window.dispatchEvent(new Event('codeshare-sql-history'))}>◷ <span>Query history</span><span aria-hidden="true">→</span></button>
  </section>;
}
