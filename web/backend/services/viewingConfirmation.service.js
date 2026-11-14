import { executeQuery, executeProcedure, sql } from '../database/connection.js';
import { createServiceError, mapDatabaseError } from './serviceErrors.js';

export function parseViewingId(id) {
  const match=/^([A-Za-z]{2}\d{4})-([1-9]\d*)$/.exec(String(id||''));
  if(!match||!Number.isSafeInteger(Number(match[2]))||Number(match[2])>2147483647)throw createServiceError('Mã lịch xem phòng không hợp lệ.');
  return {maDangKy:match[1],sttLich:Number(match[2])};
}
export async function viewingConfirmationReady(query=executeQuery){
  const result=await query(`SELECT CAST(CASE WHEN
    COL_LENGTH('dbo.LichXemPhong','PhienBanLich') IS NOT NULL AND
    COL_LENGTH('dbo.LichXemPhong','KhachXacNhanPhienBan') IS NOT NULL AND
    COL_LENGTH('dbo.LichXemPhong','ThoiGianKhachXacNhan') IS NOT NULL AND
    OBJECT_ID('dbo.SP_KhachXacNhanLichXem','P') IS NOT NULL AND
    CHARINDEX('-- D-045 confirmed viewing gate',OBJECT_DEFINITION(OBJECT_ID('dbo.SP_GhiNhanKetQuaBuoiXem'))) > 0 AND
    EXISTS(SELECT 1 FROM sys.triggers WHERE object_id=OBJECT_ID('dbo.TR_LichXemPhong_DoiGioXacNhan') AND is_disabled=0)
    THEN 1 ELSE 0 END AS bit) AS ready`);
  return Boolean(result.recordset[0]?.ready);
}
export async function ensureViewingConfirmationReady(query=executeQuery){
  if(!await viewingConfirmationReady(query))throw createServiceError('Chức năng xác nhận lịch chưa sẵn sàng. Vui lòng thử lại sau.',503);
}
export async function attachViewingConfirmations(rows=[],query=executeQuery){
  if(!rows.length)return rows;
  const ready=await viewingConfirmationReady(query),states=new Map();
  if(ready){
    for(let offset=0;offset<rows.length;offset+=500){
      const parameters=[],where=[];
      for(const [i,row] of rows.slice(offset,offset+500).entries()){
        let key;try{key=parseViewingId(row.id||`${row.maDangKy}-${row.sttLich}`);}catch{continue;}
        where.push(`(MaDangKy=@dk${i} AND STTLich=@stt${i})`);
        parameters.push({name:`dk${i}`,type:sql.VarChar(6),value:key.maDangKy},{name:`stt${i}`,type:sql.Int,value:key.sttLich});
      }
      if(!where.length)continue;
      const result=await query(`SELECT CONCAT(MaDangKy,'-',STTLich) AS id, PhienBanLich AS phienBanLich,
        KhachXacNhanPhienBan AS khachXacNhanPhienBan, ThoiGianKhachXacNhan AS thoiGianKhachXacNhan
        FROM dbo.LichXemPhong WHERE ${where.join(' OR ')}`,parameters);
      for(const row of result.recordset)states.set(row.id,row);
    }
  }
  return rows.map(row=>{
    const state=states.get(row.id||`${row.maDangKy}-${row.sttLich}`);
    const confirmed=Boolean(state?.thoiGianKhachXacNhan&&state.khachXacNhanPhienBan===state.phienBanLich);
    return {...row,phienBanLich:state?.phienBanLich??null,thoiGianKhachXacNhan:confirmed?state.thoiGianKhachXacNhan:null,
      khachDaXacNhanLich:confirmed,xacNhanLichSanSang:ready&&Boolean(state),coTheGhiNhanKetQua:Boolean(row.coTheGhiNhanKetQua)&&confirmed};
  });
}
export async function confirmViewing(id,data,user,{query=executeQuery,run=executeProcedure}={}){
  if(user?.vaiTro!=='KhachHang'||!/^KH\d{4}$/.test(user.maNguoiDung||''))throw createServiceError('Chỉ khách hàng được xác nhận lịch của mình.',403);
  const key=parseViewingId(id),version=data?.phienBanLich;
  if(!Number.isSafeInteger(version)||version<1||version>2147483647)throw createServiceError('Phiên bản lịch không hợp lệ. Vui lòng tải lại lịch.');
  await ensureViewingConfirmationReady(query);
  try{
    const result=await run('dbo.SP_KhachXacNhanLichXem',[
      {name:'MaKhachHang',type:sql.VarChar(6),value:user.maNguoiDung},
      {name:'MaDangKy',type:sql.VarChar(6),value:key.maDangKy},
      {name:'STTLich',type:sql.Int,value:key.sttLich},
      {name:'PhienBanLich',type:sql.Int,value:version}
    ]);
    return result.recordset[0];
  }catch(error){mapDatabaseError(error,{50401:404,50402:409});}
}
