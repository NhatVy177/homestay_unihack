import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createServiceError } from '../../errors/serviceErrors.js';

const SANDBOX = 'https://test-payment.momo.vn';
const CREATE_FIELDS = ['amount', 'extraData', 'ipnUrl', 'orderId', 'orderInfo', 'partnerCode', 'redirectUrl', 'requestId', 'requestType'];
const QUERY_FIELDS = ['orderId', 'partnerCode', 'requestId'];
const IPN_FIELDS = ['amount', 'extraData', 'message', 'orderId', 'orderInfo', 'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime', 'resultCode', 'transId'];
const CLOSED_CODES = new Set([1001, 1002, 1003, 1004, 1005, 1006, 1007, 1017]);
const momoId = id => `HSD-${id}`;

function config() {
  const partnerCode = process.env.MOMO_TEST_PARTNER_CODE?.trim();
  const accessKey = process.env.MOMO_TEST_ACCESS_KEY?.trim();
  const secretKey = process.env.MOMO_TEST_SECRET_KEY?.trim();
  if (!partnerCode || !accessKey || !secretKey) {
    throw createServiceError('Chưa cấu hình tài khoản MoMo Sandbox để tạo mã QR.', 503);
  }
  return { partnerCode, accessKey, secretKey };
}

function sign(keys, body, fields) {
  const raw = [`accessKey=${keys.accessKey}`, ...fields.map(field => `${field}=${body[field] ?? ''}`)].join('&');
  return createHmac('sha256', keys.secretKey).update(raw, 'utf8').digest('hex');
}

async function callSandbox(path, keys, body, fields) {
  let response;
  let data;
  try {
    response = await fetch(`${SANDBOX}/v2/gateway/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ ...body, signature: sign(keys, body, fields) }),
      signal: AbortSignal.timeout(35_000),
      redirect: 'error',
    });
    data = await response.json();
  } catch {
    throw createServiceError('Chưa kết nối được với MoMo Sandbox. Vui lòng thử lại.', 502);
  }
  if (!response.ok || data == null || typeof data !== 'object') {
    throw createServiceError('MoMo Sandbox không xử lý được yêu cầu. Vui lòng thử lại.', 502);
  }
  return data;
}

function matchingTransaction(result, keys, order) {
  return result.partnerCode === keys.partnerCode && result.orderId === momoId(order.id)
    && Number(result.amount) === order.amountVnd;
}

function sandboxPayUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === SANDBOX ? url.href : null;
  } catch { return null; }
}

export async function createMomoQr(simulator, user, id) {
  const order = await simulator.getOrder(user, id);
  const keys = config();
  if (order.status !== 'Pending') throw createServiceError('Đơn thanh toán không còn ở trạng thái chờ.', 409);
  if (!Number.isSafeInteger(order.amountVnd) || order.amountVnd < 1_000 || order.amountVnd > 50_000_000) {
    throw createServiceError('MoMo Sandbox hỗ trợ khoản thu từ 1.000 đến 50.000.000 đồng, theo số đồng nguyên.', 422);
  }
  const orderId = momoId(order.id);
  const webUrl = (process.env.PUBLIC_WEB_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const apiUrl = (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, '');
  const body = {
    partnerCode: keys.partnerCode,
    storeName: 'HomeStayDorm',
    storeId: 'HomeStayDorm',
    requestId: orderId,
    orderId,
    amount: order.amountVnd,
    orderInfo: `HomeStayDorm test ${order.refId}`,
    redirectUrl: `${webUrl}/thanh-toan-mo-phong/${encodeURIComponent(order.id)}`,
    ipnUrl: process.env.MOMO_TEST_IPN_URL?.trim() || `${apiUrl}/api/thanh-toan-mo-phong/momo/ipn`,
    requestType: 'captureWallet',
    autoCapture: true,
    extraData: '',
    lang: 'vi',
  };
  const result = await callSandbox('create', keys, body, CREATE_FIELDS);
  if (result.resultCode == null || Number(result.resultCode) !== 0) {
    if ([40, 41].includes(Number(result.resultCode))) return { existing: true };
    throw createServiceError(`MoMo Sandbox chưa tạo được mã QR (mã ${Number(result.resultCode) || 'không rõ'}).`, 502);
  }
  if (!matchingTransaction(result, keys, order) || result.requestId !== body.requestId) {
    throw createServiceError('Dữ liệu đơn do MoMo Sandbox trả về không khớp.', 502);
  }
  const payUrl = sandboxPayUrl(result.payUrl);
  const qrCode = typeof result.qrCodeUrl === 'string' && result.qrCodeUrl.trim() ? result.qrCodeUrl.trim() : null;
  if (!payUrl && !qrCode) throw createServiceError('MoMo Sandbox chưa trả mã QR cho đơn thanh toán này.', 502);
  return { qrCode, payUrl };
}

async function recordResult(simulator, order, result) {
  const code = Number(result.resultCode);
  if (order.status !== 'Pending' || (code !== 0 && !CLOSED_CODES.has(code))) return order;
  const transactionId = String(result.transId ?? '');
  if (code === 0 && (!/^\d{1,24}$/.test(transactionId) || /^0+$/.test(transactionId))) {
    throw createServiceError('MoMo Sandbox chưa trả mã giao dịch hợp lệ.', 502);
  }
  const receipt = {
    orderId: order.id,
    amountVnd: order.amountVnd,
    resultCode: code,
    transId: code === 0 ? `MOMOTEST${transactionId}` : 'MOMOTESTFAILED',
    responseTime: Date.now(),
  };
  return simulator.handleIpn({ ...receipt, signature: simulator.sign(receipt) });
}

export async function checkMomoPayment(simulator, user, id) {
  const order = await simulator.getOrder(user, id);
  if (order.status !== 'Pending') return order;
  const keys = config();
  const body = { partnerCode: keys.partnerCode, orderId: momoId(order.id), requestId: randomUUID(), lang: 'vi' };
  const result = await callSandbox('query', keys, body, QUERY_FIELDS);
  if (result.resultCode != null && Number(result.resultCode) === 42) return order;
  if (result.resultCode == null || !matchingTransaction(result, keys, order) || result.requestId !== body.requestId) {
    throw createServiceError('Chưa đối chiếu được đơn thanh toán với MoMo Sandbox.', 502);
  }
  return recordResult(simulator, order, result);
}

export async function handleMomoNotification(simulator, result) {
  const keys = config();
  const signature = String(result.signature ?? '');
  const orderId = String(result.orderId ?? '');
  if (!/^[a-f\d]{64}$/i.test(signature)
    || !timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(sign(keys, result, IPN_FIELDS), 'hex'))
    || result.partnerCode !== keys.partnerCode || result.requestId !== orderId || !/^HSD-SIM[A-F0-9]{24}$/.test(orderId)) {
    throw createServiceError('Thông báo MoMo Sandbox không hợp lệ.', 401);
  }
  const order = await simulator.store.get(orderId.slice(4));
  if (!order || result.resultCode == null || !matchingTransaction(result, keys, order)) {
    throw createServiceError('Thông báo không khớp đơn thanh toán thử.', 400);
  }
  await recordResult(simulator, order, result);
}
