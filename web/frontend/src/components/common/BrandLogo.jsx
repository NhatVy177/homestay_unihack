import React from 'react';
import './brandLogo.css';

export default function BrandLogo({ showName = true }) {
  return <>
    <img className="brand-logo-mark" src="/images/brand/homestaydorm-logo.png" alt="" aria-hidden="true" />
    {showName && <span className="brand-logo-name">Homestay<strong>Dorm</strong></span>}
  </>;
}
