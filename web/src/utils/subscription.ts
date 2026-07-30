export interface Subscription {
  plan: string;
  status: string;
  trialEndsAt?: string | null;
  expiresAt?: string | null;
  modules: string[];
  usersLimit: number;
  smsCredits: number;
}

/**
 * Returns true when the business is currently within its free trial period.
 */
export function isTrialActive(subscription?: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'trial') return false;
  // A trial without an end date is treated as still active.
  if (!subscription.trialEndsAt) return true;
  return new Date(subscription.trialEndsAt).getTime() > Date.now();
}

/**
 * Returns true when the free trial has ended and no paid plan is active.
 */
export function isTrialExpired(subscription?: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status === 'expired') return true;
  if (subscription.status === 'trial' && subscription.trialEndsAt) {
    return new Date(subscription.trialEndsAt).getTime() <= Date.now();
  }
  return false;
}

/**
 * Number of whole days remaining in the trial (0 when expired or none).
 */
export function getTrialDaysLeft(subscription?: Subscription | null): number {
  if (!subscription?.trialEndsAt) return 0;
  const diff = new Date(subscription.trialEndsAt).getTime() - Date.now();
  // Use Math.floor so the "days remaining" label matches the detailed
  // countdown (e.g. 4d 12h shows "4 days", not "5 days").
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Returns the remaining time until the trial ends as a breakdown of
 * days / hours / minutes / seconds. All values are 0 when expired or none.
 */
export function getTrialTimeLeft(subscription?: Subscription | null, now: number = Date.now()): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
} {
  const zero = { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  if (!subscription?.trialEndsAt) return { ...zero, expired: false };
  const diff = new Date(subscription.trialEndsAt).getTime() - now;
  if (diff <= 0) return zero;
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: false,
  };
}

/**
 * Returns true when the application should be locked:
 * - the free trial has ended without a purchase, or
 * - the (paid) subscription has ended (expiresAt passed), or
 * - the subscription status is explicitly 'expired'.
 * An active paid plan with a future/empty expiresAt is NOT locked.
 */
export function isSubscriptionLocked(subscription?: Subscription | null): boolean {
  if (!subscription) return false;

  if (subscription.status === 'expired') return true;

  if (subscription.status === 'trial') {
    // Trial is locked only once its end date has passed.
    if (!subscription.trialEndsAt) return false;
    return new Date(subscription.trialEndsAt).getTime() <= Date.now();
  }

  // Any other status (active, paid, etc.) is locked only if its
  // subscription expiry date has passed.
  if (subscription.expiresAt) {
    return new Date(subscription.expiresAt).getTime() <= Date.now();
  }

  return false;
}
