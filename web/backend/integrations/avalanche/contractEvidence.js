import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { policyVersion } from '@homestaydorm/settlement/evidence';
import { SqlStore } from './store.js';
import { policyText } from './policy.js';

const fail = (message, statusCode = 409) => { throw Object.assign(new Error(message), { statusCode }); };
const id = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9]{1,6}$/.test(value)) fail('Mã hồ sơ không hợp lệ.', 400);
  return value;
};
const publicPolicy = row => ({ text: row.text, version: row.version,
  requiresConfirmation: Boolean(row.requiresConfirmation), confirmedAt: row.confirmedAt || null,
  ready: !row.requiresConfirmation || Boolean(row.confirmedAt) });
export const signedDirectory = fileURLToPath(new URL('../../secrets/signed-contracts/', import.meta.url));

export class SqlContractEvidence {
  constructor() { this.store = new SqlStore(); }
  query(text, values) { return this.store.query(text, values); }
  async slip(depositId) {
    return (await this.query(`SELECT p.MaPhieuDatCoc AS depositId,p.MaKhachHang AS customerId,
      (SELECT TOP (1) ph.MaChiNhanh FROM dbo.ChiTietDatCoc d JOIN dbo.Phong ph ON ph.MaPhong=d.MaPhong
       WHERE d.MaPhieuDatCoc=p.MaPhieuDatCoc) AS branchId
      FROM dbo.PhieuDatCoc p WHERE p.MaPhieuDatCoc=@id`, { id: id(depositId) })).recordset[0];
  }
  async contract(contractId) {
    return (await this.query(`SELECT h.MaHopDong AS contractId,h.MaPhieuCoc AS depositId,h.MaKhachHang AS customerId,
      h.GiaThue AS rentVnd,CONVERT(char(10),h.NgayBatDau,23) AS startDate,
      CONVERT(char(10),h.NgayKetThuc,23) AS endDate,h.KyThanhToan AS paymentCycle,p.SoTienCoc AS depositVnd,
      (SELECT TOP (1) ph.MaChiNhanh FROM dbo.ChiTietDatCoc d JOIN dbo.Phong ph ON ph.MaPhong=d.MaPhong
       WHERE d.MaPhieuDatCoc=h.MaPhieuCoc) AS branchId
      FROM dbo.HopDongThue h JOIN dbo.PhieuDatCoc p ON p.MaPhieuDatCoc=h.MaPhieuCoc
      WHERE h.MaHopDong=@id`, { id: id(contractId) })).recordset[0];
  }
  async rules() {
    return (await this.query('SELECT TenQuyDinh,TyLeHoanCoc FROM dbo.QuyDinhHoanCoc ORDER BY MaQuyDinhHoanCoc')).recordset;
  }
  async saved(depositId) {
    return (await this.query(`SELECT PolicyText AS text,PolicyVersion AS version,RequiresConfirmation AS requiresConfirmation,
      ConfirmedAt AS confirmedAt FROM dbo.DepositPolicySnapshot WHERE DepositId=@id`, { id: id(depositId) })).recordset[0];
  }
  async snapshot(depositId, text, version) {
    // Serializes capture with concurrent email/UI reads; an existing snapshot is immutable.
    return (await this.query(`SET XACT_ABORT ON; BEGIN TRANSACTION;
      IF NOT EXISTS(SELECT 1 FROM dbo.DepositPolicySnapshot WITH (UPDLOCK,HOLDLOCK) WHERE DepositId=@id)
        INSERT dbo.DepositPolicySnapshot(DepositId,PolicyText,PolicyVersion,CapturedAt)
          VALUES(@id,@text,@version,SYSUTCDATETIME());
      UPDATE dbo.DepositPolicySnapshot SET PolicyText=@text,PolicyVersion=@version,CapturedAt=SYSUTCDATETIME()
        WHERE DepositId=@id AND PolicyText IS NULL;
      SELECT PolicyText AS text,PolicyVersion AS version,RequiresConfirmation AS requiresConfirmation,
        ConfirmedAt AS confirmedAt FROM dbo.DepositPolicySnapshot WHERE DepositId=@id;
      COMMIT TRANSACTION;`, { id: id(depositId), text, version })).recordset[0];
  }
  async confirm(depositId, version, userId) {
    const result = await this.query(`UPDATE dbo.DepositPolicySnapshot SET ConfirmedAt=COALESCE(ConfirmedAt,SYSUTCDATETIME()),
      ConfirmedBy=COALESCE(ConfirmedBy,@userId) WHERE DepositId=@id AND PolicyVersion=@version;
      SELECT @@ROWCOUNT AS changed;`, { id: id(depositId), version, userId });
    if (result.recordset[0]?.changed !== 1) fail('Chính sách đã đổi, vui lòng tải lại.');
  }
  async caseForContract(contractId) {
    const row = (await this.query('SELECT Data FROM dbo.AvalancheCase WHERE ContractId=@id', { id: id(contractId) })).recordset[0];
    return row && JSON.parse(row.Data);
  }
  async file(contractId) {
    return (await this.query(`SELECT StoredName AS name,MediaType AS mediaType,Sha256 AS sha256
      FROM dbo.SignedContractEvidence WHERE ContractId=@id`, { id: id(contractId) })).recordset[0];
  }
  async saveFile(contractId, file, userId) {
    await this.query(`SET XACT_ABORT ON; BEGIN TRANSACTION;
      IF EXISTS(SELECT 1 FROM dbo.SignedContractEvidence WITH (UPDLOCK,HOLDLOCK) WHERE ContractId=@id)
        UPDATE dbo.SignedContractEvidence SET StoredName=@name,MediaType=@mediaType,Sha256=@sha256,
          UploadedAt=SYSUTCDATETIME(),UploadedBy=@userId WHERE ContractId=@id;
      ELSE INSERT dbo.SignedContractEvidence(ContractId,StoredName,MediaType,Sha256,UploadedBy)
        VALUES(@id,@name,@mediaType,@sha256,@userId);
      COMMIT TRANSACTION;`, { id: id(contractId), ...file, userId });
  }
}

