import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../pages/auth/auth.api.js';
import { clearSession, getStoredSession, getStoredToken, storeSession } from './auth.storage.js';
import LogoutConfirmDialog from './LogoutConfirmDialog.jsx';

const AuthContext = createContext(null);

function mergeFilled(base = {}, update = {}) {
  return Object.fromEntries(
    Object.entries({ ...base, ...update }).map(([key, value]) => [
      key,
      value === undefined || value === null || value === '' ? base[key] : value
    ])
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(getStoredToken()));
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  useEffect(() => {
    if (!getStoredToken()) {
      setIsLoading(false);
      return;
    }

    authApi.getToi()
      .then(({ data }) => {
        const storedUser = getStoredSession()?.user || {};
        setUser({ ...mergeFilled(storedUser, data), avatarUrl: data.avatarUrl || null });
      })
      .catch(() => clearSession())
      .finally(() => setIsLoading(false));
  }, []);

  async function dangNhap(credentials) {
    const { data } = await authApi.dangNhap(credentials);
    storeSession(data);
    setUser(data.user);
    return data.user;
  }

  // Đăng nhập Google: khách đã có tài khoản thì vào luôn; email mới thì trả needsProfile để khách bổ sung thông tin.
  async function dangNhapGoogle(credential) {
    const { data } = await authApi.dangNhapGoogle(credential);
    if (data.needsProfile) return data;
    storeSession(data);
    setUser(data.user);
    return { user: data.user };
  }

  async function hoanTatGoogle(formData) {
    const { data } = await authApi.hoanTatGoogle(formData);
    storeSession(data);
    setUser(data.user);
    return { user: data.user };
  }

  async function dangKy(formData) {
    const { data } = await authApi.dangKy(formData);
    storeSession(data);
    setUser(data.user);
  }

  // Đăng xuất thật, chỉ chạy sau khi người dùng xác nhận.
  async function thucHienDangXuat() {
    try {
      await authApi.dangXuat();
    } finally {
      clearSession();
      setUser(null);
      setConfirmingLogout(false);
      if (window.location.pathname !== '/') {
        window.location.assign('/');
      }
    }
  }

  // Mọi nút "Đăng xuất" trong ứng dụng gọi hàm này: hỏi lại trước khi đăng xuất.
  function dangXuat() {
    setConfirmingLogout(true);
    return Promise.resolve();
  }

  const capNhatAvatar = (avatarUrl) => setUser((current) => (current ? { ...current, avatarUrl } : current));
  const value = useMemo(
    () => ({ user, isLoading, dangNhap, dangKy, dangXuat, dangNhapGoogle, hoanTatGoogle, capNhatAvatar }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>
    {children}
    {confirmingLogout && <LogoutConfirmDialog onCancel={() => setConfirmingLogout(false)} onConfirm={thucHienDangXuat} />}
  </AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
