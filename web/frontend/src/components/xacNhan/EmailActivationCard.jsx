import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { avalancheApi, privyAppId } from '../../lib/avalanche/api.js';
import { Icon } from '../common/Icon.jsx';
import EmailCodeGate from './EmailCodeGate.jsx';
import { useSigner } from './signerContext.js';
import './xacNhan.css';

// Khách xác nhận email (mã OTP một lần) ngay khi vào cổng sau đăng ký, để lúc xác nhận biên bản chỉ còn bấm.
// Vẫn còn ô nhập mã ở bước biên bản làm dự phòng khi phiên đăng nhập ví đã hết hạn.
const AccountSignerProvider = privyAppId ? lazy(() => import('./AccountSignerProvider.jsx')) : null;

export default function EmailActivationCard() {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  useEffect(() => { avalancheApi.get('/config').then(setConfig).catch(() => setConfig({ enabled: false })); }, []);
  if (!AccountSignerProvider || !config?.enabled || user?.vaiTro !== 'KhachHang') return null;
  return <Suspense fallback={null}>
    <AccountSignerProvider appId={privyAppId} mode={config.walletAuth === 'jwt' ? 'jwt' : 'email'} accountEmail={user.email}>
      <ActivationBody />
    </AccountSignerProvider>
  </Suspense>;
}

function ActivationBody() {
  const signer = useSigner();
  const [dismissed, setDismissed] = useState(false);
  const needed = useRef(false);
  if (signer?.status === 'needs-email') needed.current = true;
  if (!signer || signer.mode !== 'email') return null;
  if (signer.status === 'needs-email') {
    if (dismissed) {
      return <p className="xn-activation-mini" role="status">
        <Icon name="info" /> Bạn chưa xác nhận email để ký điện tử. <button type="button" className="xn-link" onClick={() => setDismissed(false)}>Xác nhận ngay</button>
      </p>;
    }
    return <section className="ui-card xn-activation" aria-label="Xác nhận email">
      <h3>Xác nhận email của bạn</h3>
      <p className="xn-muted">Làm một lần ngay bây giờ để sau này xác nhận biên bản bàn giao và đối soát chỉ cần bấm một nút.</p>
      <EmailCodeGate signer={signer} onCancel={() => setDismissed(true)} />
    </section>;
  }
  if (signer.status === 'preparing' && needed.current) return <p className="xn-activation-mini" role="status">Đang chuẩn bị xác nhận cho tài khoản…</p>;
  if (signer.status === 'ready' && needed.current) {
    return <p className="xn-activation-mini is-done" role="status"><Icon name="check_circle" /> Email đã xác nhận. Bạn sẵn sàng xác nhận biên bản chỉ bằng một lần bấm.</p>;
  }
  if (signer.status === 'error') return <p className="xn-activation-mini is-error" role="alert">{signer.error}</p>;
  return null;
}
