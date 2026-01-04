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
        services: [
          {
            name: 'Gateway',
            serviceName: 'gateway',
            actions: [
              {
                id: 'act-deploy-gateway',
                name: 'Deploy',
                description: 'Build and deploy the latest release artifact.',
                command: './instancectl deploy gateway',
                risk: 'normal',
              },
              {
                id: 'act-restart-gateway',
                name: 'Restart Service',
                description: 'Restart the gateway service on all nodes.',
                command: './instancectl restart gateway',
                risk: 'normal',
              },
              {
                id: 'act-reset-gateway-cache',
                name: 'Purge Cache',
                description: 'Flush cache across all edge nodes.',
                command: './instancectl purge-cache gateway',
                risk: 'dangerous',
              },
            ],
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
        services: [
          {
            name: 'Workers',
            serviceName: 'workers',
            actions: [
              {
                id: 'act-scale-workers',
                name: 'Scale Up',
                description: 'Increase worker task count for peak load.',
                command: './instancectl scale workers --up',
                risk: 'normal',
              },
              {
                id: 'act-drain-workers',
                name: 'Drain Queue',
                description: 'Pause new jobs and drain active queues.',
                command: './instancectl drain workers',
                risk: 'dangerous',
              },
            ],
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
        services: [
          {
            name: 'Analytics API',
            serviceName: 'analytics',
            actions: [
              {
                id: 'act-analytics-deploy',
                name: 'Deploy',
                description: 'Deploy the analytics API bundle.',
                command: './instancectl deploy analytics',
                risk: 'normal',
              },
              {
                id: 'act-analytics-migrate',
                name: 'Run Migrations',
                description: 'Apply database migrations.',
                command: './instancectl migrate analytics',
                risk: 'dangerous',
              },
            ],
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
        services: [
          {
            name: 'ETL',
            serviceName: 'etl',
            actions: [
              {
                id: 'act-etl-run',
                name: 'Run Batch',
                description: 'Trigger an immediate batch run.',
                command: './instancectl run etl',
                risk: 'normal',
              },
              {
                id: 'act-etl-reset',
                name: 'Reset Pipeline',
                description: 'Reset state and restart the pipeline.',
                command: './instancectl reset etl',
                risk: 'dangerous',
              },
            ],
          },
        ],
      },
    ],
  },
]
