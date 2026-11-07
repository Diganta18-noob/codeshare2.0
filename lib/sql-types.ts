export interface SqlColumn { name: string; type: string; primaryKey: boolean; nullable: boolean }
export interface SqlTable { name: string; rowCount: number; columns: SqlColumn[] }
export interface SqlResult { statement: number; columns: string[]; rows: (string | number | null)[][]; affectedRows: number; truncated: boolean }
export interface SqlResponse { results: SqlResult[]; schema: SqlTable[]; executionTime: number; saved: boolean; revision: number }
export interface SqlDiagnostic {
  title: string;
  message: string;
  statement: number;
  line: number;
  column: number;
  sql: string;
  hint: string;
  example?: string;
  locationKind: 'statement';
}
export interface SavedSqlQuery {
  _id: string;
  sql: string;
  status: 'running' | 'success' | 'error';
  error: string | null;
  diagnostic: SqlDiagnostic | null;
  executionTime: number | null;
  databaseSaved: boolean;
  createdAt: string;
}
