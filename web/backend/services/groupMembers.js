// Đọc danh sách thành viên nhóm từ dòng "Nhóm n người: 1) Tên (Nam, SĐT, CCCD x) - người đại diện; 2) ..." mà form đăng ký nhóm
// ghi vào ghi chú phiếu (J-C118). Dùng để điền sẵn tab "Thông tin cư trú" (J-C119). Sai định dạng thì trả mảng rỗng, không lỗi.
export function parseGroupMembers(note) {
  const line = String(note || '').split(/\r?\n/).flatMap((row) => row.split(/(?<=\.)\s+(?=\S)/)).find((row) => /^Nhóm \d+ người:/.test(row.trim()));
  if (!line) return [];
  const body = line.trim().replace(/^Nhóm \d+ người:\s*/, '').replace(/\.$/, '');
  return body.split(/;\s+(?=\d+\)\s)/).map((segment) => {
    const match = segment.match(/^\d+\)\s*(.+?)\s*\(([^()]*)\)\s*(- người đại diện)?\s*$/);
    if (!match) return null;
    const parts = match[2].split(',').map((part) => part.trim()).filter(Boolean);
    const cccd = parts.find((part) => /^CCCD\s/i.test(part))?.replace(/^CCCD\s+/i, '') || '';
    const gioiTinh = parts.find((part) => part === 'Nam' || part === 'Nữ') || '';
    const soDienThoai = parts.find((part) => /^\d{9,11}$/.test(part)) || '';
    return { hoTen: match[1].trim(), gioiTinh, soDienThoai, cccd, daiDien: Boolean(match[3]) };
  }).filter((member) => member?.hoTen);
}
