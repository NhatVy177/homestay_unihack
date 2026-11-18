import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/common/Icon.jsx';
import './logoutConfirm.css';

// Hộp thoại hỏi lại trước khi đăng xuất (dùng chung cho mọi vai trò).
export default function LogoutConfirmDialog({ onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);
  return <div className="lc-overlay" onClick={() => { if (!busy) onCancel(); }}>
    <div className="lc-dialog" role="alertdialog" aria-modal="true" aria-labelledby="lc-title" aria-describedby="lc-desc" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="lc-close" aria-label="Đóng hộp thoại đăng xuất" disabled={busy} onClick={onCancel}><Icon name="close" /></button>
      <div className="lc-symbol" aria-hidden="true"><Icon name="logout" /></div>
      <h3 id="lc-title">Xác nhận đăng xuất</h3>
      <p id="lc-desc">Bạn có chắc chắn muốn đăng xuất không?<span>Phiên làm việc hiện tại của bạn sẽ kết thúc.</span></p>
      <div className="lc-actions">
        <button type="button" ref={cancelRef} className="lc-btn lc-btn--ghost" disabled={busy} onClick={onCancel}>Hủy</button>
        <button type="button" className="lc-btn lc-btn--danger" disabled={busy} onClick={async () => { setBusy(true); await onConfirm(); }}>{busy ? 'Đang đăng xuất...' : 'Đăng xuất'}</button>
      </div>
    </div>
  </div>;
}
