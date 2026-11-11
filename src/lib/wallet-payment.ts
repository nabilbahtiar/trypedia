import { createHash } from "crypto";
export const walletPaymentId=(userId:string,orderId:string)=>'pay_'+createHash('sha256').update(userId+':'+orderId).digest('hex').slice(0,32);
