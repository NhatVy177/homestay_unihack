import test from 'node:test';
import assert from 'node:assert/strict';
import { luuChungTuKyDau, layChungTuKyDauCuaKhach, layChungTuKyDau } from '../services/kyDauChungTu.service.js';

const khach = { vaiTro: 'KhachHang', maNguoiDung: 'KH0001' };
const file = { filename: 'HD0001-1700000000000.png', originalname: 'ck.png' };
const proofRow = { maHopDong: 'HD0001', duongDan: '/uploads/chung-tu/HD0001-1700000000000.png', tenTep: 'ck.png', ngayGui: '2026-11-16T01:00:00' };

function fakeQuery(contract) {
  const calls = [];
  const query = async (text) => {
    calls.push(text);
    if (/FROM dbo\.HopDongThue hd WHERE/.test(text)) return { recordset: contract ? [contract] : [] };
    if (/MERGE dbo\.ChungTuKyDau/.test(text)) return { recordset: [] };
    return { recordset: [proofRow] };
  };
  return { query, calls };
}

test('customer saves a first-charge proof for an active unpaid contract and reads it back', async () => {
  const { query, calls } = fakeQuery({ maKhachHang: 'KH0001', trangThai: 'Hiệu lực', daThu: false });
  const proof = await luuChungTuKyDau(khach, 'HD0001', file, { query });
  assert.equal(proof.duongDan, proofRow.duongDan);
  assert.ok(calls.some((text) => /MERGE dbo\.ChungTuKyDau/.test(text)));
});

test('first-charge proof is refused for a contract of someone else, an inactive one, a paid one or without a file', async () => {
  await assert.rejects(luuChungTuKyDau(khach, 'HD0001', file, { query: fakeQuery({ maKhachHang: 'KH0002', trangThai: 'Hiệu lực', daThu: false }).query }), /Không tìm thấy hợp đồng/);
  await assert.rejects(luuChungTuKyDau(khach, 'HD0001', file, { query: fakeQuery(null).query }), /Không tìm thấy hợp đồng/);
  await assert.rejects(luuChungTuKyDau(khach, 'HD0001', file, { query: fakeQuery({ maKhachHang: 'KH0001', trangThai: 'Chờ ký', daThu: false }).query }), /chưa ở trạng thái/);
  await assert.rejects(luuChungTuKyDau(khach, 'HD0001', file, { query: fakeQuery({ maKhachHang: 'KH0001', trangThai: 'Hiệu lực', daThu: true }).query }), /đã được thanh toán/);
  await assert.rejects(luuChungTuKyDau(khach, 'HD0001', null, { query: fakeQuery({ maKhachHang: 'KH0001', trangThai: 'Hiệu lực', daThu: false }).query }), /chọn ảnh hoặc PDF/);
  await assert.rejects(luuChungTuKyDau({ vaiTro: 'NhanVienSale', maNguoiDung: 'NV0001' }, 'HD0001', file), /Chỉ khách hàng/);
  await assert.rejects(luuChungTuKyDau(khach, '../x', file), /không hợp lệ/);
});

test('customer and accountant reads return the stored proof only for valid contract codes', async () => {
  const { query } = fakeQuery(null);
  assert.equal((await layChungTuKyDauCuaKhach(khach, 'HD0001', { query })).tenTep, 'ck.png');
  assert.equal((await layChungTuKyDau('HD0001', { query })).tenTep, 'ck.png');
  await assert.rejects(layChungTuKyDau('bad code!', { query }), /không hợp lệ/);
});
