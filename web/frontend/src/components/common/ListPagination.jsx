import React from 'react';
import { Icon } from './Icon.jsx';

// Footer of a paged table: "Hiển thị 1–10 / 23 <noun>" and page buttons (at most 5 numbers around the current page).
export default function ListPagination({ page, pageSize, total, noun, emptyText, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  let start = Math.max(1, current - 2);
  const end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  const numbers = [];
  for (let n = start; n <= end; n += 1) numbers.push(n);

  return (
    <div className="ui-pagination">
      <span className="ui-pagination-summary">
        {total === 0 ? (emptyText || `Không có ${noun}`) : `Hiển thị ${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, total)} / ${total} ${noun}`}
      </span>
      {totalPages > 1 && (
        <nav className="ui-pagination-pages" aria-label="Phân trang">
          <button type="button" disabled={current <= 1} onClick={() => onChange(current - 1)} aria-label="Trang trước"><Icon name="chevron_left" /></button>
          {numbers.map((n) => (
            <button key={n} type="button" className={n === current ? 'is-active' : ''} aria-current={n === current ? 'page' : undefined} onClick={() => onChange(n)}>{n}</button>
          ))}
          <button type="button" disabled={current >= totalPages} onClick={() => onChange(current + 1)} aria-label="Trang sau"><Icon name="chevron_right" /></button>
        </nav>
      )}
    </div>
  );
}
