import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PrivyProvider, usePrivy, useWallets, useSignMessage, useSignTypedData, useCreateWallet,
  useLoginWithEmail, useSubscribeToJwtAuthWithFlag,
} from '@privy-io/react-auth';
import { avalancheFuji, hardhat } from 'viem/chains';
import { SignerContext } from './signerContext.js';
import { avalancheApi, errorMessage, trustedDeployment } from '../../lib/avalanche/api.js';
// D-015 (thay D-011 khi chưa có gói Privy Scale): khách xác nhận email một lần bằng mã OTP trong khung
// của HomeStayDorm; ví nhúng được tạo và liên kết ngầm. Chế độ 'jwt' (D-011) vẫn giữ để bật lại khi có gói.
// Khách không thấy ví, địa chỉ hay popup của Privy.
const silent = { showWalletUIs: false };
const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
function JwtSync() {
  const getExternalJwt = useCallback(async () => {
    try { return (await avalancheApi.get('/privy/token')).token; } catch { return undefined; }
  }, []);
  useSubscribeToJwtAuthWithFlag({ isAuthenticated: true, isLoading: false, getExternalJwt });
  return null;
}
function Bridge({ mode, accountEmail, children }) {
  const { ready, authenticated, user: privyUser, logout } = usePrivy();
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const { signTypedData } = useSignTypedData();
  const { createWallet } = useCreateWallet();
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const wallet = wallets.find(w => w.walletClientType === 'privy');
  const [linked, setLinked] = useState(undefined);
  const [error, setError] = useState('');
  const [codeSentTo, setCodeSentTo] = useState('');
  const busy = useRef({ link: false, create: false });
  const privyEmail = privyUser?.email?.address;
  const staleChecked = useRef(false);
  // A Privy session left on this browser by another HomeStayDorm account must never be reused.
  // Checked once on open; a login completed on this page (codeSentTo) is never discarded.
  useEffect(() => {
    if (mode !== 'email' || !ready || staleChecked.current) return;
    staleChecked.current = true;
    if (authenticated && (!accountEmail || !same(privyEmail, accountEmail))) logout().catch(() => {});
  }, [mode, ready, authenticated, privyEmail, accountEmail, logout]);
  useEffect(() => { avalancheApi.get('/wallet').then(r => setLinked(r.address)).catch(e => setError(errorMessage(e))); }, []);
  const sessionOk = authenticated && (mode !== 'email' || (accountEmail && same(privyEmail, accountEmail)) || codeSentTo);
  // Headless login does not auto-create a wallet: create it silently once.
  useEffect(() => {
    if (!ready || !sessionOk || wallet || busy.current.create) return;
    if (privyUser?.wallet && privyUser.wallet.walletClientType === 'privy') return;
    busy.current.create = true;
    createWallet().catch(e => { if (!/already has/i.test(e?.message || '')) setError(errorMessage(e)); })
      .finally(() => { busy.current.create = false; });
  }, [ready, sessionOk, wallet, privyUser, createWallet]);
  // Bind the account's embedded wallet once, silently, with a one-time server challenge.
  useEffect(() => {
    if (!sessionOk || !wallet || linked === undefined || busy.current.link) return;
    if (linked) {
      if (!same(linked, wallet.address)) setError('Email xác nhận này gắn với khóa khác tài khoản của bạn. Hãy dùng đúng email đã xác nhận lần đầu hoặc liên hệ quản lý chi nhánh.');
      else setError('');
      return;
    }
    busy.current.link = true;
    (async () => {
      const challenge = await avalancheApi.post('/wallet/challenge', { address: wallet.address });
      const { signature } = await signMessage({ message: challenge.message }, { address: wallet.address, uiOptions: silent });
      setLinked((await avalancheApi.post('/wallet/link', { id: challenge.id, signature })).address);
    })().catch(e => setError(errorMessage(e))).finally(() => { busy.current.link = false; });
  }, [sessionOk, wallet, linked, signMessage]);
  const status = !ready ? 'preparing'
    : !sessionOk ? (mode === 'email' ? 'needs-email' : 'preparing')
      : error ? 'error' : wallet && linked && same(linked, wallet.address) ? 'ready' : 'preparing';
  const value = useMemo(() => ({
    mode, status, error, accountEmail: accountEmail || '', codeSentTo,
    async sendCode(email) {
      const target = String(accountEmail || email || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) throw new Error('Email chưa hợp lệ.');
      await sendCode({ email: target });
      setCodeSentTo(target);
    },
    async verifyCode(code) {
      if (!/^\d{6}$/.test(String(code || '').trim())) throw new Error('Mã gồm 6 chữ số.');
      setError('');
      await loginWithCode({ code: String(code).trim() });
    },
    async sign(typedData) {
      if (status !== 'ready') throw new Error('Đang chuẩn bị xác nhận cho tài khoản, vui lòng thử lại sau giây lát.');
      return (await signTypedData(typedData, { address: wallet.address, uiOptions: silent })).signature;
    },
  }), [mode, status, error, accountEmail, codeSentTo, sendCode, loginWithCode, signTypedData, wallet]);
  return <SignerContext.Provider value={value}>{mode === 'jwt' && <JwtSync />}{children}</SignerContext.Provider>;
}
export default function AccountSignerProvider({ appId, mode = 'email', accountEmail, children }) {
  return <PrivyProvider appId={appId} config={{
    loginMethods: ['email'],
    embeddedWallets: { ethereum: { createOnLogin: 'off' }, showWalletUIs: false },
    defaultChain: trustedDeployment.chainId === 31337 ? hardhat : avalancheFuji,
    supportedChains: [avalancheFuji, hardhat],
    appearance: { theme: 'light', accentColor: '#00666d' },
  }}><Bridge mode={mode} accountEmail={accountEmail}>{children}</Bridge></PrivyProvider>;
}
