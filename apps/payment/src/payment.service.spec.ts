/**
 * Payment saga logic — charge succeeds under the limit, fails over it.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PaymentService } from './payment.service.js';

describe('PaymentService', () => {
  let svc: PaymentService;
  beforeEach(() => {
    svc = new PaymentService();
  });

  it('charges successfully under the limit', () => {
    svc.rememberAmount('o1', 100);
    const r = svc.charge('o1');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.amount).toBe(100);
  });

  it('fails over the limit (triggers compensation path)', () => {
    svc.rememberAmount('o2', 999);
    const r = svc.charge('o2');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/exceeds/);
  });
});
