import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, realpath, stat } from 'node:fs/promises';
import { resolve, basename, sep } from 'node:path';
import { canonicalize } from '@homestaydorm/settlement/evidence';
import { createServiceError } from './serviceErrors.js';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const LIMIT = 5 * 1024 * 1024;
const validCode = id => /^[A-Za-z0-9]{1,6}$/.test(id || '');
export function proofType(buffer) {
  if (buffer.subarray(0,8).toString('hex') === '89504e470d0a1a0a') return 'image/png';
  if (buffer.subarray(0,3).toString('hex') === 'ffd8ff') return 'image/jpeg';
  if (buffer.subarray(0,5).toString() === '%PDF-') return 'application/pdf';
  if (['GIF87a','GIF89a'].includes(buffer.subarray(0,6).toString())) return 'image/gif';
  if (buffer.subarray(0,4).toString() === 'RIFF' && buffer.subarray(8,12).toString() === 'WEBP') return 'image/webp';
  throw createServiceError('Chứng từ phải là ảnh hoặc PDF hợp lệ.', 400);
}

export class ClosureProofs {
  constructor({ directory = resolve('secrets/checkout-closure'), uploads = resolve('uploads/chung-tu-doi-soat') } = {}) {
    Object.assign(this,{directory,uploads});
  }
  async save(contractId, bytes, name, mediaType) {
    if (!validCode(contractId) || !Buffer.isBuffer(bytes) || !bytes.length || bytes.length > LIMIT) throw createServiceError('Chứng từ tối đa 5 MB.',400);
    const id = randomUUID(), folder = resolve(this.directory,contractId);
    await mkdir(folder,{recursive:true});
    const meta = { id, name: basename(name || 'chung-tu').slice(0,160), sha256: hash(bytes), size: bytes.length, mediaType };
    await writeFile(resolve(folder,id+'.bin'),bytes,{flag:'wx',mode:0o600});
    await writeFile(resolve(folder,id+'.json'),JSON.stringify(meta),{flag:'wx',mode:0o600});
    return meta;
  }
  async contact(contractId,file) {
    return this.save(contractId,file?.buffer,file?.originalname,proofType(file?.buffer || Buffer.alloc(0)));
  }
  async get(contractId,id) {
    if (!validCode(contractId) || !/^[a-f0-9-]{36}$/.test(id || '')) throw createServiceError('Không tìm thấy chứng từ.',404);
    try {
      const folder=resolve(this.directory,contractId), meta=JSON.parse(await readFile(resolve(folder,id+'.json'),'utf8'));
      const bytes=await readFile(resolve(folder,id+'.bin'));
      if (hash(bytes)!==meta.sha256 || bytes.length!==meta.size) throw new Error('changed');
      return {meta,bytes};
    } catch {throw createServiceError('Chứng từ thiếu hoặc không khớp mã băm.',409);}
  }
  async financial(row, simulatedOrder) {
    const amount=Number(row.refundDueVnd || row.topUpDueVnd || 0);
    if (!amount || !row.paymentReference || !row.paidAt) return null;
    let bytes,name,mediaType;
    const match=/^\/uploads\/chung-tu-doi-soat\/([A-Za-z0-9_.-]+)$/.exec(row.paymentReference);
    if (match) {
      if (!match[1].startsWith(row.settlementId+'_')) throw createServiceError('Chứng từ không thuộc đối soát này.',409);
      const root=await realpath(this.uploads), file=await realpath(resolve(root,match[1]));
      if (!file.startsWith(root+sep)) throw createServiceError('Đường dẫn chứng từ không hợp lệ.',409);
      if ((await stat(file)).size>LIMIT) throw createServiceError('Chứng từ vượt quá 5 MB.',409);
      bytes=await readFile(file); name=match[1]; mediaType=proofType(bytes);
    } else {
      const sim=/^cong-thanh-toan-mo-phong:([A-Za-z0-9]{1,32}):([A-Za-z0-9_-]{1,40})$/.exec(row.paymentReference);
      const o=sim && await simulatedOrder(sim[1]);
      if (!o || o.status!=='Paid' || o.purpose!=='thu-them-doi-soat' || o.refId!==row.settlementId
        || o.transId!==sim[2] || Number(o.amountVnd)!==amount || !o.paidAt || Number(row.refundDueVnd)>0) {
        throw createServiceError('Chứng từ thu/chi chưa hợp lệ hoặc không khớp đối soát.',409);
      }
      name='bien-nhan-mo-phong.json';mediaType='application/json';
      bytes=Buffer.from(canonicalize({schema:'homestaydorm.simulated-receipt.v1',orderId:sim[1],settlementId:row.settlementId,
        amountVnd:String(amount),transId:o.transId,paidAt:new Date(o.paidAt).toISOString(),simulated:true}));
    }
    if(bytes.length>LIMIT)throw createServiceError('Chứng từ vượt quá 5 MB.',409);
    return { name, sha256:hash(bytes), size:bytes.length, mediaType, amountVnd:String(amount),
      direction:Number(row.refundDueVnd)>0?'refund':'top-up', paidAt:new Date(row.paidAt).toISOString(), bytes };
  }
}
