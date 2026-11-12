import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { ghiNhanKetQuaBuoiXem } from '../services/ketQuaBuoiXem.service.js';
import { patchAutoViewed, procedures } from '../scripts/viewing-status-db.mjs';

const sale = { vaiTro: 'NhanVien', chucVu: 'Sale', maNguoiDung: 'NV0001', maChiNhanh: 'CN0001' };

test('C5-a: only authenticated Sale records an explicit outcome, body cannot impersonate another actor', async () => {
  let called = 0;
  const run = async (name, parameters) => {
    called++;
    assert.equal(name, 'dbo.SP_GhiNhanKetQuaBuoiXem');
    const p = Object.fromEntries(parameters.map(x=>[x.name,x.value]));
    assert.equal(p.MaNhanVien, sale.maNguoiDung);
    assert.equal(p.MaDangKy, 'DK0001');
    assert.equal(p.STTLich, 2);
    assert.equal(p.KetQua, 'Đã xem');
    return { recordset: [{ trangThai: p.KetQua }] };
  };
  assert.equal((await ghiNhanKetQuaBuoiXem('DK0001-2', { thaoTac: 'da-xem', maNhanVien: 'NV9999' }, sale, run)).trangThai, 'Đã xem');
  for (const user of [null, { ...sale, vaiTro: 'KhachHang' }, { ...sale, chucVu: 'Kế toán' }, { ...sale, maChiNhanh: null }]) {
    await assert.rejects(ghiNhanKetQuaBuoiXem('DK0001-2', { thaoTac: 'da-xem' }, user, run), e=>e.statusCode===403);
  }
  assert.equal(called, 1);
});

test('C5-a: invalid input does not touch SQL; database conflicts/permissions propagate with proper status', async () => {
  const forbidden = async()=>{ throw new Error('SQL must not be called'); };
  for (const [id, data] of [['bad', {thaoTac:'da-xem'}], ['DK0001-2147483648',{thaoTac:'da-xem'}], ['DK0001-1',{thaoTac:'huy'}], ['DK0001-1',{thaoTac:'da-xem',ghiChuXuLy:'a'.repeat(501)}]]) {
    await assert.rejects(ghiNhanKetQuaBuoiXem(id, data, sale, forbidden), e=>e.statusCode===400);
  }
  for (const [number, status] of [[50330,403],[50331,404],[50332,409]]) {
    await assert.rejects(ghiNhanKetQuaBuoiXem('DK0001-1',{thaoTac:'khach-khong-den'},sale,async()=>{throw Object.assign(new Error('Conflict'),{number});}), e=>e.statusCode===status);
  }
});

test('C5-a migration removes only automatic updates and is idempotent, preserving other deployed SQL', async () => {
  let total = 0;
  for (const file of ['SP_DKyThue/khach-moi.sql','SP_DKyThue/dang-ky-thue.sql','SP_DatCoc/dat-coc-gui-yeu-cau.sql','SP_DatCoc/dat-coc-lap-phieu.sql']) {
    const current = await readFile(new URL('../../../database/'+file, import.meta.url),'utf8');
    assert.doesNotMatch(current,/SET\s+(?:lxp\.)?TrangThai\s*=\s*N'Đã xem'/i);
  }
  const legacy = `CREATE PROCEDURE dbo.SP_Test AS
BEGIN
    UPDATE dbo.LichXemPhong
    SET TrangThai = N'Đã xem'
    WHERE MaDangKy = @MaDangKy
      AND TrangThai IN (N'Chờ xem', N'Yêu cầu đổi lịch', N'Yêu cầu hủy')
      AND ThoiGianHen <= GETDATE();
    SELECT N'keep later migrations' AS preserved;
END;\n`;
  const patched = patchAutoViewed(legacy);
  assert.equal(patched.removed, 1); total += patched.removed;
  assert.match(patched.definition, /SELECT N'keep later migrations'/);
  assert.equal(patchAutoViewed(patched.definition).removed, 0);
  assert.throws(()=>patchAutoViewed(legacy.replace('<= GETDATE()', '<= SYSDATETIME()')), /Unexpected automatic/);
  assert.equal(procedures.length, 8);
  assert.equal(total, 1);
});
