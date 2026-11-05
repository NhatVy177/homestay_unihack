import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PrivyProvider, usePrivy, useWallets, useSignMessage, useSignTypedData, useSubscribeToJwtAuthWithFlag } from '@privy-io/react-auth';
import { avalancheFuji, hardhat } from 'viem/chains';
import { SignerContext } from './signerContext.js';
import { avalancheApi, errorMessage, trustedDeployment } from '../../lib/avalanche/api.js';
// D-011: the embedded wallet follows the HomeStayDorm session (JWT-based auth). The tenant never
// sees a second login, a wallet popup or an address; the app shows the document and the tenant
// decides with HomeStayDorm's own buttons.
const silent = { showWalletUIs: false };
function Bridge({ children }) {
  const { ready, authenticated } = usePrivy();
  const getExternalJwt = useCallback(async () => {
    try { return (await avalancheApi.get('/privy/token')).token; } catch { return undefined; }
  }, []);
  useSubscribeToJwtAuthWithFlag({ isAuthenticated: true, isLoading: false, getExternalJwt });
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const { signTypedData } = useSignTypedData();
  const wallet = wallets.find(w => w.walletClientType === 'privy');
  const [linked, setLinked] = useState(undefined);
  const [error, setError] = useState('');
  const linking = useRef(false);
  useEffect(() => { avalancheApi.get('/wallet').then(r => setLinked(r.address)).catch(e => setError(errorMessage(e))); }, []);
  // Bind the account's embedded wallet once, silently, with a one-time server challenge.
  useEffect(() => {
    if (!wallet || linked === undefined || linking.current) return;
    if (linked) {
      if (linked.toLowerCase() !== wallet.address.toLowerCase()) setError('Tài khoản đã gắn với khóa xác nhận khác. Vui lòng liên hệ quản lý chi nhánh.');
      return;
    }
    linking.current = true;
    (async () => {
      const challenge = await avalancheApi.post('/wallet/challenge', { address: wallet.address });
      const { signature } = await signMessage({ message: challenge.message }, { address: wallet.address, uiOptions: silent });
      setLinked((await avalancheApi.post('/wallet/link', { id: challenge.id, signature })).address);
    })().catch(e => setError(errorMessage(e))).finally(() => { linking.current = false; });
  }, [wallet, linked, signMessage]);
  const status = error ? 'error' : ready && authenticated && wallet && linked ? 'ready' : 'preparing';
  const value = useMemo(() => ({
    status, error,
    async sign(typedData) {
      if (status !== 'ready') throw new Error('Đang chuẩn bị xác nhận trong tài khoản, vui lòng thử lại sau giây lát.');
      return (await signTypedData(typedData, { address: wallet.address, uiOptions: silent })).signature;
    },
  }), [status, error, wallet, signTypedData]);
  return <SignerContext.Provider value={value}>{children}</SignerContext.Provider>;
}
export default function AccountSignerProvider({ appId, children }) {
  return <PrivyProvider appId={appId} config={{
    embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' }, showWalletUIs: false },
    defaultChain: trustedDeployment.chainId === 31337 ? hardhat : avalancheFuji,
    supportedChains: [avalancheFuji, hardhat],
    appearance: { theme: 'light', accentColor: '#00666d' },
  }}><Bridge>{children}</Bridge></PrivyProvider>;
}
