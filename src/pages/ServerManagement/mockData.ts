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
        statusCommand: './instancectl status gateway',
        appDirectory: '/opt/kooya',
        actions: [
          {
            id: 'act-deploy-gateway',
            name: 'Deploy',
            description: 'Build and deploy the latest release artifact.',
            command: './instancectl deploy gateway',
          },
          {
            id: 'act-restart-gateway',
            name: 'Restart Service',
            description: 'Restart the gateway service on all nodes.',
            command: './instancectl restart gateway',
          },
          {
            id: 'act-reset-gateway-cache',
            name: 'Purge Cache',
            description: 'Flush cache across all edge nodes.',
            command: './instancectl purge-cache gateway',
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
        statusCommand: './instancectl status workers',
        appDirectory: '/opt/kooya',
        actions: [
          {
            id: 'act-scale-workers',
            name: 'Scale Up',
            description: 'Increase worker task count for peak load.',
            command: './instancectl scale workers --up',
          },
          {
            id: 'act-drain-workers',
            name: 'Drain Queue',
            description: 'Pause new jobs and drain active queues.',
            command: './instancectl drain workers',
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
        statusCommand: './instancectl status analytics',
        appDirectory: '/opt/analytics',
        actions: [
          {
            id: 'act-analytics-deploy',
            name: 'Deploy',
            description: 'Deploy the analytics API bundle.',
            command: './instancectl deploy analytics',
          },
          {
            id: 'act-analytics-migrate',
            name: 'Run Migrations',
            description: 'Apply database migrations.',
            command: './instancectl migrate analytics',
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
        statusCommand: './instancectl status etl',
        appDirectory: '/opt/analytics',
        actions: [
          {
            id: 'act-etl-run',
            name: 'Run Batch',
            description: 'Trigger an immediate batch run.',
            command: './instancectl run etl',
          },
          {
            id: 'act-etl-reset',
            name: 'Reset Pipeline',
            description: 'Reset state and restart the pipeline.',
            command: './instancectl reset etl',
            dangerous: true,
          },
        ],
      },
    ],
  },
]
