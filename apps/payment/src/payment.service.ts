/**
 * PAYMENT domain logic.
 * Builds its OWN read model (orderId -> amount) from ORDER_CREATED events
 * (event-carried state transfer), then charges when inventory is reserved.
 * Charge is mocked: amounts over a threshold "fail" to demonstrate the failure/
 * compensation path.
 */

import { Injectable } from '@nestjs/common';

const FAIL_OVER = 500; // demo: charges above this amount fail

@Injectable()
export class PaymentService {
  private readonly amounts = new Map<string, number>();

  rememberAmount(orderId: string, amount: number) {
    this.amounts.set(orderId, amount);
  }

  /** Returns null on success, or a failure reason. */
  charge(orderId: string): { ok: true; amount: number } | { ok: false; reason: string } {
    const amount = this.amounts.get(orderId) ?? 0;
    if (amount > FAIL_OVER) return { ok: false, reason: `Amount ${amount} exceeds limit` };
    return { ok: true, amount };
  }
}
