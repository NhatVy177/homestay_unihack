import React from 'react';
import { Icon } from '../common/Icon.jsx';
import './xacNhan.css';

const icons = { success: 'check_circle', warning: 'hourglass_empty', danger: 'error', info: 'info' };

export function ConfirmationNotice({ tone = 'info', children, className = '' }) {
  return <div className={`xn-alert xn-alert--${tone} ${className}`.trim()} role={tone === 'danger' ? 'alert' : 'status'}>
    <Icon name={icons[tone]} />
    <div className="xn-alert-content">{children}</div>
  </div>;
}
