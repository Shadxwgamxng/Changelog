import fs from 'node:fs';
import path from 'node:path';
const f = process.env.DB_FILE ?? path.resolve(process.cwd(), 'data', 'cbrn.db');
for (const s of ['', '-wal', '-shm']) fs.rmSync(f + s, { force: true });
console.log('Datenbank gelöscht:', f);
