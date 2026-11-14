import React, { useState } from 'react';
import { Icon } from '../../components/common/Icon.jsx';
export function canUseReschedule(appt) {
  const date=new Date(appt?.rawSchedule?.thoiGianHen);
  return Number.isFinite(date.getTime()) && date.getTime()-Date.now()>=2*60*60*1000;
}

function toLocalDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatSuggestedDateTime(dateValue, timeValue) {
  const [year, month, day] = String(dateValue || '').split('-');
  return `${day}/${month}/${year} ${timeValue}`;
}

export function RescheduleModal({ appt, onClose, onSubmit }) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = toLocalDateInputValue(tomorrow);
  const [suggestedSlots, setSuggestedSlots] = useState([{ date: '', time: '' }]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!appt) return null;

  function updateSuggestedSlot(index, field, value) {
    setSuggestedSlots((current) => current.map((slot, slotIndex) => (
      slotIndex === index ? { ...slot, [field]: value } : slot
    )));
  }

  function addSuggestedSlot() {
    setSuggestedSlots((current) => (
      current.length >= 3 ? current : [...current, { date: '', time: '' }]
    ));
  }

  function removeSuggestedSlot(index) {
    setSuggestedSlots((current) => (
      current.length === 1 ? current : current.filter((_, slotIndex) => slotIndex !== index)
    ));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!canUseReschedule(appt)) {
      setError('Chỉ được sử dụng tính năng đổi lịch trước giờ hẹn ít nhất 2 tiếng.');
      return;
    }

    const normalizedSlots = suggestedSlots.map((slot) => ({
      date: slot.date,
      time: slot.time
    }));

    if (normalizedSlots.some((slot) => !slot.date || !slot.time)) {
      setError('Vui lòng chọn đầy đủ ngày và giờ cho từng thời gian đề xuất.');
      return;
    }
    if (normalizedSlots.some((slot) => slot.date < minDate)) {
      setError('Mỗi ngày xem phải sau ngày hiện tại.');
      return;
    }
    if (normalizedSlots.some((slot) => slot.time < '07:00' || slot.time > '17:00')) {
      setError('Mỗi giờ xem phòng chỉ được chọn từ 07:00 đến 17:00.');
      return;
    }

    const slotKeys = normalizedSlots.map((slot) => `${slot.date} ${slot.time}`);
    if (new Set(slotKeys).size !== slotKeys.length) {
      setError('Các thời gian đề xuất không được trùng nhau.');
      return;
    }

    const timeText = normalizedSlots
      .map((slot) => formatSuggestedDateTime(slot.date, slot.time))
      .join('; ');

    setSubmitting(true);
    try {
      await onSubmit?.(appt, {
        timeText,
        suggestedTimes: normalizedSlots,
        reason
      });
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể gửi yêu cầu đổi lịch.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="lxp-modal-backdrop" onMouseDown={onClose}>
      <div className="lxp-modal" role="dialog" aria-modal="true" aria-label="Yêu cầu đổi lịch xem phòng" onMouseDown={(e) => e.stopPropagation()}>
        <div className="lxp-modal-head">
          <h3>Yêu cầu đổi lịch xem phòng</h3>
          <button className="lxp-modal-close" type="button" aria-label="Đóng" onClick={onClose}><Icon name="close"/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="lxp-modal-body">
            <p>
              Bạn đang đổi lịch cho <strong>{appt.roomName}</strong>.
            </p>
            {error && <p className="customer-viewing-error" role="alert">{error}</p>}
            <div className="lxp-modal-field">
              <label>Thời gian đề xuất</label>
              <div className="lxp-suggested-times">
                {suggestedSlots.map((slot, index) => (
                  <div className="lxp-date-time-row" key={index}>
                    <input
                      aria-label={`Ngày xem đề xuất ${index + 1}`}
                      type="date"
                      min={minDate}
                      value={slot.date}
                      onChange={(e) => updateSuggestedSlot(index, 'date', e.target.value)}
                      required
                    />
                    <input
                      aria-label={`Giờ xem đề xuất ${index + 1}`}
                      type="time"
                      min="07:00"
                      max="17:00"
                      step="900"
                      value={slot.time}
                      onChange={(e) => updateSuggestedSlot(index, 'time', e.target.value)}
                      required
                    />
                    {suggestedSlots.length > 1 && (
                      <button
                        className="lxp-time-remove"
                        type="button"
                        aria-label={`Xóa thời gian đề xuất ${index + 1}`}
                        onClick={() => removeSuggestedSlot(index)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="lxp-field-helper-row">
                <small className="lxp-field-hint">Tối đa 3 thời gian. Ngày xem phải sau hôm nay, giờ xem từ 07:00 đến 17:00.</small>
                {suggestedSlots.length < 3 && (
                  <button className="lxp-add-time-btn" type="button" onClick={addSuggestedSlot}>
                    + Thêm thời gian
                  </button>
                )}
              </div>
            </div>
            <div className="lxp-modal-field">
              <label htmlFor="lxp-reason">Lý do đổi lịch</label>
              <textarea
                id="lxp-reason"
                placeholder="VD: Bận công việc đột xuất..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="lxp-modal-footer">
            <button className="lxp-btn lxp-btn-outline" type="button" onClick={onClose} disabled={submitting}>Thoát</button>
            <button className="lxp-btn lxp-btn-primary" type="submit" disabled={submitting}>{submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Cancel modal ─── */
export function CancelModal({ appt, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!appt) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await onSubmit?.(appt, { reason });
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể gửi yêu cầu hủy lịch.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="lxp-modal-backdrop" onMouseDown={onClose}>
      <div className="lxp-modal" role="dialog" aria-modal="true" aria-label="Yêu cầu hủy lịch xem phòng" onMouseDown={(e) => e.stopPropagation()}>
        <div className="lxp-modal-head">
          <h3>Yêu cầu hủy lịch xem phòng</h3>
          <button className="lxp-modal-close" type="button" aria-label="Đóng" onClick={onClose}><Icon name="close"/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="lxp-modal-body">
            <p>
              Bạn đang yêu cầu hủy lịch cho <strong>{appt.roomName}</strong>.
            </p>
            {error && <p className="customer-viewing-error" role="alert">{error}</p>}
            <div className="lxp-modal-field">
              <label htmlFor="lxp-cancel-reason">Lý do hủy</label>
              <textarea
                id="lxp-cancel-reason"
                placeholder="VD: Đã tìm được phòng khác..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="lxp-modal-footer">
            <button className="lxp-btn lxp-btn-outline" type="button" onClick={onClose} disabled={submitting}>Thoát</button>
            <button className="lxp-btn lxp-btn-danger" type="submit" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi yêu cầu hủy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
