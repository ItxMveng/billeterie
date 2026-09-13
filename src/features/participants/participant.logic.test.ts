import { describe, it, expect } from 'vitest';
import {
  getPaymentRequirement,
  requiresSchool,
  requiresVerification,
  isVerifiedNewStudent,
  deriveInitialStatuses,
  canIssueTicket,
} from './participant.logic';
import {
  ParticipantType,
  VerificationStatus,
  PaymentStatus,
  RegistrationStatus,
  TicketStatus,
} from '@/types/enums';

describe('getPaymentRequirement', () => {
  it('NEW_STUDENT ne requiert pas de paiement', () => {
    expect(
      getPaymentRequirement({ participant_type: ParticipantType.NEW_STUDENT }),
    ).toBe(false);
  });
  it('ALUMNI requiert un paiement', () => {
    expect(
      getPaymentRequirement({ participant_type: ParticipantType.ALUMNI }),
    ).toBe(true);
  });
  it('OTHER requiert un paiement', () => {
    expect(
      getPaymentRequirement({ participant_type: ParticipantType.OTHER }),
    ).toBe(true);
  });
});

describe('requiresSchool', () => {
  it("l'école est obligatoire seulement pour ALUMNI", () => {
    expect(requiresSchool(ParticipantType.ALUMNI)).toBe(true);
    expect(requiresSchool(ParticipantType.NEW_STUDENT)).toBe(false);
    expect(requiresSchool(ParticipantType.OTHER)).toBe(false);
  });
});

describe('requiresVerification', () => {
  it('seul NEW_STUDENT nécessite une vérification', () => {
    expect(requiresVerification(ParticipantType.NEW_STUDENT)).toBe(true);
    expect(requiresVerification(ParticipantType.ALUMNI)).toBe(false);
    expect(requiresVerification(ParticipantType.OTHER)).toBe(false);
  });
});

describe('isVerifiedNewStudent (statut déclaré ≠ preuve)', () => {
  it('NEW_STUDENT + PENDING n\'est PAS un nouveau vérifié', () => {
    expect(
      isVerifiedNewStudent({
        participant_type: ParticipantType.NEW_STUDENT,
        verification_status: VerificationStatus.PENDING,
      }),
    ).toBe(false);
  });
  it('NEW_STUDENT + VERIFIED est un nouveau vérifié', () => {
    expect(
      isVerifiedNewStudent({
        participant_type: ParticipantType.NEW_STUDENT,
        verification_status: VerificationStatus.VERIFIED,
      }),
    ).toBe(true);
  });
  it('ALUMNI même VERIFIED n\'est pas un « nouveau vérifié »', () => {
    expect(
      isVerifiedNewStudent({
        participant_type: ParticipantType.ALUMNI,
        verification_status: VerificationStatus.VERIFIED,
      }),
    ).toBe(false);
  });
});

describe('deriveInitialStatuses', () => {
  it('NEW_STUDENT : vérification PENDING, paiement NOT_REQUIRED', () => {
    expect(deriveInitialStatuses(ParticipantType.NEW_STUDENT)).toEqual({
      verification_status: VerificationStatus.PENDING,
      payment_status: PaymentStatus.NOT_REQUIRED,
      registration_status: RegistrationStatus.PENDING,
      ticket_status: TicketStatus.NOT_GENERATED,
    });
  });
  it('ALUMNI : vérification NOT_REQUIRED, paiement PENDING', () => {
    expect(deriveInitialStatuses(ParticipantType.ALUMNI)).toEqual({
      verification_status: VerificationStatus.NOT_REQUIRED,
      payment_status: PaymentStatus.PENDING,
      registration_status: RegistrationStatus.PENDING,
      ticket_status: TicketStatus.NOT_GENERATED,
    });
  });
  it('OTHER : vérification NOT_REQUIRED, paiement PENDING', () => {
    expect(deriveInitialStatuses(ParticipantType.OTHER)).toEqual({
      verification_status: VerificationStatus.NOT_REQUIRED,
      payment_status: PaymentStatus.PENDING,
      registration_status: RegistrationStatus.PENDING,
      ticket_status: TicketStatus.NOT_GENERATED,
    });
  });
});

describe('canIssueTicket', () => {
  it('refuse si inscription non confirmée', () => {
    expect(
      canIssueTicket({
        participant_type: ParticipantType.ALUMNI,
        payment_status: PaymentStatus.PAID,
        registration_status: RegistrationStatus.PENDING,
      }),
    ).toBe(false);
  });
  it('NEW_STUDENT vérifié + confirmé → billet possible', () => {
    expect(
      canIssueTicket({
        participant_type: ParticipantType.NEW_STUDENT,
        verification_status: VerificationStatus.VERIFIED,
        registration_status: RegistrationStatus.CONFIRMED,
      }),
    ).toBe(true);
  });
  it('NEW_STUDENT non vérifié + confirmé → pas de billet', () => {
    expect(
      canIssueTicket({
        participant_type: ParticipantType.NEW_STUDENT,
        verification_status: VerificationStatus.PENDING,
        registration_status: RegistrationStatus.CONFIRMED,
      }),
    ).toBe(false);
  });
  it('ALUMNI payé + confirmé → billet possible', () => {
    expect(
      canIssueTicket({
        participant_type: ParticipantType.ALUMNI,
        payment_status: PaymentStatus.PAID,
        registration_status: RegistrationStatus.CONFIRMED,
      }),
    ).toBe(true);
  });
  it('ALUMNI non payé + confirmé → pas de billet', () => {
    expect(
      canIssueTicket({
        participant_type: ParticipantType.ALUMNI,
        payment_status: PaymentStatus.PENDING,
        registration_status: RegistrationStatus.CONFIRMED,
      }),
    ).toBe(false);
  });
});
