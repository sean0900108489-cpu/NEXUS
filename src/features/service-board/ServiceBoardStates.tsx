export function ServiceBoardLoadingState() {
  return (
    <div className="flex h-full items-center justify-center bg-neutral-950/50 p-6 text-sm text-white/55">
      Loading service requests...
    </div>
  );
}

export function ServiceBoardEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-neutral-950/40 p-6 text-center">
      <p className="text-sm font-medium text-white/80">
        No service requests match this view
      </p>
      <p className="max-w-sm text-xs text-white/45">
        Change the status filter to view available requests.
      </p>
    </div>
  );
}

export function ServiceBoardErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-neutral-950/40 p-6 text-center">
      <p className="text-sm font-medium text-rose-100">
        Unable to load service requests
      </p>
      <p className="max-w-sm text-xs text-white/45">{message}</p>
    </div>
  );
}
