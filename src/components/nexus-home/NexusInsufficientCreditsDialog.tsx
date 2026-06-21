import { InsufficientCreditsPayload } from '@/lib/nexus-home/types';

type NexusInsufficientCreditsDialogProps = {
  payload: InsufficientCreditsPayload;
  onClose: () => void;
  onChooseCheaperModel: (modelId: string) => void;
};

export function NexusInsufficientCreditsDialog({
  payload,
  onClose,
  onChooseCheaperModel,
}: NexusInsufficientCreditsDialogProps) {
  const required = payload.requiredCredits ?? 0;
  const balance = payload.currentBalance ?? 0;

  return (
    <div className="nexus-dialog-backdrop" role="presentation">
      <section className="nexus-credit-dialog" role="dialog" aria-modal="true" aria-labelledby="nexus-credit-dialog-title">
        <button type="button" className="nexus-dialog-close" onClick={onClose} aria-label="Close">×</button>
        <p className="nexus-kicker">Wallet credits</p>
        <h2 id="nexus-credit-dialog-title">Not enough credits for this run.</h2>
        <p>
          This model needs about {required.toLocaleString()} credits, but your wallet has {balance.toLocaleString()}.
          Add credits or switch to a lower-cost model.
        </p>
        <div className="nexus-dialog-actions">
          <a href="/wallet/top-up" className="nexus-primary-action">Add credits</a>
          <a href="/wallet/usage" className="nexus-secondary-action">View usage</a>
        </div>
        {payload.cheaperAlternatives?.length ? (
          <div className="nexus-cheaper-models">
            <h3>Lower-cost models</h3>
            {payload.cheaperAlternatives.map((model) => (
              <button key={model.id} type="button" onClick={() => onChooseCheaperModel(model.id)}>
                {model.label} <span>{model.estimatedCredits}</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
