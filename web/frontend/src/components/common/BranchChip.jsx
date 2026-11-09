import React from 'react';
import { Icon } from './Icon.jsx';

export default function BranchChip({ user }) {
  const branch = user?.tenChiNhanh || user?.maChiNhanh || '—';
  return <span className="ui-branch-chip"><Icon name="apartment" />Chi nhánh: {branch}</span>;
}
