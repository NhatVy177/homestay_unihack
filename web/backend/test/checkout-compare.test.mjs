import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { CheckoutComparison, ghiNhanHuHongLucVao, MAX_PHOTOS } from '../services/traPhongSoSanh.service.js';

const manager = { vaiTro: 'NhanVien', chucVu: 'Quản lý', maNguoiDung: 'NV0002', maChiNhanh: 'CN0001' };
const png = () => ({ mimetype: 'image/png', originalname: 'nem.png',
  buffer: Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.from('synthetic-test-image')]) });
const signedPayload = {
  schema: 'homestaydorm.handover.v2', notes: 'Phòng sạch',
  inventory: [{ item: 'Nệm', quantity: 2, condition: 'Rách góc 5 cm' }, { item: 'Tủ', quantity: 1, condition: 'Không có ghi chú' }],
  attachments: [{ name: 'nem.png', mediaType: 'image/png', dataBase64: 'iVBORw0K' }, { name: 'ghi-chu.pdf', mediaType: 'application/pdf', dataBase64: 'JVBERi0=' }],
};

class Repository {
  phieuData = { maPhieuTra: 'PT0001', maHopDong: 'HD0001', trangThai: 'Chờ xử lý', maChiNhanh: 'CN0001' };
  case = null; rows = []; next = 1;
  web2 = { maBienBan: 'BB0001', ghiChu: 'Web2', taiSan: [{ MaTaiSan: 'TS001', TenTaiSan: 'Nệm', SoLuongThucTe: 2, GhiChu: 'Rách góc 5 cm' },
    { MaTaiSan: 'TS002', TenTaiSan: 'Tủ', SoLuongThucTe: 1, GhiChu: null }] };
  async phieu(id) { return id === 'PT0001' ? { ...this.phieuData } : null; }
  async caseForContract() { return this.case && structuredClone(this.case); }
  async web2MoveIn() { return this.web2; }
  async photos() { return this.rows.map(r => ({ ...r })); }
  async addPhoto(id, record) {
    if (this.rows.length >= MAX_PHOTOS) return undefined;
    const row = { maAnh: this.next++, ...record };
    this.rows.push(row); return { maAnh: row.maAnh };
  }
  async removePhoto(id, maAnh) {
    const i = this.rows.findIndex(r => r.maAnh === maAnh);
    return i < 0 ? undefined : this.rows.splice(i, 1)[0];
  }
}

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'homestaydorm-checkout-'));
  t.after(async () => {
    assert.ok(dirname(resolve(directory)) === resolve(tmpdir()) && directory.includes('homestaydorm-checkout-'));
    await rm(directory, { recursive: true, force: true });
  });
  const repository = new Repository();
  return { directory, repository, service: new CheckoutComparison({ repository, directory }) };
}

test('C2: only a manager of the same branch reads the move-in record', async t => {
  const { service } = await fixture(t);
  await assert.rejects(service.moveIn({ ...manager, chucVu: 'Kế toán' }, 'PT0001'), e => e.statusCode === 403);
  await assert.rejects(service.moveIn({ vaiTro: 'KhachHang', maNguoiDung: 'KH0001' }, 'PT0001'), e => e.statusCode === 403);
  await assert.rejects(service.moveIn({ ...manager, maChiNhanh: 'CN0009' }, 'PT0001'), e => e.statusCode === 404);
  await assert.rejects(service.moveIn(manager, "PT0001'; DROP"), e => e.statusCode === 400);
});

