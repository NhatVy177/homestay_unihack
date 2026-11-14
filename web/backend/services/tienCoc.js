// Cách tính tiền cọc, khớp trigger TRG_ChiTietDatCoc_TinhGiaThue_Va_SoTienCoc:
// mỗi dòng giá thuê = giá/giường (ghép) hoặc giá nguyên phòng; tiền cọc = tổng giá thuê 1 tháng × 2.
export const SO_THANG_COC = 2;

export function cachTinhCoc(lines = []) {
  const valid = lines.filter((line) => Number(line.giaThue) > 0);
  if (!valid.length) return null;
  const nguyenPhong = valid.every((line) => !line.maGiuong);
  const groups = new Map();
  for (const line of valid) groups.set(Number(line.giaThue), (groups.get(Number(line.giaThue)) || 0) + 1);
  const motThang = valid.reduce((sum, line) => sum + Number(line.giaThue), 0);
  return {
    soThang: SO_THANG_COC,
    dong: [...groups].map(([donGia, soLuong]) => ({ donGia, soLuong, donVi: nguyenPhong ? 'phòng' : 'giường' })),
    motThang,
    tong: motThang * SO_THANG_COC,
  };
}

// Dự kiến cho màn duyệt của quản lý (phiếu cọc chưa được lập): lấy giá theo loại phòng.
export function cachTinhCocDuKien({ hinhThucThue, danhSachGiuong, giaTheoGiuong, giaNguyenPhong }) {
  if (hinhThucThue === 'Nguyên phòng') return cachTinhCoc([{ maGiuong: null, giaThue: giaNguyenPhong }]);
  const beds = String(danhSachGiuong || '').split(',').map((bed) => bed.trim()).filter(Boolean);
  return cachTinhCoc(beds.map((maGiuong) => ({ maGiuong, giaThue: giaTheoGiuong })));
}
