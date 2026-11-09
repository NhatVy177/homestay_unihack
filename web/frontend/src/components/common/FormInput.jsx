import React from 'react';
export default function FormInput({ label, required = false, ...props }) {
  return (
    <label className="form-control ui-form-field">
      <span>
        {label}
        {required && <strong className="required-mark"> *</strong>}
      </span>
      <input required={required} {...props} className={`ui-input ${props.className || ''}`.trim()} />
    </label>
  );
}
