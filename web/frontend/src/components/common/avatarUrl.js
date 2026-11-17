// Địa chỉ ảnh đại diện do máy chủ trả về dạng /uploads/...; ghép với địa chỉ gốc của API.
export function resolveAvatarUrl(path) {
  if (!path) return '';
  if (/^https?:/i.test(path)) return path;
  const api = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return `${api.replace(/\/api\/?$/, '')}${path}`;
}
