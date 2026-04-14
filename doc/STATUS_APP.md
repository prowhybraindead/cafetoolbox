# Product Surface: Public Status System (`apps/status`)

> **Public-facing health monitoring and incident communication platform** — no authentication required.

---

## System Role

The Public Status System serves as the single source of truth for external visibility into CafeToolbox platform reliability and operational status. It provides:

- **Transparency** to users and stakeholders regarding service availability
- **Centralized incident communication** with real-time updates
- **Operational metrics** derived from actual health check data
- **Trust signals** through consistent uptime reporting and incident handling

This system operates independently from the authenticated Dashboard application, ensuring status information remains accessible even during authentication infrastructure events.

---

## Overview

| Attribute | Value |
|---|---|
| Package name | `@cafetoolbox/status` |
| Version | `0.1.0` |
| Port (local) | `3001` |
| Framework | Next.js 16 (App Router, RSC) |
| Render strategy | Server-side rendering (SSR per request) |
| Authentication | Public access — no authentication required |
| Database access | Supabase (read-only, public schema) |
| Deployment target | Independent Vercel deployment |

---

## Versioning Context

### Relationship to Platform Version

This system follows the **CafeToolbox dual-layer versioning system**:

- **App Version** (this document): `0.1.0`
  - Tracks lifecycle of the Public Status System independently
  - Incremented when this specific app changes
  - May be lower than the platform root version (normal for newer apps)

- **Platform Root Version**: `0.4.9-beta` (as of this release)
  - Tracked in `CHANGELOG.md` and `AI.md`
  - Increments for ALL changes across the entire platform
  - App releases are logged with scoped format: `[0.4.9-beta] - (status 0.1.0)`

### Why App Version May Be Lower

The status app version (`0.1.0`) is intentionally lower than the platform version (`0.4.x-beta`) because:

1. **Newer app**: Status system was introduced after significant platform groundwork (auth, dashboard, infrastructure)
2. **Independent lifecycle**: App features evolve on their own timeline without blocking platform releases
3. **Semantic separation**: App version reflects status app maturity, platform version reflects overall system stability

### Version Increment Rules

- **Minor update** (bug fix, small improvement): `+0.0.1`
  - Example: UI tweak, performance optimization, documentation update
- **Major update** (significant feature): `+0.1`
  - Example: New monitoring features, architecture redesign, major UI overhaul

All changes are logged in the platform `CHANGELOG.md` with scoped format to maintain traceability.

---

## System Capabilities

### 1. System Health Summary
- Computed status aggregate across all services and active incidents
- Priority cascade: `major_outage` → `partial_outage` → `degraded` → `operational`
- Visual indicator mapping to severity-appropriate icons

### 2. Operational Metrics Dashboard
- **24-hour average uptime:** Calculated from actual heartbeat data via RPC `get_service_health_status`
- **Active services count:** Ratio of healthy services (`is_healthy = true`) to total registered services
- **Active incidents:** Count of incidents without `resolved` status

### 3. Per-Service Health Monitoring
- Real-time health status retrieved via RPC `get_service_health_status` for each service
- Graceful degradation to `services.uptime` and `services.status` on RPC failure
- Service cards display: name, 24h uptime percentage, response time (ms), last check timestamp, status badge
- **Uptime history charts** with switchable 1d / 7d / 30d time ranges (client-side)
- Daily uptime data sourced from `service_uptime_daily` via `/api/uptime-history` route

### 4. Incident Communication
- Retrieves most recent **6 incidents**, ordered by `started_at` descending
- Each incident displays: title, start/resolution timestamps, current status, affected services list
- Update timeline: fetches up to **18 incident_updates**, renders 3 most recent per incident
- Supports incident lifecycle visibility through status progression

### 5. Temporal Context (Timezone Clocks)
- Client-side component `TimezoneClocks` with real-time 1-second updates
- Displays 3 timezones: Vercel Server (US Eastern), UTC, Vietnam (ICT, UTC+7)
- SSR-safe hydration pattern: static skeleton during server render, live clock after client mount
- All system timestamps displayed in UTC for consistency

### 6. Navigation System
- Brand identity via `BrandMark` component from `@cafetoolbox/ui`
- GitHub repository integration for transparency
- Footer displays: page render timestamp and most recent data change timestamp across all data sources

---

## Architecture Overview

### Rendering Strategy

The system employs **server-side rendering (SSR)** on every request to ensure:
- Fresh data on every page load
- No client-side hydration delays for critical metrics
- Consistent presentation regardless of client capabilities
- SEO-optimized rendering for search engine indexing

