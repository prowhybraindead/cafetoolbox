export { createClient } from "./client";
export { createClient as createServerClient } from "./server";
export { updateSession } from "./middleware";
export {
  signup,
  login,
  logout,
  forgotPassword,
  updatePassword,
  getCurrentUser,
  getCurrentSession,
  onAuthStateChange,
} from "./auth";
export {
  startIdleTimer,
  stopIdleTimer,
  getElapsedTime,
  resetIdleTimer,
  isUserIdle,
  updateLastActivity,
  shouldLogoutUser,
  IDLE_TIMEOUT_MS,
  WARNING_TIMEOUT_MS,
} from "./idle-timeout";
export type {
  SignupResult,
  LoginResult,
  LogoutResult,
  ForgotPasswordResult,
  AuthErrorType,
} from "./auth";
export type { IdleTimerCallbacks } from "./idle-timeout";
