// D-042: tuổi tối thiểu để khách tự đăng ký thuê (khớp điều kiện duyệt cư trú D-024).
export const MIN_RENTER_AGE = 18;

// dateText dạng YYYY-MM-DD (giá trị ô ngày). Giá trị không đọc được thì không chặn ở đây.
export function isUnderAdultAge(dateText, today = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateText || ''));
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  let age = today.getFullYear() - year;
  const todayMonth = today.getMonth() + 1;
  if (todayMonth < month || (todayMonth === month && today.getDate() < day)) age -= 1;

  return age < MIN_RENTER_AGE;
}
