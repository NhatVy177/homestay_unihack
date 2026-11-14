import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// D-026 mục 4: khách tự khai người ở, CCCD gốc đối chiếu lúc ký hợp đồng. Bỏ hai chốt chặn cũ
// "Sale phải đối chiếu giấy tờ trước khi lưu/gửi duyệt". Cột DaDoiChieuGiayTo vẫn giữ để ghi nhận đã đối chiếu.
// Chỉ đổi định nghĩa hai thủ tục, không đổi dữ liệu. Chỉ chạy trên HOMEDORM4 khi Vy cho phép.
const normalize = (definition) => definition.replace(/^\s*(?:CREATE(?:\s+OR\s+ALTER)?|ALTER)\s+PROC(?:EDURE)?\b/i, 'CREATE OR ALTER PROCEDURE');
const SAVE_GATE = /\n[ \t]*IF @DaDoiChieuGiayTo = 0\s*\n[ \t]*THROW 50012,[^\n]*\n/;
const SUBMIT_GATE = /\r?\n[ \t]*AND hs\.DaDoiChieuGiayTo=1;/;

export function patchSaveResidence(definition) {
  if (!definition) throw new Error('Không tìm thấy SP_LuuHoSoCuTru.');
  const normalized = normalize(definition);
  if (!/THROW 50012/.test(normalized)) return normalized;
  if (!SAVE_GATE.test(normalized)) throw new Error('Định nghĩa SP_LuuHoSoCuTru lạ; không ghi đè.');
  return normalized.replace(SAVE_GATE, '\n    -- D-026: CCCD gốc đối chiếu lúc ký hợp đồng, không chặn khi lưu.\n');
}

export function patchSubmitResidence(definition) {
  if (!definition) throw new Error('Không tìm thấy SP_GuiDuyetHoSoCuTru.');
  const normalized = normalize(definition);
  if (!/DaDoiChieuGiayTo=1/.test(normalized)) return normalized;
  if (!SUBMIT_GATE.test(normalized)) throw new Error('Định nghĩa SP_GuiDuyetHoSoCuTru lạ; không ghi đè.');
  return normalized.replace(SUBMIT_GATE, ';');
}

const defOf = async (pool, name) => (await pool.request().query(`SELECT OBJECT_DEFINITION(OBJECT_ID(N'dbo.${name}')) AS d`)).recordset[0]?.d;

async function main() {
  const mode = process.argv[2] || 'check';
  if (!['check', 'migrate'].includes(mode) || process.argv.length > 3) throw new Error('Usage: residence-self-declare-db.mjs check|migrate');
  const { getPool, sql } = await import('../database/connection.js');
  const pool = await getPool();
  try {
    const db = (await pool.request().query('SELECT DB_NAME() AS n')).recordset[0]?.n;
    if (!/^(HOMEDORM4|HOMEDORM_CONFIRM_TEST_\d+)$/.test(db)) throw new Error('Unexpected migration database.');
    if (mode === 'migrate') {
      const save = patchSaveResidence(await defOf(pool, 'SP_LuuHoSoCuTru'));
      const submit = patchSubmitResidence(await defOf(pool, 'SP_GuiDuyetHoSoCuTru'));
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        await new sql.Request(transaction).batch(save);
        await new sql.Request(transaction).batch(submit);
        await transaction.commit();
      } catch (error) { await transaction.rollback().catch(() => {}); throw error; }
    }
    const ready = !/THROW 50012/.test(await defOf(pool, 'SP_LuuHoSoCuTru')) && !/DaDoiChieuGiayTo=1/.test(await defOf(pool, 'SP_GuiDuyetHoSoCuTru'));
    console.log(JSON.stringify({ mode, databaseName: db, ready }));
    if (!ready) process.exitCode = 1;
  } finally { await pool.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
