type Props = {
  message: string;
  retry: (() => void) | null;
  retryLabel?: string;
};

/** Something went wrong, said plainly, with a way to try again when there is one. */
export function Alert({ message, retry, retryLabel = "Try again" }: Props) {
  return (
    <div role="alert" className="mb-2.5 rounded-[12px] border-l-4 border-hand bg-kerb px-3.5 py-2.5 text-[0.9375rem]">
      <p>{message}</p>
      {retry && (
        <button type="button" onClick={retry} className="mt-1 font-semibold text-paint underline underline-offset-4">
          {retryLabel}
        </button>
      )}
    </div>
  );
}