### SSR Flow

```
HTTP Request
    ↓
Next.js App Router
    ↓
StatusPage Component (RSC, async)
    ↓
Supabase Server Client Initialization
    ↓
Parallel Data Fetching (Promise.all)
    ├─ services table query
    ├─ incidents table query (limit 6)
    └─ incident_updates table query (limit 18)
    ↓
Parallel RPC Execution (Promise.all)
    └─ get_service_health_status(service_uuid) per service
        ├─ Success: { is_healthy, last_checked_at, last_response_time_ms, uptime_24h, consecutive_failures }
        └─ Failure: Fallback to services.uptime + services.status
    ↓
Data Aggregation & State Calculation
    ├─ Overall system status
    ├─ Average uptime (24h)
    ├─ Active service count
    └─ Active incident count
    ↓
Server-Side React Render
    ↓
HTML Response
```

### Data Sources & Access Patterns

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP REQUEST                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE SERVER CLIENT CREATION                 │
│  (createServerClient from @cafetoolbox/supabase)            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              PARALLEL QUERIES (Promise.all)                  │
├─────────────────────────────────────────────────────────────┤
│ 1. services → {id, name, status, uptime, updated_at}        │
│ 2. incidents → {id, title, status, started_at,              │
│                 resolved_at, services_affected, updated_at}  │
│                 (LIMIT 6, ORDER BY started_at DESC)          │
│ 3. incident_updates → {id, incident_id, body, status,       │
│                       created_at}                            │
│                       (LIMIT 18, ORDER BY created_at DESC)   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              PARALLEL RPC CALLS (Promise.all)                │
├─────────────────────────────────────────────────────────────┤
│ For each service:                                            │
│   RPC get_service_health_status(service_uuid)                │
│                                                               │
│   SUCCESS PATH:                                              │
│   → {                                                       │
│       is_healthy,                                           │
│       last_checked_at,                                      │
│       last_response_time_ms,                                │
│       uptime_24h,                                           │
│       consecutive_failures                                  │
│     }                                                       │
│                                                               │
│   FAILURE PATH (graceful degradation):                       │
│   → Use services.uptime + services.status                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              DATA AGGREGATION & COMPUTATION                  │
├─────────────────────────────────────────────────────────────┤
│ • Overall system status calculation (priority cascade)       │
│ • 24h average uptime from RPC data                          │
│ • Active services count (is_healthy = true)                   │
│ • Active incidents count (status ≠ resolved)                 │
│ • Most recent timestamp across all data sources              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              SERVER-SIDE RENDERING                           │
│  (React Server Components, async data streaming)            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     HTML RESPONSE                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Reliability Strategy

### Fault Tolerance

The system implements multiple layers of fault tolerance:

| Failure Scenario | Response Strategy | User Impact |
|---|---|---|
| RPC `get_service_health_status` fails | Graceful degradation to cached `services.uptime` + `services.status` | Still displays uptime data, potentially less fresh |
| Supabase query timeout | Next.js error boundary catches, generic error message | No status data, clear error indication |
| Single service health check failure | Continues with other services, marked as degraded | Partial data, system remains readable |
| Incident update query failure | Shows incidents without update timeline | Core incident information preserved |

### Query Limiting

To prevent performance degradation:
- Incidents: Limited to 6 most recent records
- Incident updates: Limited to 18 total records (3 per incident displayed)
- Services: No hard limit, but practical count expected < 50
- RPC calls: Parallel execution with timeout protection

### Data Consistency

- All timestamps displayed in UTC to avoid timezone confusion
- "Last updated" timestamp computed across all data sources
- Status derived from authoritative source (RPC > cached table)
- Atomic queries prevent partial data renders

---

## Scalability Considerations

### Current Architecture Strengths

1. **SSR per request**: Ensures data freshness but may limit throughput under high load
2. **Parallel data fetching**: Minimizes total query time
3. **Graceful degradation**: System remains functional even with partial failures
4. **No authentication overhead**: Eliminates auth service dependency

### Scaling Bottlenecks

| Component | Bottleneck | Potential Impact |
|---|---|---|
| Supabase query on each request | Database connection pool exhaustion | Increased latency, errors under load |
| RPC calls per service | CPU/computation load with many services | Slower response times |
| Client-side timezone clock | JavaScript execution on every page load | Minimal impact (already optimized) |

### Evolution Path (Roadmap Milestones)

#### Short-term (0-3 months)
- ~~Add historical uptime charts with 1d/7d/30d ranges~~ ✅ Done — `UptimeChart` component + `/api/uptime-history` route
- Implement **Next.js revalidate** with 60s interval for ISR
- Add query result caching at the CDN layer
- Implement request deduplication for concurrent requests

