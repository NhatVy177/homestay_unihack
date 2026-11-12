import { Router } from 'express';
import multer from 'multer';
import { canonicalize } from '@homestaydorm/settlement/evidence';
import { getCheckoutClosure } from '../integrations/checkoutClosure/index.js';
const router=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
const route=fn=>async(req,res,next)=>{try{await fn(getCheckoutClosure(),req,res);}catch(e){next(e);}};
router.get('/',route(async(s,r,res)=>res.json(await s.list(r.user))));
router.get('/:id',route(async(s,r,res)=>res.json(await s.status(r.user,r.params.id))));
router.get('/:id/bundle',route(async(s,r,res)=>{
  const bundle=await s.download(r.user,r.params.id);
  res.attachment(`ket-thuc-${r.params.id}.json`).type('application/json').send(canonicalize(bundle)+'\n');
}));
router.get('/:id/proofs/:proofId',route(async(s,r,res)=>{
  const {meta,bytes}=await s.proof(r.user,r.params.id,r.params.proofId);
  res.attachment(meta.name).type(meta.mediaType).send(bytes);
}));
router.post('/:id/reconcile',route(async(s,r,res)=>{await s.context(r.user,r.params.id);await s.reconcile(r.params.id);res.json(await s.status(r.user,r.params.id));}));
router.post('/:id/contact-evidence',async(req,res,next)=>{
  try{await getCheckoutClosure().context(req.user,req.params.id,'Quản lý');next();}catch(e){next(e);}
},upload.single('file'),route(async(s,r,res)=>res.status(201).json(await s.uploadContact(r.user,r.params.id,r.file))));
router.post('/:id/prepare-exception',route(async(s,r,res)=>res.json(await s.prepareException(r.user,r.params.id,r.body.reason,r.body.proofId))));
router.post('/:id/close-without-consent',route(async(s,r,res)=>res.json(await s.closeWithoutConsent(r.user,r.params.id))));
router.post('/:id/keys-returned',route(async(s,r,res)=>res.json(await s.returnKeys(r.user,r.params.id))));
export default router;
