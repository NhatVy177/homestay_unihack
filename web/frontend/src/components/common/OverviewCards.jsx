import React from 'react';
import { Icon } from './Icon.jsx';

function appearance(label = '') {
  if (/từ chối|bị từ chối|hủy|hết hạn|quá hạn|không đạt/i.test(label)) return { tone: 'danger', icon: 'cancel' };
  if (/chờ|đang/i.test(label)) return { tone: 'warning', icon: 'pending_actions' };
  if (/đã|hoàn tất|hoàn thành|đạt/i.test(label)) return { tone: 'success', icon: 'verified_user' };
  return { tone: 'neutral', icon: 'description' };
}

// Read the same display counts as the existing filters. Never calculate domain totals here.
// With onSelect, each card also works as the status filter (same keys as StatusFilterTabs).
export default function OverviewCards({ items, counts, activeKey, onSelect }) {
  const cards = items.map(item => ({ ...item, value: item.count ?? counts?.[item.key] ?? item.value }))
    .filter(item => item.value !== undefined && item.value !== null);
  if (!cards.length) return null;

  return (
    <div className="ui-overview-grid" role="group" aria-label={onSelect ? 'Tổng quan danh sách, bấm để lọc' : 'Tổng quan danh sách'}>
      {cards.map(item => {
        const { tone, icon } = appearance(item.label);
        const className = `ui-overview-card ui-overview-card--${tone}`;
        const content = (
          <>
            <div className="ui-overview-caption">
              <span className="ui-overview-icon"><Icon name={item.icon || icon} /></span>
              <span className="ui-overview-label">{item.label}</span>
            </div>
            <strong className="ui-overview-value">{item.value}</strong>
          </>
        );
        if (!onSelect) return <article className={className} key={item.key || item.label}>{content}</article>;
        const active = activeKey === item.key;
        return (
          <button type="button" className={`${className} is-clickable${active ? ' is-active' : ''}`} key={item.key || item.label}
            aria-pressed={active} onClick={() => onSelect(item.key)}>
            {content}
          </button>
        );
      })}
    </div>
  );
}
