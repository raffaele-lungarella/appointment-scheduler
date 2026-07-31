<script lang="ts">
  import Logo from "$lib/components/app/logo.svelte";
  import { CircleAlert, CircleCheckBig, LoaderCircle } from "$lib/components/icons";
  import { Button } from "$lib/components/ui/button";
  import { onMount } from "svelte";

  import type { PageProps } from "./$types";

  const { data, form }: PageProps = $props();
  const result = $derived(form ?? data);
  const isConfirmed = $derived(result.status === "confirmed");
  const isReady = $derived(result.status === "ready");
  let confirmationForm = $state<HTMLFormElement>();

  onMount(() => {
    if (isReady) {
      confirmationForm?.requestSubmit();
      return;
    }

    if (!isConfirmed || !result.reservation) return;

    const channel =
      "BroadcastChannel" in window ? new BroadcastChannel("reservation-status") : null;
    channel?.postMessage({
      type: "reservation-confirmed",
      reservationID: result.reservation.id,
    });

    return () => channel?.close();
  });

  const description = $derived(
    isConfirmed
      ? "La prenotazione è stata registrata correttamente."
      : isReady
        ? "Conferma della prenotazione in corso…"
        : result.status === "expired"
          ? "La prenotazione è scaduta. Effettua una nuova prenotazione per scegliere un nuovo orario."
          : "Il link non è valido o è già stato utilizzato. Effettua una nuova prenotazione.",
  );
</script>

<svelte:head>
  <title>{isConfirmed ? "Prenotazione confermata" : "Conferma prenotazione"}</title>
  <meta name="description" content="Conferma della prenotazione effettuata." />
</svelte:head>

<section class="mx-auto flex min-h-[65vh] w-full max-w-xl items-center py-8 sm:py-12">
  <div
    class="border-border bg-card relative w-full overflow-hidden rounded-3xl border px-6 py-10 text-center shadow-xl shadow-foreground/5 sm:px-12 sm:py-14"
  >
    <div
      aria-hidden="true"
      class="bg-accent/10 absolute -top-24 -right-24 size-64 rounded-full blur-3xl"
    ></div>
    <div
      aria-hidden="true"
      class="bg-foreground/5 absolute -bottom-32 -left-24 size-72 rounded-full blur-3xl"
    ></div>

    <div class="relative flex flex-col items-center">
      <div class="origin-center scale-125 py-5 sm:scale-150 sm:py-8">
        <Logo />
      </div>

      {#if isReady}
        <div class="mt-8 flex flex-col items-center" aria-live="polite">
          <div class="bg-accent/10 relative grid size-20 place-items-center rounded-full">
            <span class="bg-accent/10 absolute inset-0 animate-ping rounded-full"></span>
            <LoaderCircle class="text-accent relative size-10 animate-spin" />
          </div>
          <h1 class="mt-7 typo-heading">Conferma in corso</h1>
          <p class="text-muted-foreground mt-3 max-w-sm typo-body">{description}</p>

          <form method="POST" bind:this={confirmationForm} class="mt-7">
            <Button type="submit" variant="outline">Conferma ora</Button>
          </form>
        </div>
      {:else if isConfirmed}
        <div class="mt-8 flex flex-col items-center" aria-live="polite">
          <div class="bg-success-muted grid size-20 place-items-center rounded-full">
            <CircleCheckBig class="text-success-foreground size-11" strokeWidth={1.75} />
          </div>
          <h1 class="mt-7 typo-heading">Prenotazione confermata</h1>
          <p class="text-muted-foreground mt-3 max-w-sm typo-body">{description}</p>

          <div
            class="mt-8 flex w-full max-w-sm flex-col-reverse gap-3 sm:flex-row sm:justify-center"
          >
            <Button href="/book" variant="outline" class="sm:flex-1">Prenota ancora</Button>
            <Button href="/" class="sm:flex-1">Torna al sito</Button>
          </div>
        </div>
      {:else}
        <div class="mt-8 flex flex-col items-center" aria-live="polite">
          <div class="bg-destructive/10 grid size-20 place-items-center rounded-full">
            <CircleAlert class="text-destructive size-10" strokeWidth={1.75} />
          </div>
          <h1 class="mt-7 typo-heading">
            {result.status === "expired" ? "Tempo scaduto" : "Conferma non riuscita"}
          </h1>
          <p class="text-muted-foreground mt-3 max-w-sm typo-body">{description}</p>
          <Button href="/book" class="mt-8">Prenota di nuovo</Button>
        </div>
      {/if}
    </div>
  </div>
</section>
