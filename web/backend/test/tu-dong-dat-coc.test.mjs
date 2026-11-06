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

test('D-019: tắt hoặc chưa có tham số/tài khoản hệ thống thì không gọi SP nào', async () => {
  for (const flag of ['0', null]) {
    const { auto, calls } = setup({ flag });
    assert.deepEqual(await auto.duyetNhanCoc('DK0001'), { trangThai: 'tat' });
    assert.deepEqual(await auto.chotPhieu('DC0001'), { trangThai: 'tat' });
    assert.equal(calls.length, 0);
  }
});

test('D-019: bật thì duyệt và chốt đứng tên tài khoản hệ thống, không bao giờ từ chối hay hủy', async () => {
  const { auto, calls } = setup();
  assert.deepEqual(await auto.duyetNhanCoc('DK0001'), { trangThai: 'da-tu-dong' });
  assert.deepEqual(await auto.chotPhieu('DC0001'), { trangThai: 'da-tu-dong' });
  assert.deepEqual(calls, [
    { name: 'dbo.SP_XacNhanKhaNangNhanCoc', params: { MaDangKy: 'DK0001', MaQuanLy: MA_HE_THONG, DuocNhanCoc: 1, LyDo: null } },
    { name: 'dbo.SP_ChotPhieuDatCoc', params: { MaPhieuDatCoc: 'DC0001', MaNhanVienKeToan: MA_HE_THONG, Chot: 1, LyDo: null } },
  ]);
});

test('D-019: phòng không còn phù hợp hoặc lỗi bất kỳ thì để nhân viên duyệt tay, không làm hỏng thao tác của sale', async () => {
  const notAvailable = Object.assign(new Error('Phòng không đủ chỗ trống cho số người dự kiến ở.'), { number: 50209 });
  const { auto } = setup({ fail: notAvailable });
  assert.deepEqual(await auto.duyetNhanCoc('DK0001'), { trangThai: 'cho-duyet-tay', lyDo: notAvailable.message });
  const { auto: broken } = setup({ fail: new Error('mất kết nối') });
  assert.equal((await broken.chotPhieu('DC0001')).trangThai, 'cho-duyet-tay');
  const failingQuery = createTuDongDatCoc({ log: quiet, query: async () => { throw new Error('x'); }, exec: async () => assert.fail('không được gọi SP') });
  assert.equal(await failingQuery.dangBat(), false);
  assert.deepEqual(await failingQuery.chotPhieu('DC0001'), { trangThai: 'tat' });
});
