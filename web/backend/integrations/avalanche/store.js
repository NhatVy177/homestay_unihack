import { getPool, sql } from '../../database/connection.js';
const conflict = () => Object.assign(new Error('Hồ sơ vừa thay đổi. Vui lòng tải lại.'), { statusCode: 409 });
export class SqlStore {
  async query(text, values = {}, db) {
    const request = (db || await getPool()).request();
    for (const [key, value] of Object.entries(values)) {
      if (text.includes('@' + key)) request.input(key, typeof value === 'number' ? sql.Int : sql.NVarChar(sql.MAX), value);
    }
    return request.query(text);
  }
  async getWallet(userId) {
    return (await this.query('SELECT Address AS address FROM dbo.AvalancheWallet WHERE UserId=@userId', { userId })).recordset[0]?.address;
  }
  async challenge(record) {
    await this.query('INSERT dbo.AvalancheChallenge(Id,UserId,Address,Message,ExpiresAt) VALUES(@id,@userId,@address,@message,@expiresAt)', record);
  }
  async getChallenge(id) {
    return (await this.query('SELECT Id AS id,UserId AS userId,Address AS address,Message AS message,ExpiresAt AS expiresAt,Used AS used FROM dbo.AvalancheChallenge WHERE Id=@id', { id })).recordset[0];
  }
  async link(record) {
    const transaction = new sql.Transaction(await getPool());
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const result = await this.query('UPDATE dbo.AvalancheChallenge SET Used=1 WHERE Id=@id AND UserId=@userId AND Used=0 AND ExpiresAt>SYSUTCDATETIME()', record, transaction);
      if (result.rowsAffected[0] !== 1) throw conflict();
      const existing = await this.query('SELECT Address FROM dbo.AvalancheWallet WHERE UserId=@userId', record, transaction);
      if (existing.recordset.length) {
        if (existing.recordset[0].Address.toLowerCase() !== record.address.toLowerCase()) throw conflict();
      } else await this.query('INSERT dbo.AvalancheWallet(UserId,Address) VALUES(@userId,@address)', record, transaction);
      await transaction.commit();
    } catch (error) { await transaction.rollback(); throw error; }
  }
  async getCase(id) {
    const row = (await this.query('SELECT Data,Revision FROM dbo.AvalancheCase WHERE Id=@id', { id })).recordset[0];
    return row && { ...JSON.parse(row.Data), revision: row.Revision };
  }
  async pendingForSigner(signer) {
    return (await this.query("SELECT TOP (1) Id AS id FROM dbo.AvalancheCase WHERE LOWER(JSON_VALUE(Data,'$.pending.signer'))=LOWER(@signer)", { signer })).recordset[0]?.id;
  }
  async listCases(user) {
    const clause = user.vaiTro === 'KhachHang' ? 'CustomerId=@scope' : 'BranchId=@scope';
    const rows = (await this.query('SELECT Data,Revision FROM dbo.AvalancheCase WHERE ' + clause,
      { scope: user.vaiTro === 'KhachHang' ? user.maNguoiDung : user.maChiNhanh })).recordset;
    return rows.map(row => ({ ...JSON.parse(row.Data), revision: row.Revision }));
  }
  async saveCase(record, expected = null) {
    if (expected === null) {
      await this.query('INSERT dbo.AvalancheCase(Id,ContractId,CustomerId,BranchId,Data) VALUES(@id,@contractId,@customerId,@branchId,@data)',
        { ...record, data: JSON.stringify(record) });
      return { ...record, revision: 0 };
    }
    const result = await this.query('UPDATE dbo.AvalancheCase SET Data=@data,Revision=Revision+1 WHERE Id=@id AND Revision=@expected',
      { id: record.id, data: JSON.stringify(record), expected });
    if (result.rowsAffected[0] !== 1) throw conflict();
    return { ...record, revision: expected + 1 };
  }
}
