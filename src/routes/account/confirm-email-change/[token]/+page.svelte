<script lang="ts">
  import { enhance } from "$app/forms";
  import EphemeralPage from "$lib/components/app/ephemeral-page.svelte";
  import { Button } from "$lib/components/ui/button";

  import type { ActionData, PageData } from "./$types";

  type EmailChangeResult = {
    status: "ready" | "confirmed" | "unauthorized" | "forbidden" | "expired" | "invalid" | "error";
    email?: string;
  };

  const { data, form }: { data: PageData; form: ActionData } = $props();
  const result = $derived((form ?? data) as EmailChangeResult);
  const success = $derived(result.status === "confirmed");
  const ready = $derived(result.status === "ready");
</script>

<svelte:head>
  <title>Conferma cambio email</title>
  <meta name="description" content="Conferma del nuovo indirizzo email del tuo account." />
</svelte:head>

{#snippet description()}
  {#if result.status === "confirmed"}
    <p>Il tuo nuovo indirizzo email è <strong class="text-foreground">{result.email}</strong>.</p>
  {:else if result.status === "ready"}
    <p>Conferma di voler aggiornare l'indirizzo email del tuo account.</p>
  {:else if result.status === "unauthorized"}
    <p>Accedi con l'account che ha richiesto il cambio email e riapri questo link.</p>
  {:else if result.status === "forbidden"}
    <p>Questo link appartiene a un altro account.</p>
  {:else if result.status === "expired"}
    <p>La richiesta è scaduta. Richiedi nuovamente il cambio dal tuo profilo.</p>
  {:else if result.status === "invalid"}
    <p>Il link non è valido o è già stato utilizzato.</p>
  {:else}
    <p>Si è verificato un problema. Riprova più tardi.</p>
  {/if}
{/snippet}

<EphemeralPage
  title={success
    ? "Email aggiornata"
    : ready
      ? "Conferma cambio email"
      : "Cambio email non riuscito"}
  {description}
>
  {#snippet actions()}
    {#if ready}
      <form method="POST" use:enhance>
        <Button type="submit">Conferma cambio email</Button>
      </form>
    {:else}
      <Button href={result.status === "unauthorized" ? "/login" : "/profile"}>
        {result.status === "unauthorized" ? "Accedi" : "Torna al profilo"}
      </Button>
    {/if}
  {/snippet}
</EphemeralPage>
