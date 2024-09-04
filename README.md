# Irys Budget Check

This project implements an automated Irys budget checking and funding system using Trigger.dev. It periodically checks the Irys balance and funds it if necessary, then sends a notification to Discord.

## Features

- Hourly Irys balance checks
- Automatic funding when balance is below threshold
- Discord notifications for balance updates and funding actions
- Scheduled tasks using Trigger.dev

## Usage

To run the project in development mode:

```
npx trigger.dev@3.0.0-beta.56 dev
```

To deploy

```
npx trigger.dev@beta deploy --skip-typecheck
```

This command starts the Trigger.dev development server and runs your scheduled task.

# References

- [Trigger.dev Scheduled Tasks Documentation](https://trigger.dev/docs/tasks-scheduled)
- [Irys Documentation](https://arweave-tools.irys.xyz/overview/about)
