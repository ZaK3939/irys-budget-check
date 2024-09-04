import { schedules } from '@trigger.dev/sdk/v3';
import Irys from '@irys/sdk';

export const dailyIrysBudgetCheck = schedules.task({
  id: 'daily-irys-budget-check',
  cron: {
    // Run every hour at the start of the hour
    pattern: '0 * * * *',
    timezone: 'Asia/Tokyo',
  },
  run: async (ctx) => {
    const { timestamp, timezone } = ctx;

    console.log(`Running Irys budget check at ${timestamp.toLocaleString('en-US', { timeZone: timezone })}`);

    try {
      const irys = new Irys({
        network: 'mainnet',
        // url: 'https://node2.irys.xyz',
        token: 'matic',
        key: process.env.IRYS_PRIVATE_KEY!,
      });

      // Get current balance
      const balance = await irys.getLoadedBalance();
      const balanceInMatic = irys.utils.fromAtomic(balance).toNumber();

      console.log(`Current Irys balance: ${balanceInMatic} MATIC`);

      let message = `Current Irys balance: ${balanceInMatic} MATIC`;

      // Set threshold (e.g., 0.1 MATIC)
      const threshold = 0.1;
      if (balanceInMatic < threshold) {
        const fundAmount = 1; // Add 1 MATIC
        console.log(`Balance below threshold. Funding ${fundAmount} MATIC`);

        try {
          await irys.fund(irys.utils.toAtomic(fundAmount));
          message += `\nSuccessfully funded ${fundAmount} MATIC`;
        } catch (error) {
          if (error instanceof Error) {
            message += `\nFunding failed: ${error.message}`;
            console.error('Funding error', error.message);
          } else {
            message += `\nFunding failed: Unknown error`;
            console.error('Funding error', 'Unknown error');
          }
        }
      } else {
        message += '\nBalance is sufficient. No funding needed.';
      }

      // Send result to Discord
      const discordResponse = await fetch(process.env.DISCORD_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: message }),
      });

      if (!discordResponse.ok) {
        throw new Error(`Failed to send Discord notification: ${discordResponse.statusText}`);
      }

      console.log('Discord notification sent', { message });

      return { message };
    } catch (error) {
      if (error instanceof Error) {
        console.error('Task failed', error.message);
      } else {
        console.error('Task failed', 'Unknown error');
      }
      throw error; // Re-throw the error to mark the task as failed
    }
  },
});