test('C2: prefers the version the tenant confirmed, maps asset codes by name, returns only images', async t => {
  const { service, repository } = await fixture(t);
  repository.case = {
    drafts: [{ revision: 1, handover: { payload: { ...signedPayload, inventory: [{ item: 'Nệm', quantity: 2, condition: 'Không có ghi chú' }] } } }],
    handover: { revision: 2, documents: { handover: { payload: signedPayload } }, confirmationReceipt: { at: '2026-11-11T08:00:00.000Z' } },
  };
  const view = await service.moveIn(manager, 'PT0001');
  assert.equal(view.nguon, 'xac-nhan-dien-tu');
  assert.equal(view.khachDaXacNhan, true);
  assert.equal(view.phienBan, 2);
  assert.equal(view.xacNhanLuc, '2026-11-11T08:00:00.000Z');
  assert.deepEqual(view.taiSan.map(i => [i.maTaiSan, i.tinhTrang, i.coHuHongLucVao]),
    [['TS001', 'Rách góc 5 cm', true], ['TS002', 'Không có ghi chú', false]]);
  assert.deepEqual(view.anh.map(a => a.ten), ['nem.png'], 'PDF attachments are not shown as photos');
});

test('C2: an unconfirmed draft is marked as such; without any case falls back to the Web2 minute', async t => {
  const { service, repository } = await fixture(t);
  repository.case = { drafts: [{ revision: 3, handover: { payload: signedPayload } }], handover: null };
  const draft = await service.moveIn(manager, 'PT0001');
  assert.equal(draft.khachDaXacNhan, false);
  assert.equal(draft.phienBan, 3);
  repository.case = null;
  const web2 = await service.moveIn(manager, 'PT0001');
  assert.equal(web2.nguon, 'web2');
  assert.equal(web2.khachDaXacNhan, false);
  assert.equal(web2.taiSan[1].tinhTrang, 'Không có ghi chú');
  repository.web2 = null;
  assert.equal((await service.moveIn(manager, 'PT0001')).nguon, 'khong-co');
});

test('C2: move-in defect detection ignores plain "OK" notes', () => {
  for (const ok of ['', null, 'Không có ghi chú', 'Bình thường.', 'tốt', 'Mới']) assert.equal(ghiNhanHuHongLucVao(ok), false, String(ok));
  for (const bad of ['Rách góc', 'Trầy nhẹ', 'Thiếu 1 chìa']) assert.equal(ghiNhanHuHongLucVao(bad), true, bad);
});

test('C2: photos are private, hashed, limited, and frozen once the inspection is saved', async t => {
  const { service, repository, directory } = await fixture(t);
  const saved = await service.upload(manager, 'PT0001', png(), 'TS001_1');
  assert.equal(saved.keyTaiSan, 'TS001_1');
  assert.equal(saved.sha256.length, 64);
  assert.equal('storedName' in saved, false, 'stored file names stay server-side');
  assert.equal((await service.photos(manager, 'PT0001'))[0].storedName, undefined);
  const { buffer } = await service.read(manager, 'PT0001', saved.maAnh);
  assert.deepEqual(buffer, png().buffer);

  await assert.rejects(service.upload(manager, 'PT0001', { mimetype: 'image/png', buffer: Buffer.from('not-a-png') }), e => e.statusCode === 400);
  await assert.rejects(service.upload(manager, 'PT0001', png(), '../x'), e => e.statusCode === 400);

  const [name] = await readdir(directory);
  await writeFile(join(directory, name), 'tampered');
  await assert.rejects(service.read(manager, 'PT0001', saved.maAnh), /đã thay đổi/);

  while (repository.rows.length < MAX_PHOTOS) await service.upload(manager, 'PT0001', png());
  await assert.rejects(service.upload(manager, 'PT0001', png()), /tối đa/);
  assert.equal((await readdir(directory)).length, MAX_PHOTOS, 'a refused upload leaves no file behind');

  await service.remove(manager, 'PT0001', saved.maAnh);
  assert.equal(repository.rows.some(r => r.maAnh === saved.maAnh), false);
  repository.phieuData.trangThai = 'Đã xử lý';
  await assert.rejects(service.upload(manager, 'PT0001', png()), /không đổi ảnh/);
  await assert.rejects(service.remove(manager, 'PT0001', repository.rows[0].maAnh), /không đổi ảnh/);
  assert.equal((await service.photos(manager, 'PT0001')).length, MAX_PHOTOS - 1, 'reading still works after the inspection');
});