#### Mid-term (3-6 months)
- Migrate to **incremental static regeneration** with background revalidation
- Add client-side **polling** for real-time updates (opt-in)
- Implement **Edge Functions** for geographic distribution

#### Long-term (6-12 months)
- Evaluate **Gemini** or similar for pub/sub architecture
- Implement **push notifications** via WebSockets or Service Workers
- ~~Add **historical uptime charts** with pre-aggregated time series data~~ ✅ Done — `UptimeChart` + `/api/uptime-history`
- Consider **database read replicas** for scaling query capacity

---

## Observability Context

### Relationship with Monitoring System

The Public Status System is a **consumer** of the monitoring infrastructure, not a source of truth:

```
┌─────────────────────────────────────────────┐
│     Health Check Workers (Background)       │
│  - Periodic service pings                    │
│  - Response time measurement                │
│  - Heartbeat writing to service_heartbeats  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│       Supabase service_heartbeats Table     │
│  - Time-series health data                  │
│  - Service UUID, timestamp, status,         │
│    response_time_ms, error_message          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│       RPC: get_service_health_status        │
│  - Aggregates heartbeats for 24h window     │
│  - Calculates uptime, detects consec fails  │
│  - Returns ServiceHealthRow                 │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│       Public Status System (This App)       │
│  - Consumes RPC results                     │
│  - Renders health visualization             │
│  - Provides public visibility               │
└─────────────────────────────────────────────┘
```

### Uptime Calculation Methodology

1. **Data Source**: RPC queries `service_heartbeats` for the last 24 hours
2. **Healthy Definition**: A heartbeat is considered healthy if:
   - HTTP status code is 2xx or 3xx
   - Response time ≤ configured threshold
   - No error condition raised
3. **Uptime Percentage**: `(healthy_heartbeats / total_heartbeats) × 100`
4. **Consecutive Failures**: Tracks sequential unhealthy heartbeats for outage detection

### Incident Lifecycle Integration

Incidents are **manually managed** through the Dashboard's admin interface:
- Creation: Operator declares incident with severity level
- Updates: Timeline entries added as investigation progresses
- Resolution: Marked as resolved when service recovery confirmed
- Services affected: Manually linked during incident creation

The status page reflects these changes in **real-time** (on next page load).

---

## Database Schema & Access Patterns

### Supabase Tables (Public Read Access)

| Table | Purpose | Access Pattern | Notes |
|---|---|---|
| `services` | Service registry + current health state | SELECT via RLS, no auth | Core metadata source, fallback health data |
| `incidents` | Incident history and lifecycle | SELECT via RLS, limit 6 | Manually managed through admin |
| `incident_updates` | Incident update timeline | SELECT via RLS, limit 18 | Chronological progression data |
| `service_heartbeats` | Time-series health check raw data | **Read via RPC only** | Never queried directly by this app |
| `service_uptime_daily` | Pre-aggregated daily uptime rollups | SELECT via API route `/api/uptime-history` | Requires migration 0014 + daily aggregation job |

### API Routes

**`GET /api/uptime-history?serviceId=<uuid>&days=<1-90>`**

Returns daily uptime history for chart rendering. Reads from `service_uptime_daily` table.

```typescript
type UptimeDataPoint = {
  date: string;        // "YYYY-MM-DD" (UTC)
  uptime: number | null;  // Percentage (0-100), null = no data for that day
};

// Response: UptimeDataPoint[]
```

- Fills gaps in date range with `null` uptime values
- Used by the `UptimeChart` client component
- Gracefully returns empty array if table doesn't exist (migration not run)

### RPC Functions

**`get_service_health_status(service_uuid uuid)` → `ServiceHealthRow`**

Calculates health metrics by aggregating heartbeats from the last 24 hours:

```typescript
interface ServiceHealthRow {
  service_uuid: string;
  is_healthy: boolean;
  last_checked_at: string;
  last_response_time_ms: number;
  uptime_24h: number;           // Percentage (0-100)
  consecutive_failures: number;
  total_heartbeats: number;
  healthy_heartbeats: number;
}
```

**Fallback behavior**: If RPC fails, the system uses:
- `services.uptime` (cached percentage)
- `services.status` (last known state)

---

## Status Enumeration

### Service Health States

