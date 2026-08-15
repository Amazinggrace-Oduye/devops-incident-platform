import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import {
  AlertSeverity,
  AlertStatus,
  CheckResultStatus,
  HealthCheckType,
  IncidentSeverity,
  IncidentStatus,
  ServiceStatus,
  UserRole,
} from '../../common/enums';
import { User } from '../../users/entities/user.entity';
import { Team } from '../../teams/entities/team.entity';
import { Service } from '../../services/entities/service.entity';
import { HealthCheck } from '../../health-checks/entities/health-check.entity';
import { HealthCheckResult } from '../../health-checks/entities/health-check-result.entity';
import { Incident } from '../../incidents/entities/incident.entity';
import { IncidentUpdate } from '../../incidents/entities/incident-update.entity';
import { Alert } from '../../alerts/entities/alert.entity';

const SEED_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_PASSWORD = 'password123';

async function seed(): Promise<void> {
  await dataSource.initialize();

  const usersRepo = dataSource.getRepository(User);
  const teamsRepo = dataSource.getRepository(Team);
  const servicesRepo = dataSource.getRepository(Service);
  const healthChecksRepo = dataSource.getRepository(HealthCheck);
  const resultsRepo = dataSource.getRepository(HealthCheckResult);
  const incidentsRepo = dataSource.getRepository(Incident);
  const updatesRepo = dataSource.getRepository(IncidentUpdate);
  const alertsRepo = dataSource.getRepository(Alert);

  const existingAdmin = await usersRepo.findOne({
    where: { email: SEED_ADMIN_EMAIL },
  });

  if (existingAdmin) {
    console.log(
      `Seed skipped: user "${SEED_ADMIN_EMAIL}" already exists. Delete seed users or reset the DB to re-seed.`,
    );
    await dataSource.destroy();
    return;
  }

  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const admin = await usersRepo.save(
    usersRepo.create({
      email: SEED_ADMIN_EMAIL,
      name: 'Platform Admin',
      role: UserRole.ADMIN,
      passwordHash,
    }),
  );

  const engineer = await usersRepo.save(
    usersRepo.create({
      email: 'engineer@example.com',
      name: 'Sam Engineer',
      role: UserRole.ENGINEER,
      passwordHash,
    }),
  );

  const viewer = await usersRepo.save(
    usersRepo.create({
      email: 'viewer@example.com',
      name: 'Vera Viewer',
      role: UserRole.VIEWER,
      passwordHash,
    }),
  );

  const platformTeam = await teamsRepo.save(
    teamsRepo.create({
      name: 'Platform Engineering',
      slug: 'platform-engineering',
      description: 'Owns core infrastructure and shared services',
      members: [admin, engineer],
    }),
  );

  const paymentsTeam = await teamsRepo.save(
    teamsRepo.create({
      name: 'Payments',
      slug: 'payments',
      description: 'Checkout and payment processing',
      members: [engineer, viewer],
    }),
  );

  const apiGateway = await servicesRepo.save(
    servicesRepo.create({
      name: 'API Gateway',
      slug: 'api-gateway',
      description: 'Public edge gateway',
      status: ServiceStatus.OPERATIONAL,
      environment: 'production',
      teamId: platformTeam.id,
    }),
  );

  const paymentsApi = await servicesRepo.save(
    servicesRepo.create({
      name: 'Payments API',
      slug: 'payments-api',
      description: 'Charges, refunds, and settlement',
      status: ServiceStatus.DEGRADED,
      environment: 'production',
      teamId: paymentsTeam.id,
    }),
  );

  const postgresPrimary = await servicesRepo.save(
    servicesRepo.create({
      name: 'Postgres Primary',
      slug: 'postgres-primary',
      description: 'Primary transactional database',
      status: ServiceStatus.OPERATIONAL,
      environment: 'production',
      teamId: platformTeam.id,
    }),
  );

  const gatewayCheck = await healthChecksRepo.save(
    healthChecksRepo.create({
      serviceId: apiGateway.id,
      name: 'Gateway HTTP',
      type: HealthCheckType.HTTP,
      target: 'https://example.com',
      intervalSeconds: 60,
      timeoutMs: 3000,
      expectedStatusCode: 200,
      isEnabled: true,
    }),
  );

  const paymentsCheck = await healthChecksRepo.save(
    healthChecksRepo.create({
      serviceId: paymentsApi.id,
      name: 'Payments HTTP',
      type: HealthCheckType.HTTP,
      target: 'https://example.com/payments',
      intervalSeconds: 30,
      timeoutMs: 5000,
      expectedStatusCode: 200,
      isEnabled: true,
    }),
  );

  const dbCheck = await healthChecksRepo.save(
    healthChecksRepo.create({
      serviceId: postgresPrimary.id,
      name: 'Postgres TCP',
      type: HealthCheckType.TCP,
      target: 'localhost:5432',
      intervalSeconds: 60,
      timeoutMs: 2000,
      isEnabled: true,
    }),
  );

  await resultsRepo.save([
    resultsRepo.create({
      healthCheckId: gatewayCheck.id,
      status: CheckResultStatus.UP,
      latencyMs: 120,
      message: 'HTTP 200 (expected 200)',
    }),
    resultsRepo.create({
      healthCheckId: paymentsCheck.id,
      status: CheckResultStatus.DEGRADED,
      latencyMs: 980,
      message: 'HTTP 200 but elevated latency',
    }),
    resultsRepo.create({
      healthCheckId: dbCheck.id,
      status: CheckResultStatus.UP,
      latencyMs: 15,
      message: 'TCP localhost:5432 open',
    }),
  ]);

  const openIncident = await incidentsRepo.save(
    incidentsRepo.create({
      title: 'Elevated payment latency',
      description: 'p95 latency above SLO for checkout charges',
      severity: IncidentSeverity.HIGH,
      status: IncidentStatus.INVESTIGATING,
      serviceId: paymentsApi.id,
      assigneeId: engineer.id,
      startedAt: new Date(Date.now() - 45 * 60 * 1000),
      acknowledgedAt: new Date(Date.now() - 40 * 60 * 1000),
    }),
  );

  const resolvedIncident = await incidentsRepo.save(
    incidentsRepo.create({
      title: 'Brief gateway 502 spike',
      description: 'Transient upstream errors at the edge',
      severity: IncidentSeverity.MEDIUM,
      status: IncidentStatus.RESOLVED,
      serviceId: apiGateway.id,
      assigneeId: admin.id,
      startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      acknowledgedAt: new Date(Date.now() - 23.5 * 60 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
    }),
  );

  await updatesRepo.save([
    updatesRepo.create({
      incidentId: openIncident.id,
      authorId: engineer.id,
      status: IncidentStatus.OPEN,
      message: 'Incident opened from latency alert',
    }),
    updatesRepo.create({
      incidentId: openIncident.id,
      authorId: engineer.id,
      status: IncidentStatus.ACKNOWLEDGED,
      message: 'Acknowledged and paging payments on-call',
    }),
    updatesRepo.create({
      incidentId: openIncident.id,
      authorId: engineer.id,
      status: IncidentStatus.INVESTIGATING,
      message: 'Investigating slow queries on settlement path',
    }),
    updatesRepo.create({
      incidentId: resolvedIncident.id,
      authorId: admin.id,
      status: IncidentStatus.OPEN,
      message: 'Incident opened',
    }),
    updatesRepo.create({
      incidentId: resolvedIncident.id,
      authorId: admin.id,
      status: IncidentStatus.RESOLVED,
      message: 'Errors subsided; monitoring complete',
    }),
  ]);

  await alertsRepo.save([
    alertsRepo.create({
      title: 'Payments p95 latency high',
      message: 'p95 > 800ms for 10 minutes',
      severity: AlertSeverity.HIGH,
      status: AlertStatus.FIRING,
      source: 'prometheus',
      serviceId: paymentsApi.id,
      incidentId: openIncident.id,
      metadata: { slo: 'checkout_latency', thresholdMs: 800 },
      firedAt: new Date(Date.now() - 50 * 60 * 1000),
    }),
    alertsRepo.create({
      title: 'Gateway 5xx rate elevated',
      message: '5xx rate crossed 2%',
      severity: AlertSeverity.MEDIUM,
      status: AlertStatus.RESOLVED,
      source: 'prometheus',
      serviceId: apiGateway.id,
      incidentId: resolvedIncident.id,
      metadata: { window: '5m' },
      firedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
    }),
    alertsRepo.create({
      title: 'Disk usage warning',
      message: 'Postgres disk at 78%',
      severity: AlertSeverity.INFO,
      status: AlertStatus.ACKNOWLEDGED,
      source: 'node-exporter',
      serviceId: postgresPrimary.id,
      metadata: { mount: '/var/lib/postgresql' },
      firedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    }),
  ]);

  console.log('Seed complete.');
  console.log('');
  console.log('Login accounts (password for all: password123)');
  console.log(`  ADMIN    ${admin.email}`);
  console.log(`  ENGINEER ${engineer.email}`);
  console.log(`  VIEWER   ${viewer.email}`);
  console.log('');
  console.log('Sample resources:');
  console.log(`  Teams:     ${platformTeam.slug}, ${paymentsTeam.slug}`);
  console.log(
    `  Services:  ${apiGateway.slug}, ${paymentsApi.slug}, ${postgresPrimary.slug}`,
  );
  console.log(`  Incident:  ${openIncident.title} [${openIncident.status}]`);

  await dataSource.destroy();
}

seed().catch(async (error) => {
  console.error('Seed failed:', error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
