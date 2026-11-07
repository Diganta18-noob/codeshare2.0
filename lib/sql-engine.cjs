const { Worker } = require('node:worker_threads');
const { createRequire } = require('node:module');
const path = require('node:path');


function runSql({ image, sql, readOnly = false }) {
  if (typeof sql !== 'string' || !sql.trim()) return Promise.reject(new Error('Enter a SQL query to run.'));
  if (Buffer.byteLength(sql) > 64000) return Promise.reject(new Error('SQL scripts must be smaller than 64 KB.'));
  if (image && image.length > 2 * 1024 * 1024) return Promise.reject(new Error('Database exceeds the 2 MB limit.'));
  const localRequire = createRequire(path.join(process.cwd(), 'package.json'));
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(process.cwd(), 'lib/sql-worker.cjs'), {
      workerData: { sql, image, readOnly, modulePath: localRequire.resolve('sql.js'), wasmPath: localRequire.resolve('sql.js/dist/sql-wasm.wasm') },
      resourceLimits: { maxOldGenerationSizeMb: 64 },
    });
    const timer = setTimeout(() => { worker.terminate(); reject(new Error('Query exceeded the 3 second time limit. Simplify your query and try again.')); }, 3000);
    worker.once('message', data => {
      clearTimeout(timer); worker.terminate();
      if (data.error) {
        const error = new Error(data.error);
        error.diagnostic = data.diagnostic;
        reject(error);
      } else resolve(data);
    });
    worker.once('error', error => { clearTimeout(timer); worker.terminate(); reject(error); });
    worker.once('exit', code => { clearTimeout(timer); if (code !== 0) reject(new Error('SQL worker stopped before completing.')); });
  });
}
module.exports = { runSql };
