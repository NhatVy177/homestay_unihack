// Presentation helpers only. API authorization and business rules remain on the existing backend.
export function dateKey(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function timeLabel(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
export function dateLabel(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
}
export function customersFromRegistrations(rows) {
  const customers = new Map();
  for (const row of rows) {
    const key = row.maKhachHang || row.sdtKhach || row.maDangKy;
    if (!customers.has(key)) customers.set(key, { key, name: row.hoTenKhach || 'Chưa có tên', phone: row.sdtKhach || '', email: row.email || '', records: [] });
    customers.get(key).records.push(row);
  }
  return [...customers.values()];
}
