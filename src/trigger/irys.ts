import { schedules } from '@trigger.dev/sdk/v3';
import Irys from '@irys/sdk';

const metadata = {
  name: 'Why Phi',
  description: 'A place to shape onchain yourself',
  image: 'https://gateway.irys.xyz/H2OgtiAtsJRB8svr4d-kV2BtAE4BTI_q0wtAn5aKjcU',
  external_url: 'https://phiprotocol.xyz/',
};

export const dailyIrysBudgetCheck = schedules.task({
  id: 'daily-irys-budget-check-and-upload',
  cron: {
    pattern: '0 * * * *',
    timezone: 'Asia/Tokyo',
  },
  run: async (ctx) => {
    const { timestamp, timezone } = ctx;
    console.log(`Running Irys budget check at ${timestamp.toLocaleString('en-US', { timeZone: timezone })}`);

    try {
      const irys = new Irys({
        url: 'https://node1.irys.xyz',
        token: 'matic',
        key: process.env.IRYS_PRIVATE_KEY!,
        config: {
          providerUrl: process.env.ANKR_RPC!,
        },
      });

      // Get current balance
      const balance = await irys.getLoadedBalance();
      console.log(balance);
      const balanceInMatic = irys.utils.fromAtomic(balance).toNumber();
      console.log(`Current Irys balance: ${balanceInMatic} MATIC`);

      let message = `Current Irys balance: ${balanceInMatic} MATIC`;

      // Set threshold (e.g., 0.1 MATIC)
      const threshold = 1.1;
      if (balanceInMatic < threshold) {
        const fundAmount = 1; // Add 1 MATIC
        console.log(`Balance below threshold. Funding ${fundAmount} MATIC`);

        try {
          await irys.fund(irys.utils.toAtomic(fundAmount));
          message += `\nSuccessfully funded ${fundAmount} MATIC`;
        } catch (error) {
          message += `\nFunding failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error('Funding error', error);
        }
      } else {
        message += '\nBalance is sufficient. No funding needed.';
      }

      // Upload JSON metadata and check cost
      const tags = [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'application-id', value: 'Why Phi' },
      ];

      try {
        const data = JSON.stringify(metadata);
        const size = new TextEncoder().encode(data).length;
        const price = await irys.getPrice(size);
        const priceInMatic = irys.utils.fromAtomic(price);

        console.log(`Uploading ${size} bytes costs ${priceInMatic} MATIC`);
        message += `\nUploading JSON metadata (${size} bytes) costs ${priceInMatic} MATIC`;

        const startTime = Date.now();
        const receipt = await irys.upload(data, { tags: tags });
        const endTime = Date.now();
        const uploadTime = (endTime - startTime) / 1000; // Convert to seconds

        console.log(`Metadata uploaded ==> https://gateway.irys.xyz/${receipt.id}`);
        message += `\nJSON metadata uploaded: https://gateway.irys.xyz/${receipt.id}`;
        message += `\nUpload time: ${uploadTime.toFixed(2)} seconds`;
      } catch (error) {
        message += `\nError uploading JSON metadata: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('Error uploading metadata', error);
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
      console.error('Task failed', error instanceof Error ? error.message : 'Unknown error');
      throw error; // Re-throw the error to mark the task as failed
    }
  },
});
