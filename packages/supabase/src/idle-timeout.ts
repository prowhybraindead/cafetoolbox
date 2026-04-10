/**
 * @cafetoolbox/idle-timeout - Idle Timeout Mechanism
 *
 * Tracks user activity and auto-logout after period of inactivity
 * Default: 30 minutes
 */

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const WARNING_TIMEOUT_MS = 25 * 60 * 1000; // 25 minutes (5 min warning)

export interface IdleTimerCallbacks {
  onWarning?: (remainingTime: number) => void;
  onTimeout?: () => void;
  onActivity?: () => void;
}

let idleTimer: ReturnType<typeof setTimeout> | null = null;
let warningTimer: ReturnType<typeof setTimeout> | null = null;
let lastActivityTime = Date.now();
let callbacks: IdleTimerCallbacks = {};

/**
 * Update last activity timestamp and restart timers
 */
function resetTimers() {
  const now = Date.now();
  lastActivityTime = now;

  // Clear existing timers
  if (idleTimer) clearTimeout(idleTimer);
  if (warningTimer) clearTimeout(warningTimer);

  // Call onActivity callback
  if (callbacks.onActivity) {
    callbacks.onActivity();
  }

  // Set new timers
  warningTimer = setTimeout(() => {
    const remainingTime = IDLE_TIMEOUT_MS - WARNING_TIMEOUT_MS;
    if (callbacks.onWarning) {
      callbacks.onWarning(remainingTime);
    }
  }, WARNING_TIMEOUT_MS);

  idleTimer = setTimeout(() => {
    if (callbacks.onTimeout) {
      callbacks.onTimeout();
    }
  }, IDLE_TIMEOUT_MS);
}

/**
 * Listen for user activity events
 */
function setupActivityListeners() {
  const events = [
    'mousemove',
    'mousedown',
    'keydown',
    'scroll',
    'touchstart',
  ];

  events.forEach((event) => {
    document.addEventListener(event, resetTimers, { passive: true });
  });

  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Check if timeout occurred while hidden
      const inactiveTime = Date.now() - lastActivityTime;
      if (inactiveTime >= IDLE_TIMEOUT_MS) {
        if (callbacks.onTimeout) {
          callbacks.onTimeout();
        }
      } else {
        // Restart timers
        resetTimers();
      }
    }
  });
}

/**
 * Remove activity listeners
 */
function removeActivityListeners() {
  const events = [
    'mousemove',
    'mousedown',
    'keydown',
    'scroll',
    'touchstart',
  ];

  events.forEach((event) => {
    document.removeEventListener(event, resetTimers);
  });
}

/**
 * Start idle timeout tracking
 */
export function startIdleTimer(
  timerCallbacks: IdleTimerCallbacks = {},
  customTimeoutMs?: number,
  customWarningMs?: number
) {
  callbacks = timerCallbacks;

  // Clear any existing timers
  if (idleTimer) clearTimeout(idleTimer);
  if (warningTimer) clearTimeout(warningTimer);

  // Update timeouts if custom values provided
  const idleTimeout = customTimeoutMs || IDLE_TIMEOUT_MS;
  const warningTimeout = customWarningMs || WARNING_TIMEOUT_MS;

  // Set initial timestamp
  lastActivityTime = Date.now();

  // Setup activity listeners
  setupActivityListeners();

  // Start timers
  if (warningTimeout > 0) {
    warningTimer = setTimeout(() => {
      const remainingTime = idleTimeout - warningTimeout;
      if (callbacks.onWarning) {
        callbacks.onWarning(remainingTime);
      }
    }, warningTimeout);
  }

  idleTimer = setTimeout(() => {
    if (callbacks.onTimeout) {
      callbacks.onTimeout();
    }
  }, idleTimeout);
}

/**
 * Stop idle timeout tracking
 */
export function stopIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  if (warningTimer) clearTimeout(warningTimer);

  idleTimer = null;
  warningTimer = null;

  removeActivityListeners();
}

/**
 * Get elapsed time since last activity
 */
export function getElapsedTime(): number {
  return Date.now() - lastActivityTime;
}

/**
 * Reset idle timer manually
 */
export function resetIdleTimer() {
  resetTimers();
}

/**
 * Check if user is idle (true if more than IDLE_TIMEOUT_MS has passed)
 */
export function isUserIdle(customTimeoutMs?: number): boolean {
  const timeout = customTimeoutMs || IDLE_TIMEOUT_MS;
  return getElapsedTime() >= timeout;
}

/**
 * Update last_activity timestamp in database
 */
export async function updateLastActivity(userId: string): Promise<void> {
  try {
    const { createClient } = await import('./client');
    const supabase = createClient();

    await supabase
      .from('profiles')
      .update({
        last_activity: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch (error) {
    console.error('Failed to update last_activity:', error);
  }
}

/**
 * Check if user should be logged out based on last_activity
 * Returns true if more than IDLE_TIMEOUT_MS has passed since last_activity
 */
export async function shouldLogoutUser(userId: string): Promise<boolean> {
  try {
    const { createClient } = await import('./client');
    const supabase = createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('last_activity')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    if (!data.last_activity) {
      return false;
    }

    const lastActivityTime = new Date(data.last_activity).getTime();
    const now = Date.now();
    const elapsed = now - lastActivityTime;

    return elapsed >= IDLE_TIMEOUT_MS;
  } catch (error) {
    console.error('Failed to check last_activity:', error);
    return false;
  }
}
