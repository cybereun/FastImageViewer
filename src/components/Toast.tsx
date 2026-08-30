interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[120] -translate-x-1/2 rounded-lg border border-blue-700/70 bg-blue-950/95 px-4 py-2 text-sm text-blue-100 shadow-2xl" role="status" aria-live="polite">
      {message}
    </div>
  );
}
