import { Button, ErrorState } from "yosegi-solid";

interface LoadErrorProps {
  title: string;
  /** What went wrong, in words people can read. */
  description: string;
  onRetry: () => void;
}

/** The fallback for an <Errored> boundary around data a page loads. */
export function LoadError(props: LoadErrorProps) {
  return (
    <ErrorState
      title={props.title}
      description={props.description}
      actions={<Button label="Try again" onClick={() => props.onRetry()} />}
    />
  );
}
