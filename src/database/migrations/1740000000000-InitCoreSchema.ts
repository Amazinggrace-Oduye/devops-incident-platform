import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCoreSchema1740000000000 implements MigrationInterface {
  name = 'InitCoreSchema1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM ('ADMIN', 'ENGINEER', 'VIEWER')
    `);
    await queryRunner.query(`
      CREATE TYPE "services_status_enum" AS ENUM (
        'OPERATIONAL', 'DEGRADED', 'PARTIAL_OUTAGE', 'MAJOR_OUTAGE', 'MAINTENANCE', 'UNKNOWN'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "health_checks_type_enum" AS ENUM ('HTTP', 'TCP', 'CUSTOM')
    `);
    await queryRunner.query(`
      CREATE TYPE "health_check_results_status_enum" AS ENUM ('UP', 'DOWN', 'DEGRADED', 'UNKNOWN')
    `);
    await queryRunner.query(`
      CREATE TYPE "incidents_severity_enum" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')
    `);
    await queryRunner.query(`
      CREATE TYPE "incidents_status_enum" AS ENUM (
        'OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "incident_updates_status_enum" AS ENUM (
        'OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "alerts_severity_enum" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')
    `);
    await queryRunner.query(`
      CREATE TYPE "alerts_status_enum" AS ENUM ('FIRING', 'ACKNOWLEDGED', 'RESOLVED')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "name" character varying NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'ENGINEER',
        "password_hash" character varying,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "description" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_teams_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_teams" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "team_members" (
        "team_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_team_members" PRIMARY KEY ("team_id", "user_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "services" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "description" text,
        "status" "services_status_enum" NOT NULL DEFAULT 'UNKNOWN',
        "environment" character varying NOT NULL DEFAULT 'production',
        "team_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_services_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_services" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "health_checks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "service_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "type" "health_checks_type_enum" NOT NULL DEFAULT 'HTTP',
        "target" character varying NOT NULL,
        "interval_seconds" integer NOT NULL DEFAULT 60,
        "timeout_ms" integer NOT NULL DEFAULT 5000,
        "expected_status_code" integer,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_health_checks" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "health_check_results" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "health_check_id" uuid NOT NULL,
        "status" "health_check_results_status_enum" NOT NULL,
        "latency_ms" integer,
        "message" text,
        "checked_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_health_check_results" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "incidents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying NOT NULL,
        "description" text,
        "severity" "incidents_severity_enum" NOT NULL DEFAULT 'MEDIUM',
        "status" "incidents_status_enum" NOT NULL DEFAULT 'OPEN',
        "service_id" uuid NOT NULL,
        "assignee_id" uuid,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "acknowledged_at" TIMESTAMPTZ,
        "resolved_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_incidents" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "incident_updates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "incident_id" uuid NOT NULL,
        "author_id" uuid,
        "status" "incident_updates_status_enum",
        "message" text NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_incident_updates" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "alerts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying NOT NULL,
        "message" text,
        "severity" "alerts_severity_enum" NOT NULL DEFAULT 'MEDIUM',
        "status" "alerts_status_enum" NOT NULL DEFAULT 'FIRING',
        "source" character varying NOT NULL DEFAULT 'manual',
        "service_id" uuid,
        "incident_id" uuid,
        "fired_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "resolved_at" TIMESTAMPTZ,
        "metadata" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alerts" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "team_members"
      ADD CONSTRAINT "FK_team_members_team"
      FOREIGN KEY ("team_id") REFERENCES "teams"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "team_members"
      ADD CONSTRAINT "FK_team_members_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "services"
      ADD CONSTRAINT "FK_services_team"
      FOREIGN KEY ("team_id") REFERENCES "teams"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "health_checks"
      ADD CONSTRAINT "FK_health_checks_service"
      FOREIGN KEY ("service_id") REFERENCES "services"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "health_check_results"
      ADD CONSTRAINT "FK_health_check_results_health_check"
      FOREIGN KEY ("health_check_id") REFERENCES "health_checks"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "incidents"
      ADD CONSTRAINT "FK_incidents_service"
      FOREIGN KEY ("service_id") REFERENCES "services"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "incidents"
      ADD CONSTRAINT "FK_incidents_assignee"
      FOREIGN KEY ("assignee_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "incident_updates"
      ADD CONSTRAINT "FK_incident_updates_incident"
      FOREIGN KEY ("incident_id") REFERENCES "incidents"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "incident_updates"
      ADD CONSTRAINT "FK_incident_updates_author"
      FOREIGN KEY ("author_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "alerts"
      ADD CONSTRAINT "FK_alerts_service"
      FOREIGN KEY ("service_id") REFERENCES "services"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "alerts"
      ADD CONSTRAINT "FK_alerts_incident"
      FOREIGN KEY ("incident_id") REFERENCES "incidents"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`CREATE INDEX "IDX_services_team_id" ON "services" ("team_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_services_status" ON "services" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_health_checks_service_id" ON "health_checks" ("service_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_health_check_results_health_check_id" ON "health_check_results" ("health_check_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_incidents_service_id" ON "incidents" ("service_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_incidents_status" ON "incidents" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_incidents_assignee_id" ON "incidents" ("assignee_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_incident_updates_incident_id" ON "incident_updates" ("incident_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_alerts_service_id" ON "alerts" ("service_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_alerts_incident_id" ON "alerts" ("incident_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_alerts_status" ON "alerts" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_alerts_status"`);
    await queryRunner.query(`DROP INDEX "IDX_alerts_incident_id"`);
    await queryRunner.query(`DROP INDEX "IDX_alerts_service_id"`);
    await queryRunner.query(`DROP INDEX "IDX_incident_updates_incident_id"`);
    await queryRunner.query(`DROP INDEX "IDX_incidents_assignee_id"`);
    await queryRunner.query(`DROP INDEX "IDX_incidents_status"`);
    await queryRunner.query(`DROP INDEX "IDX_incidents_service_id"`);
    await queryRunner.query(`DROP INDEX "IDX_health_check_results_health_check_id"`);
    await queryRunner.query(`DROP INDEX "IDX_health_checks_service_id"`);
    await queryRunner.query(`DROP INDEX "IDX_services_status"`);
    await queryRunner.query(`DROP INDEX "IDX_services_team_id"`);

    await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT "FK_alerts_incident"`);
    await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT "FK_alerts_service"`);
    await queryRunner.query(`ALTER TABLE "incident_updates" DROP CONSTRAINT "FK_incident_updates_author"`);
    await queryRunner.query(`ALTER TABLE "incident_updates" DROP CONSTRAINT "FK_incident_updates_incident"`);
    await queryRunner.query(`ALTER TABLE "incidents" DROP CONSTRAINT "FK_incidents_assignee"`);
    await queryRunner.query(`ALTER TABLE "incidents" DROP CONSTRAINT "FK_incidents_service"`);
    await queryRunner.query(`ALTER TABLE "health_check_results" DROP CONSTRAINT "FK_health_check_results_health_check"`);
    await queryRunner.query(`ALTER TABLE "health_checks" DROP CONSTRAINT "FK_health_checks_service"`);
    await queryRunner.query(`ALTER TABLE "services" DROP CONSTRAINT "FK_services_team"`);
    await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_team_members_user"`);
    await queryRunner.query(`ALTER TABLE "team_members" DROP CONSTRAINT "FK_team_members_team"`);

    await queryRunner.query(`DROP TABLE "alerts"`);
    await queryRunner.query(`DROP TABLE "incident_updates"`);
    await queryRunner.query(`DROP TABLE "incidents"`);
    await queryRunner.query(`DROP TABLE "health_check_results"`);
    await queryRunner.query(`DROP TABLE "health_checks"`);
    await queryRunner.query(`DROP TABLE "services"`);
    await queryRunner.query(`DROP TABLE "team_members"`);
    await queryRunner.query(`DROP TABLE "teams"`);
    await queryRunner.query(`DROP TABLE "users"`);

    await queryRunner.query(`DROP TYPE "alerts_status_enum"`);
    await queryRunner.query(`DROP TYPE "alerts_severity_enum"`);
    await queryRunner.query(`DROP TYPE "incident_updates_status_enum"`);
    await queryRunner.query(`DROP TYPE "incidents_status_enum"`);
    await queryRunner.query(`DROP TYPE "incidents_severity_enum"`);
    await queryRunner.query(`DROP TYPE "health_check_results_status_enum"`);
    await queryRunner.query(`DROP TYPE "health_checks_type_enum"`);
    await queryRunner.query(`DROP TYPE "services_status_enum"`);
    await queryRunner.query(`DROP TYPE "users_role_enum"`);
  }
}
