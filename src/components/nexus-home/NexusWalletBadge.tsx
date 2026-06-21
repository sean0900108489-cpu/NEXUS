import { WalletBalance } from '@/lib/nexus-home/types';

type NexusWalletBadgeProps = {
  wallet: WalletBalance;
};

export function NexusWalletBadge({ wallet }: NexusWalletBadgeProps) {
  const label = wallet.state === 'empty' ? 'Add credits' : `${wallet.credits.toLocaleString()} credits`;

  return (
    <a className="nexus-wallet-badge" href="/wallet" aria-label="Wallet credits">
      <span className="nexus-wallet-dot" data-state={wallet.state} />
      <span>{label}</span>
    </a>
  );
}