export class ContractEvidence {
  constructor({ repository = new SqlContractEvidence(), directory = signedDirectory } = {}) {
    this.repository = repository; this.directory = resolve(directory);
  }
  access(user, row, upload = false) {
    if (!row) fail('Không tìm thấy hồ sơ.', 404);
    if (!upload && user?.vaiTro === 'KhachHang' && user.maNguoiDung === row.customerId) return;
    if (user?.vaiTro === 'NhanVien' && (upload ? user.chucVu === 'Sale' : ['Sale', 'Quản lý', 'Kế toán'].includes(user.chucVu))
      && user.maChiNhanh && user.maChiNhanh === row.branchId) return;
    fail('Hồ sơ không thuộc quyền truy cập của bạn.', 403);
  }
  async capture(depositId) {
    if (!await this.repository.slip(id(depositId))) fail('Không tìm thấy phiếu cọc.', 404);
    let row = await this.repository.saved(depositId);
    if (!row?.text) {
      const rules = await this.repository.rules();
      if (!rules.length) fail('Chưa có chính sách hoàn cọc trong hệ thống.');
      const text = policyText(rules);
      row = await this.repository.snapshot(depositId, text, policyVersion(text));
    }
    if (!row?.text || row.version !== policyVersion(row.text)) fail('Bản chính sách đã lưu không hợp lệ.');
    return publicPolicy(row);
  }
  async policy(user, depositId) {
    this.access(user, await this.repository.slip(id(depositId)));
    return this.capture(depositId);
  }
  async confirm(user, depositId, version) {
    const slip = await this.repository.slip(id(depositId));
    if (user?.vaiTro !== 'KhachHang' || !slip || user.maNguoiDung !== slip.customerId)
      fail('Chỉ khách đứng tên phiếu cọc được xác nhận chính sách.', 403);
    const current = await this.capture(depositId);
    if (current.version !== version) fail('Chính sách đã đổi, vui lòng tải lại.');
    await this.repository.confirm(depositId, version, user.maNguoiDung);
    return this.capture(depositId);
  }
  path(name) {
    if (!/^[A-Za-z0-9-]+\.(pdf|png|jpg|webp)$/.test(name || '')) fail('Tên file hợp đồng không hợp lệ.');
    const target = resolve(this.directory, name);
    if (!target.startsWith(this.directory + sep)) fail('Đường dẫn hợp đồng không hợp lệ.');
    return target;
  }
  async read(contractId) {
    const file = await this.repository.file(id(contractId));
    if (!file) return null;
    let buffer;
    try { buffer = await readFile(this.path(file.name)); }
    catch (error) { if (error.code === 'ENOENT') fail('Không tìm thấy file hợp đồng đã ký, cần kiểm tra lại.'); throw error; }
    if (createHash('sha256').update(buffer).digest('hex') !== file.sha256) fail('Ảnh hợp đồng đã thay đổi, cần kiểm tra lại.');
    return { file, buffer };
  }
  async metadata(user, contractId) {
    this.access(user, await this.repository.contract(id(contractId)));
    const record = await this.read(contractId);
    return record?.file || null;
  }
  async upload(user, contractId, file) {
    this.access(user, await this.repository.contract(id(contractId)), true);
    const c = await this.repository.caseForContract(contractId);
    if (c && (c.handover || c.pending || c.drafts?.some(d => d.handover?.payload?.schema === 'homestaydorm.handover.v2')))
      fail('Bằng chứng đã phát hành, không thể thay ảnh hợp đồng.');
    const ext = fileExtension(file);
    const record = { name: `hop-dong-${contractId}-${randomUUID()}.${ext}`, mediaType: file.mimetype,
      sha256: createHash('sha256').update(file.buffer).digest('hex') };
    await mkdir(this.directory, { recursive: true });
    const target = this.path(record.name);
    await writeFile(target, file.buffer, { flag: 'wx', mode: 0o600 });
    try { await this.repository.saveFile(contractId, record, user.maNguoiDung); }
    catch (error) { await unlink(target).catch(() => {}); throw error; }
    // Keep prior immutable files private: an already-created snapshot may still refer to their hashes.
    return record;
  }
  async source(contractId) {
    const contract = await this.repository.contract(id(contractId));
    if (!contract) fail('Không tìm thấy hợp đồng.', 404);
    const policy = await this.capture(contract.depositId);
    if (!policy.ready) fail('Khách cần xác nhận chính sách bổ sung trên phiếu cọc trước khi phát hành bàn giao v2.');
    const record = await this.read(contractId);
    if (!record) fail('Sale cần tải ảnh hợp đồng đã ký trước khi phát hành bàn giao v2.');
    const money = value => {
      if (!Number.isSafeInteger(Number(value)) || value === null || Number(value) < 0) fail('Số tiền hợp đồng không hợp lệ.');
      return String(Number(value));
    };
    return {
      policy: policy.text, policyVersion: policy.version,
      contractTerms: { contractId: contract.contractId, rentVnd: money(contract.rentVnd), startDate: contract.startDate,
        endDate: contract.endDate, paymentCycle: contract.paymentCycle, depositVnd: money(contract.depositVnd) },
      signedContract: { name: record.file.name, sha256: record.file.sha256 },
    };
  }
}

export function fileExtension(file) {
  const buffer = file?.buffer;
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > 5 * 1024 * 1024) fail('Chọn ảnh hoặc PDF hợp đồng, tối đa 5 MB.', 400);
  if (file.mimetype === 'application/pdf' && buffer.subarray(0, 5).toString() === '%PDF-') return 'pdf';
  if (file.mimetype === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'png';
  if (file.mimetype === 'image/jpeg' && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'jpg';
  if (file.mimetype === 'image/webp' && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'webp';
  fail('File hợp đồng phải là PNG, JPG, WebP hoặc PDF đúng định dạng.', 400);
}

export const contractEvidence = new ContractEvidence();
