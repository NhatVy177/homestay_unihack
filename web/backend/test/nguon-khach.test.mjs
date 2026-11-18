import test from 'node:test';
import assert from 'node:assert/strict';
import { baoCaoNguon, chuanHoaNguon, ghiNguon } from '../services/nguonKhach.service.js';

test('only known sources are stored; unknown or empty values are skipped', async () => {
  const log = [];
  const query = async (text, params) => { log.push(params); return { recordset: [] }; };
  assert.equal(chuanHoaNguon('Zalo'), 'Zalo');
  assert.equal(chuanHoaNguon('<script>'), null);
  assert.equal(await ghiNguon('DK0001', 'Facebook', { query }), true);
  assert.equal(log[0][0].value, 'Facebook');
  assert.equal(await ghiNguon('DK0001', 'TikTok', { query }), false);
  assert.equal(await ghiNguon(null, 'Zalo', { query }), false);
  assert.equal(log.length, 1);
});

test('report: conversion per source, unknown source last; not ready without the column; role check', async () => {
  const rows = [{ nguon: 'Chưa ghi nguồn', soHoSo: 6, soDatCoc: 2, soHopDong: 2 }, { nguon: 'Facebook', soHoSo: 4, soDatCoc: 2, soHopDong: 1 }];
  const ready = async (text) => (text.includes('COL_LENGTH') && !text.includes('EXEC') ? { recordset: [{ n: 60 }] } : { recordset: rows });
  const sale = { vaiTro: 'NhanVien', chucVu: 'Sale' };
  const report = await baoCaoNguon(sale, { query: ready });
  assert.deepEqual(report.rows.map((r) => [r.nguon, r.tyLeChot]), [['Facebook', 25], ['Chưa ghi nguồn', 33]]);
  assert.deepEqual(await baoCaoNguon(sale, { query: async () => ({ recordset: [{ n: null }] }) }), { ready: false, rows: [] });
  await assert.rejects(baoCaoNguon({ vaiTro: 'KhachHang' }, { query: ready }), /không có quyền/);
});
