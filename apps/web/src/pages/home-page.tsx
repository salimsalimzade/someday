import { LoadError } from "@bedrock/ui";
import { formatDuration } from "@bedrock/utils";
import { affects, createMemo, Errored, isPending, Loading, refresh } from "solid-js";
import { Button, Spinner } from "yosegi-solid";
import { fetchHealth, getErrorMessage } from "../lib/api-client";
import styles from "./page.module.css";

export default function HomePage() {
  // Async lives in computations: the memo returns a promise and <Loading> waits on it.
  const health = createMemo(() => fetchHealth());

  const reload = () => {
    affects(health);
    refresh(health);
  };

  return (
    <section class={styles.page}>
      <h1 class={styles["page-title"]}>Server health</h1>
      <p class={styles["page-description"]}>
        Reads <code>GET /api/health</code> through the typed Hono client.
      </p>

      <Errored
        fallback={(error, reset) => (
          <LoadError
            title="Couldn't reach the server"
            description={getErrorMessage(error())}
            onRetry={reset}
          />
        )}
      >
        <Loading fallback={<Spinner label="Checking server health" />}>
          <dl class={styles["stat-list"]}>
            <dt class={styles["stat-label"]}>Status</dt>
            <dd>{health().status}</dd>
            <dt class={styles["stat-label"]}>Uptime</dt>
            <dd>{formatDuration(health().uptime)}</dd>
            <dt class={styles["stat-label"]}>Checked at</dt>
            <dd>{new Date(health().timestamp).toLocaleTimeString()}</dd>
          </dl>
          <Button
            label="Refresh"
            variant="outline"
            loading={isPending(() => health())}
            onClick={reload}
          />
        </Loading>
      </Errored>
    </section>
  );
}
