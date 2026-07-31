<script lang="ts">
  import { enhance } from "$app/forms";
  import EphemeralPage from "$lib/components/app/ephemeral-page.svelte";
  import { Button } from "$lib/components/ui/button";

  import type { ActionData, PageData } from "./$types";

  type VerificationResult = {
    status: "ready" | "already-verified" | "invalid" | "error";
  };

  const { data, form }: { data: PageData; form: ActionData } = $props();
  const result = $derived((form ?? data) as VerificationResult);
  const success = $derived(result.status === "already-verified");
  const ready = $derived(result.status === "ready");
  const description = $derived(
    success
      ? "Grazie per aver verificato la tua email. Ora puoi gestire il profilo e le tue prenotazioni."
      : ready
        ? "Conferma di voler verificare il tuo indirizzo email."
        : result.status === "invalid"
          ? "Il link non è valido o l'account non esiste più."
          : "Si è verificato un problema durante la verifica. Riprova più tardi.",
  );
</script>

<svelte:head>
  <title>Verifica email</title>
  <meta name="description" content="Verifica dell'indirizzo email del tuo account." />
</svelte:head>

<EphemeralPage
  title={success
    ? "Email verificata"
    : ready
      ? "Verifica la tua email"
      : "Verifica email non riuscita"}
  {description}
>
  {#snippet actions()}
    {#if ready}
      <form method="POST" use:enhance>
        <Button type="submit">Verifica email</Button>
      </form>
    {/if}
  {/snippet}
</EphemeralPage>
