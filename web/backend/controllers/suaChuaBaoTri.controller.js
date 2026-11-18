import * as service from '../services/suaChuaBaoTri.service.js';

const wrap = (fn, status = 200) => async (req, res, next) => {
  try { res.status(status).json(await fn(req)); } catch (err) { next(err); }
};

export const hopDongCuaKhach = wrap((req) => service.hopDongCuaKhach(req.user));
export const danhSach = wrap((req) => service.danhSach(req.user));
export const theoHopDong = wrap((req) => service.theoHopDong(req.user, req.params.maHopDong));
export const taoYeuCau = wrap((req) => service.taoYeuCau(req.user, req.body), 201);
export const tiepNhan = wrap((req) => service.tiepNhan(req.user, req.params.id, req.body));
export const hoanTat = wrap((req) => service.hoanTat(req.user, req.params.id, req.body));
export const tuChoi = wrap((req) => service.tuChoi(req.user, req.params.id, req.body));
