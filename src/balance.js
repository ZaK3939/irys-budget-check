import Irys from '@irys/sdk';
import dotenv from 'dotenv';

dotenv.config();

async function checkIrysBalance() {
  const irys = new Irys({
    network: 'mainnet',
    token: 'matic',
    key: process.env.IRYS_PRIVATE_KEY,
  });

  // Get current balance
  const balance = await irys.getLoadedBalance();
  const balanceInMatic = irys.utils.fromAtomic(balance).toNumber();

  console.log(`Current Irys balance: ${balanceInMatic} MATIC`);
}

checkIrysBalance();
