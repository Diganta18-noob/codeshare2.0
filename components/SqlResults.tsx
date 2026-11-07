'use client';

import { useState } from 'react';
import type { SqlResponse } from '@/lib/sql-types';

export default function SqlResults({ data, title, tableName }: { data: SqlResponse; title?: string; tableName?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const text = data.results.map(result => [result.columns, ...result.rows].map(row => row.map(value => value === null ? 'NULL' : String(value)).join('\t')).join('\n')).join('\n\n');
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* optional convenience */ }
  }
  return <div className="sql-results">
    <div className="sql-summary"><div><strong>{title || 'Query results'}</strong><span>{data.saved ? 'Saved in MongoDB' : 'Read-only · no changes saved'} · {data.executionTime} ms</span></div><button onClick={copy} className="sql-small-button">{copied ? 'Copied' : 'Copy results'}</button></div>
    {data.results.map((result, index) => <section className="sql-result-set" key={index} aria-label={`Statement ${result.statement} results`}>
      <div className="sql-result-label">Statement {result.statement}<span>{result.columns.length ? `${result.rows.length}${result.truncated ? '+' : ''} rows returned` : `${result.affectedRows} rows affected`}</span></div>
      {result.columns.length > 0 && <div className="sql-grid-scroll" tabIndex={0} role="region" aria-label="Scrollable query results"><table className="sql-grid"><thead><tr><th scope="col" className="sql-row-number">#</th>{result.columns.map((column, i) => <th scope="col" key={i}>{column}{tableName && <small className="sql-column-type">{data.schema.find(t => t.name === tableName)?.columns.find(c => c.name === column)?.type}</small>}</th>)}</tr></thead><tbody>{result.rows.map((row, i) => <tr key={i}><td className="sql-row-number">{i + 1}</td>{row.map((cell, j) => <td key={j}>{cell === null ? <span className="sql-null">NULL</span> : typeof cell === 'string' && cell === '' ? <span className="sql-null">empty</span> : String(cell)}</td>)}</tr>)}{!result.rows.length && <tr><td colSpan={result.columns.length + 1} className="sql-empty">Query succeeded. No matching rows.</td></tr>}</tbody></table></div>}
      {result.truncated && <p className="sql-notice">Showing a limited preview. All data remains stored. Use LIMIT and OFFSET to view more rows.</p>}
    </section>)}
  </div>;
}
