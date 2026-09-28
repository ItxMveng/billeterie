import { describe, it, expect } from 'vitest';
import {
  getPaymentRequirement,
  requiresSchool,
  requiresVerification,
  isVerifiedNewStudent,
  deriveInitialStatuses,
  canIssueTicket,
  canGenerateTicket,
  resolvePaymentRequired,
} from './participant.logic';
import {
  ParticipantType,
  VerificationStatus,
  PaymentStatus,
  RegistrationStatus,
  TicketStatus,
} from '@/types/enums';

describe('getPaymentRequirement (piloté par le tarif)', () => {
  it('NEW_STUDENT est gratuit, quel que soit le tarif', () => {
    expect(getPaymentRequirement({ participant_type: ParticipantType.NEW_STUDENT })).toBe(false);
    expect(getPaymentRequirement({ participant_type: ParticipantType.NEW_STUDENT }, 2500)).toBe(false);
  });
  it('sans tarif configuré, tout le monde est gratuit', () => {
    expect(getPaymentRequirement({ participant_type: ParticipantType.ALUMNI })).toBe(false);
    expect(getPaymentRequirement({ participant_type: ParticipantType.OTHER })).toBe(false);
    expect(getPaymentRequirement({ participant_type: ParticipantType.ALUMNI }, 0)).toBe(false);
  });
  it('un tarif strictement positif rend le paiement obligatoire', () => {
    expect(getPaymentRequirement({ participant_type: ParticipantType.ALUMNI }, 2500)).toBe(true);
    expect(getPaymentRequirement({ participant_type: ParticipantType.OTHER }, 1)).toBe(true);
  });
});

describe('requiresSchool', () => {
  it("l'école est obligatoire pour NEW_STUDENT et ALUMNI, pas pour OTHER", () => {
    expect(requiresSchool(ParticipantType.NEW_STUDENT)).toBe(true);
    expect(requiresSchool(ParticipantType.ALUMNI)).toBe(true);
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
  it('ALUMNI et OTHER : gratuits par défaut (aucun tarif configuré)', () => {
    for (const type of [ParticipantType.ALUMNI, ParticipantType.OTHER]) {
      expect(deriveInitialStatuses(type)).toEqual({
        verification_status: VerificationStatus.NOT_REQUIRED,
        payment_status: PaymentStatus.NOT_REQUIRED,
        registration_status: RegistrationStatus.PENDING,
        ticket_status: TicketStatus.NOT_GENERATED,
      });
    }
  });
});

describe('canIssueTicket (déprécié : exige CONFIRMED en plus)', () => {
  it('refuse si inscription non confirmée', () => {
    expect(
      canIssueTicket({
        participant_type: ParticipantType.ALUMNI,
        registration_status: RegistrationStatus.PENDING,
      }),
    ).toBe(false);
  });
  it('confirmé et gratuit → billet', () => {
    expect(
      canIssueTicket({
        participant_type: ParticipantType.ALUMNI,
        registration_status: RegistrationStatus.CONFIRMED,
      }),
    ).toBe(true);
  });
  it('confirmé mais paiement requis non encaissé → pas de billet', () => {
    expect(
      canIssueTicket({
        participant_type: ParticipantType.ALUMNI,
        payment_required: true,
        payment_status: PaymentStatus.PENDING,
        registration_status: RegistrationStatus.CONFIRMED,
      }),
    ).toBe(false);
  });
});

describe('resolvePaymentRequired (exemptions)', () => {
  it('sans tarif ni valeur explicite, la participation est gratuite', () => {
    expect(resolvePaymentRequired({ participant_type: ParticipantType.ALUMNI })).toBe(false);
    expect(resolvePaymentRequired({ participant_type: ParticipantType.NEW_STUDENT })).toBe(false);
  });
  it('une obligation explicite prime (tarif configuré côté serveur)', () => {
    expect(
      resolvePaymentRequired({
        participant_type: ParticipantType.ALUMNI,
        payment_required: true,
      }),
    ).toBe(true);
  });
  it('une exemption explicite prime (dirigeant exempté)', () => {
    expect(
      resolvePaymentRequired({
        participant_type: ParticipantType.ALUMNI,
        payment_required: false,
      }),
    ).toBe(false);
  });
});

describe('canGenerateTicket (source de vérité)', () => {
  it("une vérification PENDING ne bloque plus l'émission", () => {
    expect(
      canGenerateTicket({
        participant_type: ParticipantType.NEW_STUDENT,
        verification_status: VerificationStatus.PENDING,
      }),
    ).toBe(true);
  });
  it('NEW_STUDENT vérifié → billet', () => {
    expect(
      canGenerateTicket({
        participant_type: ParticipantType.NEW_STUDENT,
        verification_status: VerificationStatus.VERIFIED,
      }),
    ).toBe(true);
  });
  it('une vérification REJETÉE bloque le billet', () => {
    expect(
      canGenerateTicket({
        participant_type: ParticipantType.NEW_STUDENT,
        verification_status: VerificationStatus.REJECTED,
      }),
    ).toBe(false);
  });
  it('inscription REJETÉE → jamais de billet', () => {
    expect(
      canGenerateTicket({
        participant_type: ParticipantType.OTHER,
        registration_status: RegistrationStatus.REJECTED,
      }),
    ).toBe(false);
  });
  it('gratuit (aucun tarif) → billet immédiat', () => {
    expect(canGenerateTicket({ participant_type: ParticipantType.OTHER })).toBe(true);
    expect(canGenerateTicket({ participant_type: ParticipantType.ALUMNI })).toBe(true);
  });
  it('si un paiement est requis, il doit être encaissé', () => {
    expect(
      canGenerateTicket({
        participant_type: ParticipantType.ALUMNI,
        payment_required: true,
        payment_status: PaymentStatus.AWAITING_CONFIRMATION,
      }),
    ).toBe(false);
    expect(
      canGenerateTicket({
        participant_type: ParticipantType.ALUMNI,
        payment_required: true,
        payment_status: PaymentStatus.PAID,
      }),
    ).toBe(true);
  });
  it('participant exempté → billet sans paiement', () => {
    expect(
      canGenerateTicket({
        participant_type: ParticipantType.OTHER,
        payment_required: false,
        payment_status: PaymentStatus.NOT_REQUIRED,
      }),
    ).toBe(true);
  });
});
