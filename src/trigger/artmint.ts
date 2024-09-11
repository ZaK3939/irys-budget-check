import { schedules } from '@trigger.dev/sdk/v3';
import { neon, neonConfig } from '@neondatabase/serverless';

neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.POSTGRES_CONNECTION_STRING!);

interface MintStats {
  total_mints: string;
  top_verifier: string;
  verifier_count: string;
  top_ref: string;
  ref_count: string;
  top_recipient: string;
  recipient_count: string;
  start_time: string;
  end_time: string;
}

const defaultStats: MintStats = {
  total_mints: '0',
  top_verifier: 'N/A',
  verifier_count: '0',
  top_ref: 'N/A',
  ref_count: '0',
  top_recipient: 'N/A',
  recipient_count: '0',
  start_time: '',
  end_time: '',
};

async function getRecentMintEvents(): Promise<MintStats> {
  const query = `
    WITH time_range AS (
      SELECT 
        (EXTRACT(EPOCH FROM NOW()) - 86400)::bigint AS start_time,
        EXTRACT(EPOCH FROM NOW())::bigint AS end_time
    )
    SELECT 
      COALESCE(SUM(quantity)::text, '0') as total_mints,
      COALESCE(verifier, 'N/A') as top_verifier,
      COUNT(*)::text as verifier_count,
      COALESCE(ref, 'N/A') as top_ref,
      COUNT(*)::text as ref_count,
      COALESCE(recipient, 'N/A') as top_recipient,
      COUNT(*)::text as recipient_count,
      TO_CHAR(TO_TIMESTAMP(start_time), 'YYYY-MM-DD HH24:MI:SS UTC') as start_time,
      TO_CHAR(TO_TIMESTAMP(end_time), 'YYYY-MM-DD HH24:MI:SS UTC') as end_time
    FROM art_mint_events, time_range
    WHERE block_timestamp >= start_time AND block_timestamp < end_time
    GROUP BY verifier, ref, recipient, start_time, end_time
    ORDER BY SUM(quantity) DESC, COUNT(*) DESC
    LIMIT 1
  `;

  try {
    const result = await sql(query);
    if (Array.isArray(result) && result.length > 0) {
      const stats = result[0] as Partial<MintStats>;
      return {
        total_mints: stats.total_mints ?? defaultStats.total_mints,
        top_verifier: stats.top_verifier ?? defaultStats.top_verifier,
        verifier_count: stats.verifier_count ?? defaultStats.verifier_count,
        top_ref: stats.top_ref ?? defaultStats.top_ref,
        ref_count: stats.ref_count ?? defaultStats.ref_count,
        top_recipient: stats.top_recipient ?? defaultStats.top_recipient,
        recipient_count: stats.recipient_count ?? defaultStats.recipient_count,
        start_time: stats.start_time ?? defaultStats.start_time,
        end_time: stats.end_time ?? defaultStats.end_time,
      };
    }
    return defaultStats;
  } catch (error) {
    console.error('Error fetching mint events:', error);
    throw error;
  }
}

export const hourlyMintStats = schedules.task({
  id: 'hourly-mint-stats',
  cron: {
    pattern: '0 * * * *',
    timezone: 'UTC',
  },
  run: async (ctx) => {
    const { timestamp, timezone } = ctx;
    console.log(`Running hourly mint stats at ${timestamp.toLocaleString('en-US', { timeZone: timezone })}`);

    try {
      const stats = await getRecentMintEvents();

      const message = `
📊 Mint Statistics:
Time Range: ${stats.start_time} to ${stats.end_time}
• Total Mints: ${stats.total_mints}
• Top Verifier: ${stats.top_verifier} (${stats.verifier_count} mints)
• Top Ref: ${stats.top_ref} (${stats.ref_count} mints)
• Top Recipient: ${stats.top_recipient} (${stats.recipient_count} mints)
      `.trim();

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
      throw error;
    }
  },
});
