import { randomBytes } from 'node:crypto';
import { isHex, verifyTypedData } from 'viem';
import { AWARD_POINTS, VOUCHER_POINTS, VOUCHER_VND, redemptionData } from '@homestaydorm/settlement/loyalty';
import { createServiceError } from '../../errors/serviceErrors.js';

const uniqueId = () => '0x' + randomBytes(32).toString('hex');
const seconds = () => Math.floor(Date.now() / 1000);
const quoteLifetime = 15 * 60;
const txFailure = error => error?.walk?.(cause => cause.name === 'ContractFunctionRevertedError') != null;

export class LoyaltyService {
  constructor(deployment, chain, store) {
    this.deployment = deployment;
    this.chain = chain;
    this.store = store;
  }

  async overview(customerId) {
    const [wallet, history, contracts] = await Promise.all([
      this.store.getWallet(customerId),
      this.store.history(customerId, this.deployment),
      this.store.contracts(customerId),
    ]);
    return {
      enabled: true,
      linked: Boolean(wallet),
      balance: wallet ? Number(await this.chain.read('balanceOf', [wallet])) : 0,
      awardPoints: AWARD_POINTS,
      voucherPoints: VOUCHER_POINTS,
      voucherVnd: VOUCHER_VND,
      contracts,
      history: history.map(row => ({
        id: row.id, type: row.kind, contractId: row.contractId, invoiceId: row.invoiceId,
        appliedInvoiceId: row.appliedInvoiceId, status: row.status, createdAt: row.createdAt,
        discountVnd: row.discountVnd,
      })),
    };
  }

  async quote(customerId, contractId) {
    if (typeof contractId !== 'string' || !/^[A-Za-z0-9]{1,6}$/.test(contractId)) {
      throw createServiceError('Vui lòng chọn hợp đồng cần áp ưu đãi.');
    }
    const wallet = await this.store.getWallet(customerId);
    if (!wallet) throw createServiceError('Vui lòng xác nhận email để dùng điểm thưởng.', 409);
    if (await this.chain.read('balanceOf', [wallet]) < BigInt(VOUCHER_POINTS)) {
      throw createServiceError('Bạn chưa đủ điểm để đổi ưu đãi này.', 409);
    }
    const row = await this.store.quote({ id: uniqueId(), customerId, contractId, wallet, deadline: seconds() + quoteLifetime }, this.deployment);
    return { id: row.id, contractId: row.contractId, typedData: redemptionData(this.deployment, row) };
  }

  async redeem(customerId, id, signature) {
    if (typeof id !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(id) ||
      typeof signature !== 'string' || signature.length > 4096 || !isHex(signature)) {
      throw createServiceError('Yêu cầu đổi điểm không hợp lệ.');
    }
    const row = await this.store.operation(id, customerId, this.deployment);
    if (row?.kind !== 'Redeem') throw createServiceError('Không tìm thấy yêu cầu đổi điểm.', 404);
    if (row.status !== 'Quoted') return { status: row.status };
    const current = seconds();
    if (Number(row.deadline) <= current) throw createServiceError('Lượt xác nhận đã hết hạn. Vui lòng đổi điểm lại.', 409);
    const typed = redemptionData(this.deployment, row);
    if (!await verifyTypedData({ address: row.wallet, ...typed, signature }).catch(() => false)) {
      throw createServiceError('Xác nhận không khớp với tài khoản của bạn.', 409);
    }
    const queued = await this.store.queueRedemption(row, signature, current, this.deployment);
    return { status: queued.status };
  }

  async processOne() {
    const pending = await this.store.locked(`loyalty-operator:${this.deployment.chainId}`, async tx => {
      await this.store.discoverAwards(this.deployment, tx);
      const row = await this.store.next(this.deployment, tx);
      if (!row) return null;
      if (row.pending) return { id: row.id, tx: JSON.parse(row.pending) };

      const redeem = row.kind === 'Redeem';
      const wallet = redeem ? row.wallet : row.linkedWallet;
      if (redeem && Number(row.deadline) <= seconds()) {
        await this.store.finish(row.id, 'Failed', tx);
        return null;
      }
      const args = redeem ? [wallet, row.id, BigInt(row.deadline), row.signature] : [wallet, row.id];
      let transaction;
      try {
        transaction = await this.chain.prepare('relayer', redeem ? 'redeem' : 'award', args,
          redeem ? 'PointsRedeemed' : 'PointsAwarded', { id: row.id, wallet, amount: redeem ? VOUCHER_POINTS : AWARD_POINTS });
      } catch (error) {
        if (!redeem || !txFailure(error)) throw error;
        await this.store.finish(row.id, 'Failed', tx);
        return null;
      }
      await this.store.markSent(row, transaction, wallet, tx);
      return { id: row.id, tx: transaction };
    });
    if (!pending) return false;
    // The signed bytes are already durable. A restart or SQL outage reuses the same transaction.
    const receipt = await this.chain.settle(pending.tx);
    await this.store.finish(pending.id, receipt.failed ? 'Failed' : 'Confirmed');
    return true;
  }
}
