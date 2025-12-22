import type { Project } from './types'

export const initialProjects: Project[] = [
  {
    id: 'proj-kooya',
    name: 'Kooya Core',
    description: 'Primary production workloads and deployment tooling.',
    emoji: '🧭',
    servers: [
      {
        id: 'srv-kooya-api',
        name: 'API Gateway',
        summary: 'Handles edge routing and auth enforcement.',
        host: 'api.kooya.internal',
        port: '443',
        user: 'deploy',
        sshKey: 'kooya-prod.pem',
        statusPath: '/opt/ops/scripts/status-gateway.sh',
        ecsCluster: 'kooya-prod-cluster',
        ecsService: 'gateway-service',
        actions: [
          {
            id: 'act-deploy-gateway',
            name: 'Deploy',
            description: 'Build and deploy the latest release artifact.',
            path: '/opt/ops/scripts/deploy-gateway.sh',
          },
          {
            id: 'act-restart-gateway',
            name: 'Restart Service',
            description: 'Restart the gateway service on all nodes.',
            path: '/opt/ops/scripts/restart-gateway.sh',
          },
          {
            id: 'act-reset-gateway-cache',
            name: 'Purge Cache',
            description: 'Flush cache across all edge nodes.',
            path: '/opt/ops/scripts/purge-cache.sh',
            dangerous: true,
          },
        ],
      },
      {
        id: 'srv-kooya-workers',
        name: 'Worker Fleet',
        summary: 'Background jobs and async processing.',
        host: 'workers.kooya.internal',
        port: '22',
        user: 'ops',
        sshKey: 'kooya-workers.pem',
        statusPath: '/opt/ops/scripts/status-workers.sh',
        ecsCluster: 'kooya-prod-cluster',
        ecsService: 'worker-service',
        actions: [
          {
            id: 'act-scale-workers',
            name: 'Scale Up',
            description: 'Increase worker task count for peak load.',
            path: '/opt/ops/scripts/scale-workers.sh',
          },
          {
            id: 'act-drain-workers',
            name: 'Drain Queue',
            description: 'Pause new jobs and drain active queues.',
            path: '/opt/ops/scripts/drain-workers.sh',
            dangerous: true,
          },
        ],
      },
    ],
  },
  {
    id: 'proj-analytics',
    name: 'Insight Analytics',
    description: 'Reporting pipeline and data services.',
    emoji: '📊',
    servers: [
      {
        id: 'srv-analytics-api',
        name: 'Analytics API',
        summary: 'Serves dashboards and reporting endpoints.',
        host: 'analytics.kooya.internal',
        port: '443',
        user: 'deploy',
        sshKey: 'analytics-prod.pem',
        statusPath: '/opt/ops/scripts/status-analytics.sh',
        actions: [
          {
            id: 'act-analytics-deploy',
            name: 'Deploy',
            description: 'Deploy the analytics API bundle.',
            path: '/opt/ops/scripts/deploy-analytics.sh',
          },
          {
            id: 'act-analytics-migrate',
            name: 'Run Migrations',
            description: 'Apply database migrations.',
            path: '/opt/ops/scripts/migrate-analytics.sh',
            dangerous: true,
          },
        ],
      },
      {
        id: 'srv-analytics-etl',
        name: 'ETL Runner',
        summary: 'Nightly aggregation and batch processing.',
        host: 'etl.kooya.internal',
        user: 'etl',
        sshKey: 'etl-prod.pem',
        statusPath: '/opt/ops/scripts/status-etl.sh',
        actions: [
          {
            id: 'act-etl-run',
            name: 'Run Batch',
            description: 'Trigger an immediate batch run.',
            path: '/opt/ops/scripts/run-etl.sh',
          },
          {
            id: 'act-etl-reset',
            name: 'Reset Pipeline',
            description: 'Reset state and restart the pipeline.',
            path: '/opt/ops/scripts/reset-etl.sh',
            dangerous: true,
          },
        ],
      },
    ],
  },
]
