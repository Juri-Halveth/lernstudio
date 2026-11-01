import { defineConfig } from 'hardhat/config';
import { randomBytes } from 'node:crypto';
import { Mnemonic } from 'ethers';

// The three funded accounts exist only in this in-process test network.
// No mnemonic is kept in source, environment, receipts or on disk.
const mnemonic = Mnemonic.fromEntropy(randomBytes(16)).phrase;

export default defineConfig({
  networks: {
    eveLocal: {
      type: 'edr-simulated',
      chainType: 'l1',
      chainId: 31337,
      hardfork: 'shanghai',
      // Return a failed transaction hash so ethers can inspect its status-0 receipt.
      throwOnTransactionFailures: false,
      accounts: {
        mnemonic,
        count: 3,
        accountsBalance: 1000n * 10n ** 18n,
      },
    },
  },
});
