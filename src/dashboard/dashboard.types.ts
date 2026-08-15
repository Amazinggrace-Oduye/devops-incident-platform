import {
  AlertSeverity,
  AlertStatus,
  CheckResultStatus,
  IncidentSeverity,
  IncidentStatus,
  ServiceStatus,
} from '../common/enums';

export type CountMap<T extends string> = Record<T, number>;

export type DashboardOverview = {
  overallStatus: ServiceStatus;
  generatedAt: string;
  counts: {
    services: number;
    servicesByStatus: CountMap<ServiceStatus>;
    openIncidents: number;
    incidentsBySeverity: CountMap<IncidentSeverity>;
    firingAlerts: number;
    alertsBySeverity: CountMap<AlertSeverity>;
    teams: number;
    users: number;
  };
  recentIncidents: Array<{
    id: string;
    title: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    serviceId: string;
    startedAt: Date;
  }>;
  recentAlerts: Array<{
    id: string;
    title: string;
    severity: AlertSeverity;
    status: AlertStatus;
    serviceId: string | null;
    firedAt: Date;
  }>;
};

export type ServiceStatusCard = {
  id: string;
  name: string;
  slug: string;
  status: ServiceStatus;
  environment: string;
  openIncidents: number;
  firingAlerts: number;
  healthChecks: {
    total: number;
    enabled: number;
  };
  latestCheck: {
    status: CheckResultStatus;
    latencyMs: number | null;
    checkedAt: Date;
    healthCheckId: string;
  } | null;
};

export type ServiceStatusDetail = ServiceStatusCard & {
  description: string | null;
  openIncidentList: Array<{
    id: string;
    title: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    startedAt: Date;
  }>;
  firingAlertList: Array<{
    id: string;
    title: string;
    severity: AlertSeverity;
    firedAt: Date;
  }>;
  recentCheckResults: Array<{
    id: string;
    healthCheckId: string;
    status: CheckResultStatus;
    latencyMs: number | null;
    message: string | null;
    checkedAt: Date;
  }>;
};

export type PublicStatusPage = {
  overallStatus: ServiceStatus;
  generatedAt: string;
  services: Array<{
    name: string;
    slug: string;
    status: ServiceStatus;
    environment: string;
  }>;
};
