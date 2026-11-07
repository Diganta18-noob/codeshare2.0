'use client';

import type { SqlDiagnostic } from '@/lib/sql-types';

export default function SqlError({ diagnostic, roomId }: { diagnostic: SqlDiagnostic; roomId: string }) {
  return <section className="sql-error" role="alert" aria-label="SQL error details">
    <div className="sql-error-heading"><div><strong>{diagnostic.title}</strong><span>Statement {diagnostic.statement} · starts at line {diagnostic.line}, column {diagnostic.column}</span></div><button className="sql-small-button" onClick={() => window.dispatchEvent(new CustomEvent('codeshare-sql-error-location', { detail: { roomId, line: diagnostic.line, column: diagnostic.column } }))}>Go to statement</button></div>
    <p className="sql-error-message"><span>SQLite says</span><code>{diagnostic.message}</code></p>
    <div className="sql-error-source" role="region" aria-label="Failing SQL statement" tabIndex={0}>{diagnostic.sql.split('\n').map((line, index) => <div className="sql-error-line" key={index}><span aria-hidden="true">{diagnostic.line + index}</span><code>{line || ' '}</code></div>)}</div>
    <div className="sql-error-help"><strong>How to fix</strong><p>{diagnostic.hint}</p>{diagnostic.example && <pre><code>{diagnostic.example}</code></pre>}</div>
    <p className="sql-error-rollback">This script was rolled back. No changes from this run were saved.</p>
  </section>;
}
