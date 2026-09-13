import { describe, it, expect } from 'vitest';
import {
  canTransitionPayment,
  assertPaymentTransition,
  isTerminalPaymentStatus,
  getDisplayAmountCents,
} from './payment.logic';
import { PaymentStatus, ParticipantType } from '@/types/enums';

describe('machine à états du paiement', () => {
  it('PENDING → AWAITING_CONFIRMATION autorisé', () => {
    expect(
      canTransitionPayment(PaymentStatus.PENDING, PaymentStatus.AWAITING_CONFIRMATION),
    ).toBe(true);
  });
  it('AWAITING_CONFIRMATION → PAID autorisé', () => {
    expect(
      canTransitionPayment(PaymentStatus.AWAITING_CONFIRMATION, PaymentStatus.PAID),
    ).toBe(true);
  });
  it('REJECTED → PAID INTERDIT', () => {
    expect(canTransitionPayment(PaymentStatus.REJECTED, PaymentStatus.PAID)).toBe(false);
  });
  it('PAID → PENDING interdit', () => {
    expect(canTransitionPayment(PaymentStatus.PAID, PaymentStatus.PENDING)).toBe(false);
  });
  it('PAID → REFUNDED autorisé', () => {
    expect(canTransitionPayment(PaymentStatus.PAID, PaymentStatus.REFUNDED)).toBe(true);
  });
  it('idempotence : même statut autorisé', () => {
    expect(canTransitionPayment(PaymentStatus.PAID, PaymentStatus.PAID)).toBe(true);
  });
  it('assertPaymentTransition lève sur transition interdite', () => {
    expect(() =>
      assertPaymentTransition(PaymentStatus.REJECTED, PaymentStatus.PAID),
    ).toThrow();
  });
  it('PAID et REFUNDED sont terminaux', () => {
    expect(isTerminalPaymentStatus(PaymentStatus.REFUNDED)).toBe(true);
    expect(isTerminalPaymentStatus(PaymentStatus.PENDING)).toBe(false);
  });
});

describe('getDisplayAmountCents (indicatif)', () => {
  const event = { alumniPriceCents: 1000, otherPriceCents: 1500 };
  it('NEW_STUDENT → 0 (gratuit)', () => {
    expect(getDisplayAmountCents(ParticipantType.NEW_STUDENT, event)).toBe(0);
  });
  it('ALUMNI → prix ancien', () => {
    expect(getDisplayAmountCents(ParticipantType.ALUMNI, event)).toBe(1000);
  });
  it('OTHER → prix invité', () => {
    expect(getDisplayAmountCents(ParticipantType.OTHER, event)).toBe(1500);
  });
});
