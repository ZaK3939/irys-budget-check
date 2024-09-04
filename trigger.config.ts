import type { TriggerConfig, ResolveEnvironmentVariablesFunction } from '@trigger.dev/sdk/v3';

export const resolveEnvVars: ResolveEnvironmentVariablesFunction = async ({ projectRef, env, environment }) => {
  // Check if required environment variables are present
  if (!env.IRYS_PRIVATE_KEY || !env.DISCORD_WEBHOOK_URL) {
    console.error('Missing required environment variables');
    return undefined;
  }

  // Return the required environment variables
  return {
    variables: [
      { name: 'IRYS_PRIVATE_KEY', value: env.IRYS_PRIVATE_KEY },
      { name: 'DISCORD_WEBHOOK_URL', value: env.DISCORD_WEBHOOK_URL },
    ],
  };
};

export const config: TriggerConfig = {
  project: 'proj_ieqoxxkevchocihmvymj',
  logLevel: 'log',
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
};
