// Explicitly authorized D-056 maintenance. check is read-only; dry-run always rolls back.
// migrate requires a durable snapshot outside the repository before it changes any rows.
import { readFile, mkdir, open } from 'node:fs/promises';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

export const testRoomIds = ['P921','P922','P923','P924','P925','P926','P927','P928','P941','P942'];
export const newRoomIds = ['P107','P108','P109','P207','P208','P209','P307','P308','P309'];
const quoted = ids => ids.map(id => `'${id}'`).join(',');
const hash = data => createHash('sha256').update(JSON.stringify(data)).digest('hex');
const repository = fileURLToPath(new URL('../../../', import.meta.url));

export async function runRoomCatalog({ pool, sql, mode, backupDirectory }) {
  if (!['check', 'dry-run', 'migrate'].includes(mode)) throw new Error('Expected check, dry-run or migrate.');
  const database = (await pool.request().query('SELECT DB_NAME() AS name')).recordset[0].name;
  if (database !== 'HOMEDORM4') throw new Error('This maintenance is only authorized for HOMEDORM4.');
  let transaction;
  try {
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const request = () => new sql.Request(transaction);
    const before = (await request().query(`
      SELECT * FROM dbo.Phong WITH (HOLDLOCK) ORDER BY MaPhong;
      SELECT * FROM dbo.Giuong WITH (HOLDLOCK) ORDER BY MaPhong,MaGiuong;
    `)).recordsets;
    const roomDetailProcedure = (await request().query("SELECT OBJECT_DEFINITION(OBJECT_ID(N'dbo.SP_KhachMoi_ChiTietPhong')) AS definition")).recordset[0].definition;
    const discovered = before[0].filter(room => /\btest\b|thử nghiệm/i.test(room.TenPhong));
    const plan = { database, mode, testRooms: discovered.map(room => ({ id: room.MaPhong, name: room.TenPhong })),
      testBeds: before[1].filter(bed => testRoomIds.includes(bed.MaPhong)).length,
      newRoomsToInsert: newRoomIds.filter(id => !before[0].some(room => room.MaPhong === id)).length };
    if (mode === 'check') { await transaction.rollback(); transaction = null; return plan; }

    const directory = resolve(backupDirectory || resolve(repository, '../HomeStayDorm-local-backups/room-catalog'));
    const location = relative(repository, directory);
    if (!isAbsolute(location) && location !== '..' && !location.startsWith('..' + sep)) throw new Error('Backups must be outside the Git repository.');
    await mkdir(directory, { recursive: true });
    const snapshot = { createdAt: new Date().toISOString(), database, mode, targetIds: testRoomIds, newRoomIds,
      rooms: before[0].filter(room => testRoomIds.includes(room.MaPhong) || newRoomIds.includes(room.MaPhong)),
      beds: before[1].filter(bed => testRoomIds.includes(bed.MaPhong) || newRoomIds.includes(bed.MaPhong)),
      roomDetailProcedure,
      beforeHashes: before.map(hash) };
    const backupPath = resolve(directory, `${new Date().toISOString().replace(/[:.]/g, '-')}-${mode}-${randomUUID()}.json`);
    const file = await open(backupPath, 'wx', 0o600);
    try { await file.writeFile(JSON.stringify(snapshot, null, 2), 'utf8'); await file.sync(); } finally { await file.close(); }
    if (hash(JSON.parse(await readFile(backupPath, 'utf8'))) !== hash(snapshot)) throw new Error('Backup verification failed.');

    const statement = await readFile(new URL('../../../database/migrations/20261117_room_catalog_cleanup.sql', import.meta.url), 'utf8');
    const changes = (await request().batch(statement)).recordsets.at(-1)[0];
    const after = (await request().query('SELECT * FROM dbo.Phong ORDER BY MaPhong; SELECT * FROM dbo.Giuong ORDER BY MaPhong,MaGiuong;')).recordsets;
    const unaffected = rows => rows.filter(row => !testRoomIds.includes(row.MaPhong) && !newRoomIds.includes(row.MaPhong));
    if (before.some((rows, i) => hash(unaffected(rows)) !== hash(unaffected(after[i])))) throw new Error('Unrelated rooms or beds changed.');
    if (mode === 'dry-run') await transaction.rollback();
    else await transaction.commit();
    transaction = null;
    return { ...plan, changes, backupPath, committed: mode === 'migrate', unaffectedRowsUnchanged: true };
  } catch (error) {
    if (transaction) await transaction.rollback().catch(() => {});
    throw error;
  }
}

async function main() {
  const mode = process.argv[2] || 'check';
  if (process.argv.length > 4) throw new Error('Usage: room-catalog-db.mjs check|dry-run|migrate [backup-directory]');
  const { getPool, sql } = await import('../database/connection.js');
  const pool = await getPool();
  try { console.log(JSON.stringify(await runRoomCatalog({ pool, sql, mode, backupDirectory: process.argv[3] }), null, 2)); }
  finally { await pool.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
