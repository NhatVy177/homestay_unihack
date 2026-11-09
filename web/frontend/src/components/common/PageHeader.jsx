import React from 'react';
export default function PageHeader({ title, description }) {
  return (
    <div className="page-header ui-page-header">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}