| Value | Label | Color | Severity |
|---|---|---|---|
| `operational` | Operational | Green | 0 (none) |
| `degraded` | Degraded Performance | Yellow | 1 (low) |
| `partial_outage` | Partial Outage | Orange | 2 (medium) |
| `major_outage` | Major Outage | Red | 3 (critical) |

### Incident Status States

| Value | Label | Color | User Message |
|---|---|---|---|
| `investigating` | Investigating | Orange | We're currently investigating this issue |
| `identified` | Identified | Yellow | The root cause has been identified |
| `major_outage` | Major Outage | Red | Critical outage is in progress |
| `monitoring` | Monitoring | Blue | We're monitoring for continued stability |
| `resolved` | Resolved | Green | The incident has been resolved |

### System Status Calculation Logic

```typescript
function calculateOverallStatus(
  serviceStatuses: ServiceStatus[],
  activeIncidents: Incident[]
): SystemStatus {
  // 1. Check for major severity first
  for (const status of serviceStatuses) {
    if (status === 'major_outage') return 'major_outage';
  }
  for (const incident of activeIncidents) {
    if (incident.severity === 'critical') return 'major_outage';
  }

  // 2. Check for partial outages
  if (serviceStatuses.some(s => s === 'partial_outage')) {
    return 'partial_outage';
  }

  // 3. Check for degraded states
  if (serviceStatuses.some(s => s === 'degraded')) {
    return 'degraded';
  }

  // 4. Default to operational
  return 'operational';
}
```

---

## Project Structure

```
apps/status/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout: typography, metadata, BrandMark
│   │   ├── page.tsx            # StatusPage RSC: core data fetching + rendering
│   │   ├── globals.css         # Global styles from @cafetoolbox/ui
│   │   └── icon.svg            # Favicon for the application
│   └── components/
│       └── timezone-clocks.tsx # Client component: real-time 3-zone clocks
├── next.config.mjs             # Next.js configuration
├── package.json                # Dependencies and scripts
└── tsconfig.json               # TypeScript compiler options
```

**Archural Notes:**
- `page.tsx` is a **React Server Component (RSC)** that handles all data fetching
- Only `timezone-clocks.tsx` is a **client component** (minimal hydration)
- No state management library needed — all state derived from server data
- CSS imported from shared `@cafetoolbox/ui` package for consistency

---

## Technical Dependencies

| Package | Version | Purpose |
|---|---|---|
| `next` | ^16.2.3 | Framework: App Router, RSC, SSR |
| `react` | ^19.1.0 | UI library: components and rendering |
| `@cafetoolbox/supabase` | workspace | Supabase server client factory |
| `@cafetoolbox/ui` | workspace | Shared components (BrandMark) and global CSS |
| `lucide-react` | ^0.488.0 | Icon library for status indicators |
| `tailwindcss` | ^4.1.0 | Utility-first CSS framework |

**Dependency Management:**
- Uses **pnpm workspaces** for internal package linking
- No authentication libraries required (public-only access)
- Minimal external dependencies for reduced attack surface

---

