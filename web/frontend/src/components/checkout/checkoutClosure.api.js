import { httpClient } from '../../api/httpClient.js';
const base = '/checkout-lifecycle';
export const listClosures = async () => (await httpClient.get(base)).data;
export const getClosure = async id => (await httpClient.get(`${base}/${encodeURIComponent(id)}`)).data;
export const actOnClosure = async (id, action, body = {}) => (await httpClient.post(`${base}/${encodeURIComponent(id)}/${action}`, body)).data;
export async function uploadContactEvidence(id, file) {
  const form = new FormData(); form.append('file', file);
  return (await httpClient.post(`${base}/${encodeURIComponent(id)}/contact-evidence`, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
}
export async function downloadClosure(id) {
  const response = await httpClient.get(`${base}/${encodeURIComponent(id)}/bundle`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data), link = document.createElement('a');
  link.href = url; link.download = `ket-thuc-${id}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const closureError = error => error.response?.data?.message || error.message || 'Không thực hiện được. Vui lòng thử lại.';
