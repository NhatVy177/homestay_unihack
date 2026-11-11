import React from 'react';
import { Icon } from './Icon.jsx';

const looks = {
  error: { icon: 'error_outline', text: 'Không tải được danh sách. Bấm tải lại hoặc thử lại sau.' },
  empty: { icon: 'description', text: 'Chưa có dữ liệu.' }
};

// Rows shown in a table body instead of data: placeholder bars while loading, an error, or an empty result.
export default function TableState({ kind, colSpan, message, rows = 3 }) {
  if (kind === 'loading') {
    return Array.from({ length: rows }, (_, row) => (
      <tr key={row} className="ui-table-skeleton" aria-hidden={row > 0 ? 'true' : undefined}>
        {Array.from({ length: colSpan }, (_, cell) => (
          <td key={cell}><span className="ui-skeleton" />{row === 0 && cell === 0 && <span className="ui-search-label">{message || 'Đang tải...'}</span>}</td>
        ))}
      </tr>
    ));
  }
  const look = looks[kind] || looks.empty;
  return (
    <tr className={`ui-table-state ui-table-state--${kind}`}>
      <td colSpan={colSpan}>
        <Icon name={look.icon} className="ui-icon--lg" />
        <p>{message || look.text}</p>
      </td>
    </tr>
  );
}