## Configuration

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon key (public read access)
NEXT_PUBLIC_STATUS_URL=          # Canonical URL of this status page
```

**Security Notes:**
- All variables are public (`NEXT_PUBLIC_`) — no secrets required
- Anon key has Row Level Security (RLS) policies for read-only access
- No database write permissions granted

### Next.js Configuration

```javascript
// next.config.mjs
export default {
  reactStrictMode: false,      // Disabled to prevent double hydration in dev
  // Standard Next.js defaults for production
}
```

---

## Build & Deployment

### Development

```bash
pnpm dev          # Start Next.js dev server on port 3001
pnpm type-check   # TypeScript validation: tsc --noEmit
pnpm lint         # ESLint: next lint
pnpm format       # Prettier: prettier --write .
```

### Production

```bash
pnpm build        # Create optimized production build
pnpm start        # Start production server on port 3001
pnpm clean        # Remove build artifacts: .next/ + node_modules/
```

### Deployment Configuration

| Setting | Value |
|---|---|
| Platform | Vercel (or comparable serverless platform) |
| Root directory | `apps/status` |
| Build command | `pnpm build` (inferred from package.json) |
| Output directory | `.next/` (default) |
| Deploy branch | `main` |
| Environment variables | Configured in platform dashboard |

**Deployment Architecture:**
- Serverless functions for SSR rendering
- Automatic CDN edge caching for static assets
- Zero-configuration deployment — no custom build steps required

---

## Current Limitations & Roadmap

### Known Limitations

| Category | Limitation | Impact |
|---|---|---|
| Data freshness | No client-side auto-refresh | Users must manually reload for updates |
| Historical data | Uptime charts require migration 0014 + daily aggregation | Charts show "No data" until migrations run and aggregate job executes |
| Incident depth | Only 3 updates displayed per incident | Limited visibility into incident resolution details |
| Notifications | No subscription or alert mechanism | Users must check page proactively |
| Error visibility | RPC failures silent to end users | May display stale data without indication |
| Internationalization | English-only interface | Limited accessibility for non-English users |
| Accessibility | No ARIA labels or screen reader optimization | Excludes users with disabilities |

### Roadmap

#### Short-term Improvements (0-3 months)

**Priority P0 (Critical)**
- [ ] Implement **Next.js revalidate** with 60-second interval for ISR
- [ ] Add **error boundaries** with user-friendly error messaging
- [ ] Implement **RPC failure detection** and visual fallback indicators

**Priority P1 (High)**
- [ ] Add **"Show more"** expansion for incident update timeline
- [ ] Implement **uptime history chart** (7-day and 30-day views)
- [ ] Add **RSS feed** for incident updates

**Priority P2 (Medium)**
- [ ] Implement **client-side polling** (configurable interval)
- [ ] Add **service grouping** by category/region
- [ ] Implement **search/filter** for historical incidents

#### Mid-term Enhancements (3-6 months)

**Communication Features**
- [ ] **Email notification system** for incident subscriptions
- [ ] **Webhook integration** for third-party alerting (PagerDuty, Slack)
- [ ] **Scheduled maintenance announcements** with pre/post windows

**Data & Analytics**
- [ ] **Historical uptime archives** with aggregated time-series data
- [ ] **Service dependency graph** visualization
- [ ] **Performance regression detection** and alerting
- [ ] **SLA/SLD tracking** with compliance reporting

**Infrastructure**
- [ ] **Edge Function deployment** for geographic distribution
- [ ] **Database read replicas** for scaling query capacity
- [ ] **CDN cache invalidation** on incident updates

#### Long-term Evolution (6-12 months)

**Advanced Features**
- [ ] **Real-time updates** via WebSocket or Server-Sent Events
- [ ] **Public API** for status data consumption (webhooks, programmatic access)
- [ ] **Multi-region status pages** with localized content
- [ ] **Custom status page branding** for white-label customers

**Observability Integration**
- [ ] **Correlation with APM tools** (Datadog, New Relic)
- [ ] **Synthetic monitoring integration** (Pingdom, UptimeRobot)
- [ ] **Anomaly detection** powered by ML models
- [ ] **Predictive failure forecasting**

**Platform Maturity**
- [ ] **Compliance certifications** (SOC 2, ISO 27001) readiness
- [ ] **Disaster recovery** testing and documentation
- [ ] **Multi-tenant support** for multiple product status pages
- [ ] **Admin dashboard** for non-technical incident management

---

## Operational Guidelines

### Incident Management Workflow

1. **Detection**: Health workers detect service degradation
2. **Declaration**: Operator creates incident in Dashboard admin
3. **Communication**: Status page automatically reflects new incident
4. **Updates**: Operators add timeline updates as investigation progresses
5. **Resolution**: Incident marked as resolved when service recovers
6. **Post-Mortem**: Optional root cause analysis documentation

### Monitoring the Status Page

Even the status page should be monitored:

- **Uptime monitoring** via external service (Pingdom, Better Uptime)
- **Page load performance** tracking (Lighthouse, Web Vitals)
- **Error rate monitoring** (Vercel Analytics, custom logging)
- **Database query performance** (Supabase dashboard)

### Disaster Recovery

**Status page availability** is critical during platform incidents:
- Deployed as **independent application** — unaffected by Dashboard auth issues
- Cached **build artifacts** for instant rollback
- **Multi-region deployment** for geographic redundancy
- **Error page** displays last known state if database unreachable

---

## Appendix

### Related Documentation

- [Dashboard Architecture](~/doc/DASHBOARD_ARCHITECTURE.md) - Core platform documentation
- [Supabase Integration](~/packages/supabase/README.md) - Database client usage
- [Health Check Workers](~/apps/monitoring/worker.mjs) - Background monitoring logic

### Support & Troubleshooting

For issues related to:
- **Deployment**: Check Vercel deployment logs and build output
- **Data queries**: Verify Supabase RLS policies and RPC function permissions
- **Performance**: Monitor query times in Supabase dashboard, consider adding indexes
- **Rendering issues**: Review browser console for hydration errors, check Next.js logs

### Version History

| Version | Date | Changes |
|---|---|---|
| 0.1.0 | 2025-01-XX | Initial public status system release |
