import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { hostname } from 'node:os';
import dotenv from 'dotenv';
import { CREATE_TABLE as periodicInvoiceSchema } from './periodic-invoice-db.mjs';
import { ADD_COLUMNS as serviceCatalogSchema, CONTRACT_SERVICE_LIST } from './services-catalog-db.mjs';

dotenv.config();
const name = process.env.DB_NAME || '';
if (!/^HOMEDORM_DEMO_[A-Z0-9_]{1,25}$/.test(name)) {
  throw new Error('Đặt DB_NAME=HOMEDORM_DEMO_<tên> để tạo bộ dữ liệu thử riêng.');
}

const database = new URL('../../../database/', import.meta.url);
const migrations = [
  'SP_Chung/auth.sql',
  'SP_DKyThue/dang-ky-thue.sql',
  'SP_DKyThue/khach-moi.sql',
  'SP_NhanPhong/sp_hopdong_chitiet.sql',
  'migrations/20261105_avalanche.sql',
  'migrations/20261105b_payment_simulator.sql',
  'migrations/20261106_first_charge_payment.sql',
  'migrations/20261111_settlement_topup_wallet.sql',
  'migrations/20261112_checkout_lifecycle.sql',
  'migrations/20261113_registration_interested_rooms.sql',
  'migrations/20261114_viewing_confirmation.sql',
  'migrations/20261118_loyalty_points.sql',
];

function forDemo(source) {
  const scoped = source.replace(/^[ \t]*(?:CREATE DATABASE|USE)[ \t]+\[?HOMEDORM4\]?[ \t]*;?[ \t]*\r?$/gim, '');
  if (/^[ \t]*(?:USE\b|(?:CREATE|ALTER|DROP|BACKUP|RESTORE)[ \t]+DATABASE\b)/im.test(scoped)) {
    throw new Error('Tập lệnh chứa câu lệnh đổi hoặc quản trị cơ sở dữ liệu.');
  }
  return scoped.split(/^[ \t]*GO[ \t]*;?[ \t]*(?:--[^\r\n]*)?$/gim)
    .map(batch => batch.trim())
    .filter(Boolean);
}

async function initialize() {
  process.env.DB_NAME = 'master';
  const { getPool: getMaster } = await import('../database/connection.js?demo-bootstrap');
  const master = await getMaster();
  try {
    const { recordset: [server] } = await master.request().query("SELECT CONVERT(nvarchar(200), SERVERPROPERTY('MachineName')) AS machine");
    if (server.machine?.toLowerCase() !== hostname().toLowerCase()) throw new Error('Chỉ dựng bộ demo trên SQL Server cục bộ.');
    await master.request().query(`IF DB_ID('${name}') IS NULL CREATE DATABASE [${name}];`);
  } finally {
    await master.close();
  }

  process.env.DB_NAME = name;
  const { getPool, sql } = await import('../database/connection.js');
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  try {
    const { recordset: [info] } = await pool.request().query(`
      SELECT DB_NAME() AS db, OBJECT_ID('dbo.HomeDormDemoSeed', 'U') AS seeded,
        (SELECT COUNT(*) FROM sys.objects WHERE is_ms_shipped=0 AND type IN ('U','P','V','TR')) AS objectCount;`);
    if (info.db !== name) throw new Error('Kết nối không trỏ đúng cơ sở dữ liệu demo.');
    if (info.seeded) {
      console.log(`${name} đã có bộ mẫu. Dữ liệu và mật khẩu được giữ nguyên.`);
      return;
    }
    if (info.objectCount) throw new Error('CSDL demo đã có dữ liệu khác. Chọn tên CSDL demo mới.');
    const password = process.env.DEMO_SEED_PASSWORD || randomBytes(10).toString('base64url');
    if (password.length < 8 || password.length > 70) throw new Error('DEMO_SEED_PASSWORD cần từ 8 đến 70 ký tự.');
    await tx.begin();
    try {
      for (const batch of forDemo(await readFile(new URL('CreateDB/app_new.sql', database), 'utf8'))) await tx.request().batch(batch);
      await tx.request().batch(serviceCatalogSchema);
      await tx.request().batch(CONTRACT_SERVICE_LIST);
      for (const file of migrations) {
        try {
          const batches = forDemo(await readFile(new URL(file, database), 'utf8'));
          for (const batch of batches) await tx.request().batch(batch);
        } catch (error) {
          throw new Error(`Không dựng được ${file}: ${error.message}`);
        }
      }
      await tx.request().batch(periodicInvoiceSchema);
      const seed = await readFile(new URL('GenData/demo-scenarios.sql', database), 'utf8');
      await tx.request().input('Password', sql.VarChar(255), password).query(seed);
      const triggers = forDemo(await readFile(new URL('Trigger/trigger.sql', database), 'utf8'));
      for (const batch of triggers) await tx.request().batch(batch);
      await tx.request().query('CREATE TABLE dbo.HomeDormDemoSeed (SeededAt datetime2 NOT NULL); INSERT dbo.HomeDormDemoSeed VALUES (SYSDATETIME());');
      await tx.commit();
    } catch (error) {
      await tx.rollback().catch(() => {});
      throw error;
    }
    console.log(`Đã cài bộ demo trên ${name}. Tài khoản chính: demo-moi, demo-dang-o, demo-quan-ly, demo-ke-toan, demo-sale.`);
    if (!process.env.DEMO_SEED_PASSWORD) console.log(`Mật khẩu chung tạo riêng cho bộ demo: ${password}`);
  } finally {
    await pool.close();
  }
}

initialize().catch(error => { console.error(error.message); process.exitCode = 1; });
