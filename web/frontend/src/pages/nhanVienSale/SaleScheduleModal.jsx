import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/common/Icon.jsx';

export default function SaleScheduleModal({ children, onClose }) {
  const card = useRef(null), close = useRef(onClose), titleId = useId();
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    card.current?.querySelector('button')?.focus();
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key === 'Tab') {
        const controls = [...card.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')].filter(el => el.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', onKey); if (previous?.isConnected) previous.focus(); };
  }, []);
  return createPortal(<div className="sale-scheduling-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={card} className="ui-card sale-scheduling-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="sale-scheduling-header"><div><h2 id={titleId}>Tạo lịch xem phòng</h2><p>Chọn phiếu nhu cầu, đối chiếu phòng phù hợp rồi mới lập lịch cho khách.</p></div><button type="button" className="ui-btn ui-btn--ghost" aria-label="Đóng form lập lịch" onClick={onClose}><Icon name="close" /></button></header>
      <div className="sale-scheduling-body">{children}</div>
    </section>
  </div>, document.body);
}
