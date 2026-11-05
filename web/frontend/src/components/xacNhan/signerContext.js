import { createContext, useContext } from 'react';
// null = xác nhận trong tài khoản chưa được cấu hình (không có Privy app ID hoặc backend tắt).
export const SignerContext = createContext(null);
export const useSigner = () => useContext(SignerContext);
