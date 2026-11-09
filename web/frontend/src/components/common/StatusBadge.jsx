import React from 'react';
import { getStatusLabel } from '../../constants/status.js';

const tones = {
  'Phù hợp': 'success', 'Đã thanh toán': 'success', 'Hoàn tất': 'success',
  'Đã duyệt': 'success', 'Đã duyệt cư trú': 'success', 'Đủ điều kiện': 'success',
  'Đã chốt': 'success', 'Đã bàn giao': 'success', 'Thành công': 'success',
  'Chờ sale xử lý': 'warning', 'Chờ bổ sung': 'warning', 'Chờ điều chỉnh': 'warning',
  'Chờ xác nhận nhận cọc': 'warning', 'Chờ thanh toán': 'warning',
  'Chờ xác nhận thanh toán': 'warning', 'Chờ tiếp nhận': 'warning',
  'Chờ duyệt': 'warning', 'Chờ duyệt cư trú': 'warning', 'Chờ xem': 'warning',
  'Không phù hợp': 'danger', 'Đã hủy': 'danger', 'Từ chối nhận cọc': 'danger',
  'Từ chối': 'danger', 'Quá hạn': 'danger', 'Đã từ chối': 'danger', 'Lỗi': 'danger',
  'Đã lên lịch': 'info', 'Đã đổi lịch': 'info', 'Đang xử lý': 'info',
  'Đã tiếp nhận': 'info', 'Đã xem': 'info',
};

export default function StatusBadge({ status }) {
  const label = getStatusLabel(status);
  return <span className={`status-badge ui-badge ui-badge--${tones[label] || 'neutral'}`}>{label}</span>;
}
