import { confirmViewing } from '../services/viewingConfirmation.service.js';
export async function confirmViewingHandler(req,res,next){
  try{res.json(await confirmViewing(req.params.id,req.body,req.user));}catch(error){next(error);}
}
