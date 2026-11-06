import test from 'node:test';
import assert from 'node:assert/strict';
import { createTuDongDatCoc, MA_HE_THONG } from '../services/tuDongDatCoc.service.js';

const quiet = { warn() {}, error() {} };
const setup = ({ flag = '1', fail } = {}) => {
  const calls = [];
  const auto = createTuDongDatCoc({
    log: quiet,
    query: async () => ({ recordset: flag === null ? [] : [{ giaTri: flag }] }),
    exec: async (name, params) => {
      calls.push({ name, params: Object.fromEntries(params.map(p => [p.name, p.value])) });
      if (fail) throw fail;
    },
  });
  return { auto, calls };
};

test('D-020: hệ thống không có thao tác tự duyệt nhận cọc, quản lý luôn là người duyệt', () => {
  const { auto } = setup();
  assert.equal(auto.duyetNhanCoc, undefined);
});

test('D-019: tắt hoặc chưa có tham số/tài khoản hệ thống thì không chốt phiếu', async () => {
  for (const flag of ['0', null]) {
    const { auto, calls } = setup({ flag });
    assert.deepEqual(await auto.chotPhieu('DC0001'), { trangThai: 'tat' });
    assert.equal(calls.length, 0);
  }
});

test('D-019: bật thì chốt phiếu đứng tên tài khoản hệ thống, không bao giờ hủy phiếu', async () => {
  const { auto, calls } = setup();
  assert.deepEqual(await auto.chotPhieu('DC0001'), { trangThai: 'da-tu-dong' });
  assert.deepEqual(calls, [
    { name: 'dbo.SP_ChotPhieuDatCoc', params: { MaPhieuDatCoc: 'DC0001', MaNhanVienKeToan: MA_HE_THONG, Chot: 1, LyDo: null } },
  ]);
});

test('D-021: tự chốt trả số tiền cọc và hạn thanh toán để sale báo khách ngay', async () => {
  const han = new Date('2026-11-08T06:21:00Z');
  const auto = createTuDongDatCoc({
    log: quiet,
    query: async () => ({ recordset: [{ giaTri: '1' }] }),
    exec: async () => ({ recordset: [{ soTienCoc: '4400000.00', thoiHanThanhToan: han }] }),
  });
  assert.deepEqual(await auto.chotPhieu('DC0001'), { trangThai: 'da-tu-dong', soTienCoc: 4400000, thoiHanThanhToan: han });
});

test('D-019: không chốt được hoặc lỗi bất kỳ thì để kế toán chốt tay, không làm hỏng thao tác của sale', async () => {
  const expired = Object.assign(new Error('Phiếu đặt cọc đã quá hạn chốt và bị hủy tự động.'), { number: 50273 });
  const { auto } = setup({ fail: expired });
  assert.deepEqual(await auto.chotPhieu('DC0001'), { trangThai: 'cho-duyet-tay', lyDo: expired.message });
  const { auto: broken } = setup({ fail: new Error('mất kết nối') });
  assert.equal((await broken.chotPhieu('DC0001')).trangThai, 'cho-duyet-tay');
  const failingQuery = createTuDongDatCoc({ log: quiet, query: async () => { throw new Error('x'); }, exec: async () => assert.fail('không được gọi SP') });
  assert.equal(await failingQuery.dangBat(), false);
  assert.deepEqual(await failingQuery.chotPhieu('DC0001'), { trangThai: 'tat' });
});
