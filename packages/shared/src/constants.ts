/**
 * @cafetoolbox/shared - Constants for the CafeToolbox project
 */

// --- App Constants ---

export const APP_NAME = "CafeToolbox";
export const APP_DOMAIN = "cafetoolbox.app";
export const APP_URL = "https://cafetoolbox.app";

export const STATUS_PAGE_URL = "https://status.cafetoolbox.app";

// --- Cookie Config ---
export const AUTH_COOKIE_DOMAIN = ".cafetoolbox.app";

// --- Routes ---
export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  TOOLS: "/dashboard/tools",
  USERS: "/dashboard/users",
  SETTINGS: "/dashboard/settings",
  AUTH: {
    LOGIN: "/login",
    REGISTER: "/register",
    RESET_PASSWORD: "/forgot-password",
    CALLBACK: "/auth/callback",
  },
  LOGOUT: "/logout",
} as const;

// --- Tool Status Labels (Vietnamese) ---
export const TOOL_STATUS_LABELS_VI: Record<string, string> = {
  active: "Hoạt động",
  beta: "Beta",
  archived: "Lưu trữ",
  maintenance: "Bảo trì",
} as const;

// --- Service Status Labels (Vietnamese) ---
export const SERVICE_STATUS_LABELS_VI: Record<string, string> = {
  operational: "Hoạt động",
  degraded: "Giảm hiệu suất",
  partial_outage: "Sự cố cục bộ",
  major_outage: "Sự cố lớn",
} as const;

// --- Tool Size Labels (Vietnamese) ---
export const TOOL_SIZE_LABELS_VI: Record<string, string> = {
  small: "Nhỏ",
  medium: "Trung bình",
  large: "Lớn",
} as const;

// --- Service Status Labels ---
export const TOOL_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  beta: "Beta",
  archived: "Archived",
} as const;

// --- Service Status Labels ---
export const SERVICE_STATUS_LABELS: Record<string, string> = {
  operational: "All Systems Operational",
  degraded: "Degraded Performance",
  partial_outage: "Partial Outage",
  major_outage: "Major Outage",
} as const;

// --- Status Colors (matching DESIGN.md) ---
export const STATUS_COLORS = {
  active: {
    dot: "bg-neon",
    text: "text-neon",
  },
  beta: {
    dot: "bg-yellow-400",
    text: "text-yellow-600",
  },
  archived: {
    dot: "bg-charcoalMuted",
    text: "text-charcoalMuted",
  },
  operational: {
    dot: "bg-neon",
    text: "text-neon",
  },
  degraded: {
    dot: "bg-yellow-400",
    text: "text-yellow-600",
  },
  outage: {
    dot: "bg-red-400",
    text: "text-red-400",
  },
} as const;
