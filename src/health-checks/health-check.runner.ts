import { Injectable } from '@nestjs/common';
import * as net from 'net';
import {
  CheckResultStatus,
  HealthCheckType,
} from '../common/enums';
import { HealthCheck } from './entities/health-check.entity';

export type HealthCheckRunOutcome = {
  status: CheckResultStatus;
  latencyMs: number | null;
  message: string | null;
};

@Injectable()
export class HealthCheckRunner {
  async run(check: HealthCheck): Promise<HealthCheckRunOutcome> {
    switch (check.type) {
      case HealthCheckType.HTTP:
        return this.runHttp(check);
      case HealthCheckType.TCP:
        return this.runTcp(check);
      case HealthCheckType.CUSTOM:
      default:
        return {
          status: CheckResultStatus.UNKNOWN,
          latencyMs: null,
          message: 'CUSTOM checks must be reported manually',
        };
    }
  }

  private async runHttp(check: HealthCheck): Promise<HealthCheckRunOutcome> {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), check.timeoutMs);

    try {
      const response = await fetch(check.target, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
      });
      const latencyMs = Date.now() - started;
      const expected = check.expectedStatusCode ?? 200;
      const ok = response.status === expected;

      return {
        status: ok ? CheckResultStatus.UP : CheckResultStatus.DOWN,
        latencyMs,
        message: `HTTP ${response.status} (expected ${expected})`,
      };
    } catch (error) {
      const latencyMs = Date.now() - started;
      const message =
        error instanceof Error ? error.message : 'HTTP check failed';
      return {
        status: CheckResultStatus.DOWN,
        latencyMs,
        message,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private async runTcp(check: HealthCheck): Promise<HealthCheckRunOutcome> {
    const started = Date.now();
    const { host, port } = this.parseHostPort(check.target);

    return new Promise((resolve) => {
      const socket = new net.Socket();
      let settled = false;

      const finish = (
        status: CheckResultStatus,
        message: string | null,
      ): void => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve({
          status,
          latencyMs: Date.now() - started,
          message,
        });
      };

      socket.setTimeout(check.timeoutMs);
      socket.once('connect', () => finish(CheckResultStatus.UP, `TCP ${host}:${port} open`));
      socket.once('timeout', () => finish(CheckResultStatus.DOWN, 'TCP connection timed out'));
      socket.once('error', (error) =>
        finish(CheckResultStatus.DOWN, error.message),
      );
      socket.connect(port, host);
    });
  }

  private parseHostPort(target: string): { host: string; port: number } {
    if (target.includes('://')) {
      const url = new URL(target);
      return {
        host: url.hostname,
        port: url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80,
      };
    }

    const [host, portRaw] = target.split(':');
    const port = Number(portRaw);
    if (!host || !Number.isFinite(port)) {
      throw new Error('TCP target must be host:port');
    }
    return { host, port };
  }
}
