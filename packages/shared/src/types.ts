/**
 * @cafetoolbox/shared - Shared types for the CafeToolbox project
 */

// --- Auth Types ---

export type UserRole = "superadmin" | "user";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// --- Tool Types ---

export type ToolStatus = "active" | "beta" | "archived";
export type ToolSize = "small" | "medium" | "large";

export interface Tool {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: ToolStatus;
  size: ToolSize;
  path: string;
  icon: string;
  stack: string[];
  created_at: string;
  updated_at: string;
}

// --- Status Page Types ---

export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";
export type ServiceStatus = "operational" | "degraded" | "partial_outage" | "major_outage";

export interface Service {
  id: string;
  name: string;
  status: ServiceStatus;
  uptime: number;
}

export interface Incident {
  id: string;
  title: string;
  status: IncidentStatus;
  started_at: string;
  resolved_at: string | null;
  services_affected: string[];
  updates: IncidentUpdate[];
}

export interface IncidentUpdate {
  id: string;
  body: string;
  status: IncidentStatus;
  created_at: string;
}

// --- Dashboard Types ---

export interface DashboardStats {
  total_tools: number;
  active_tools: number;
  total_users: number;
  monthly_active_users: number;
}

// --- Navigation Types ---

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string;
  children?: NavItem[];
}
