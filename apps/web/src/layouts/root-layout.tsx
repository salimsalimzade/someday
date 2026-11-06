import type { ParentProps } from "solid-js";
import { Loading } from "solid-js";
import { Spinner, Toaster } from "yosegi-solid";
import { paths } from "../router";
import styles from "./root-layout.module.css";

export function RootLayout(props: ParentProps) {
  return (
    <div class={styles["app-shell"]}>
      <header class={styles["app-header"]}>
        <a href={paths()} class={styles["app-brand"]}>
          bedrock
        </a>
        <nav class={styles["app-nav"]}>
          <a href={paths()}>Health</a>
          <a href={paths.greetings}>Greetings</a>
        </nav>
      </header>
      <main class={styles["app-main"]}>
        <Loading fallback={<Spinner label="Loading page" />}>{props.children}</Loading>
      </main>
      <Toaster />
    </div>
  );
}
