import React from 'react';
import { Icon } from './Icon.jsx';

// Search box of a list toolbar: icon, hidden label for screen readers, clear button once something is typed.
// onChange receives the text, not the event.
export default function ListSearch({ value, onChange, placeholder, label = 'Tìm kiếm', className = '' }) {
  return (
    <label className={`ui-list-search ${className}`.trim()}>
      <span className="ui-search-label">{label}</span>
      <Icon name="search" />
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {value && (
        <button type="button" className="ui-list-search-clear" onClick={() => onChange('')} aria-label="Xóa từ khóa">
          <Icon name="close" className="ui-icon--sm" />
        </button>
      )}
    </label>
  );
}

// "Hiển thị 3 / 12 hồ sơ" at the end of the toolbar.
export function ListCount({ shown, total, noun }) {
  return <span className="ui-list-count">Hiển thị {shown} / {total} {noun}</span>;
}
