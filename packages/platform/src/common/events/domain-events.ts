/**
 * kia. domain events (in-process bus).
 *
 * Departments communicate through events instead of importing each other's
 * services. The bus is intentionally simple: a typed publish/subscribe registry
 * owned by the platform (`common/`), with a built-in structured-log consumer so
 * every emission is observable in production today, and a documented growth
 * path to persistent outbox / notification-center consumers when scale needs it.
 *
 * Contract rules:
 *  - Event names are `<domain>.<entity>.<happened>` and are part of the
 *    platform contract — renaming one is a breaking change for every consumer.
 *  - Payloads carry IDs and timestamps only. Never put secrets, tokens or PII
 *    beyond the actor id into a payload: events are logged.
 *  - `publish` never throws into the emitting business flow — a broken
 *    consumer must not fail the transaction that produced the event.
 *  - Consumers must be idempotent: at-least-once delivery is the contract.
 */

/** Identity & profile (group domain). */
export interface UserRegisteredEvent {
  name: 'group.user.registered';
  occurredAt: string;
  userId: string;
  via: 'otp' | 'email';
}

export interface UserProfileCompletedEvent {
  name: 'group.user.profile_completed';
  occurredAt: string;
  userId: string;
}

/** Commerce (group domain, consumed by any selling department). */
export interface PaymentCompletedEvent {
  name: 'group.payment.completed';
  occurredAt: string;
  userId: string;
  paymentId: string;
  orderId: string;
  amountCents: number;
  /** Entitlement resource keys granted by this payment, e.g. course:<slug>. */
  grantedEntitlements: string[];
}

/** Events department. */
export interface EventRegistrationCreatedEvent {
  name: 'events.registration.created';
  occurredAt: string;
  userId: string;
  competitionId: string;
  competitionSlug: string;
}

/** Academy department. */
export interface CourseCompletedEvent {
  name: 'academy.course.completed';
  occurredAt: string;
  userId: string;
  courseId: string;
  courseSlug: string;
}

export type DomainEvent =
  | UserRegisteredEvent
  | UserProfileCompletedEvent
  | PaymentCompletedEvent
  | EventRegistrationCreatedEvent
  | CourseCompletedEvent;

export type DomainEventName = DomainEvent['name'];

export type DomainEventHandler<T extends DomainEvent = DomainEvent> = (
  event: T,
) => void | Promise<void>;
