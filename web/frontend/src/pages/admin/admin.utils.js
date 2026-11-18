/**
 * Helper an toàn để lấy mảng dữ liệu từ phản hồi API
 * Hỗ trợ cả trường hợp:
 * - res = [...] (mảng trực tiếp)
 * - res = { data: [...] } (axios response thông thường)
 * - res = { data: { data: [...] } } (axios response bọc trong object { data })
 */
export const extractArray = (res) => {
  if (!res) return [];
  const val = res.data !== undefined ? res.data : res;
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.data)) return val.data;
  return [];
};

export const formatVND = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '0 đ';
  return Number(num).toLocaleString('vi-VN') + ' đ';
};
