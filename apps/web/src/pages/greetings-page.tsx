import { greetingParamsSchema } from "@bedrock/schemas";
import type { Greeting } from "@bedrock/types";
import { createMemo, createSignal, Show } from "solid-js";
import * as v from "valibot";
import { Button, TextField, toast } from "yosegi-solid";
import { fetchGreeting, getErrorMessage } from "../lib/api-client";
import styles from "./page.module.css";

export default function GreetingsPage() {
  const [name, setName] = createSignal("");
  const [greeting, setGreeting] = createSignal<Greeting>();
  const [submitting, setSubmitting] = createSignal(false);

  // Same schema the server validates with, so the form rejects what the API would.
  const nameError = createMemo(() => {
    const result = v.safeParse(greetingParamsSchema, { name: name() });
    return result.success ? undefined : result.issues[0].message;
  });

  // Mutation-style call from an event handler: writes happen here, not in a computation.
  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (nameError()) return;
    setSubmitting(true);

    try {
      setGreeting(await fetchGreeting(name()));
    } catch (error) {
      toast.error("Couldn't send the greeting", { description: getErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section class={styles.page}>
      <h1 class={styles["page-title"]}>Greetings</h1>
      <p class={styles["page-description"]}>
        Sends <code>GET /api/greetings/:name</code> through the typed Hono client.
      </p>

      <form class={styles["page-form"]} onSubmit={submit}>
        <TextField
          class={styles["page-form-field"]}
          label="Your name"
          placeholder="Ada Lovelace"
          value={name()}
          onChange={setName}
          // No error before the first keystroke.
          errorMessage={name() ? nameError() : undefined}
        />
        <Button
          class={styles["page-form-action"]}
          type="submit"
          label="Say hello"
          loading={submitting()}
          disabled={!!nameError()}
        />
      </form>

      <Show when={greeting()}>
        {(current) => <p class={styles["greeting-message"]}>{current().message}</p>}
      </Show>
    </section>
  );
}
