<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import EphemeralPage from "$lib/components/app/ephemeral-page.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Progress } from "$lib/components/ui/progress";
  import { LOCK_DURATION } from "$lib/constants";
  import { ROUTES } from "$lib/navigation";
  import Timer from "$lib/timer.svelte";
  import { onMount } from "svelte";

  import type { PageData } from "./$types";

  const { data }: { data: PageData } = $props();
  const timer = new Timer();

  let refreshInProgress = false;

  async function refreshReservation() {
    if (
      document.hidden ||
      refreshInProgress ||
      !data.success ||
      !data.reservation?.pending ||
      timer.isEnded
    ) {
      return;
    }

    refreshInProgress = true;
    try {
      await invalidateAll();
      if (data.reservation && !data.reservation.pending) timer.stop();
    } finally {
      refreshInProgress = false;
    }
  }

  onMount(() => {
    if (data.success && data.reservation) {
      const timeLeft = data.reservation.expiresAt.getTime() - Date.now();
      if (data.reservation.pending && timeLeft > 0) timer.start(timeLeft);
    }

    const interval = window.setInterval(refreshReservation, 5_000);
    const channel =
      "BroadcastChannel" in window ? new BroadcastChannel("reservation-status") : null;

    function refreshWhenVisible() {
      if (!document.hidden) void refreshReservation();
    }

    function handleReservationUpdate(event: MessageEvent) {
      if (
        event.data?.type === "reservation-confirmed" &&
        event.data.reservationID === data.reservation?.id
      ) {
        void refreshReservation();
      }
    }

    channel?.addEventListener("message", handleReservationUpdate);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);

    return () => {
      timer.stop();
      window.clearInterval(interval);
      channel?.removeEventListener("message", handleReservationUpdate);
      channel?.close();
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  });

  const isExpired = $derived(data.error === "expired" || timer.isEnded);
  const isConfirmed = $derived(
    Boolean(data.success && data.reservation && !data.reservation.pending),
  );
  const title = $derived(
    isConfirmed
      ? "Prenotazione confermata"
      : data.success && data.reservation && !isExpired
        ? "Prenotazione in attesa"
        : isExpired
          ? "Tempo scaduto"
          : "Prenotazione non disponibile",
  );
  const description = $derived(
    isConfirmed
      ? "La tua prenotazione è stata registrata correttamente."
      : data.success && data.reservation && !isExpired
        ? `Abbiamo inviato un link di conferma a ${data.reservation.email}. Controlla la tua casella di posta.`
        : isExpired
          ? "La prenotazione non è più riservata. Effettua una nuova prenotazione per scegliere un nuovo orario."
          : "La prenotazione non è disponibile. Effettua una nuova prenotazione.",
  );
</script>

<svelte:head>
  <title>Prenotazione in attesa</title>
  <meta name="description" content="Conferma via email richiesta per completare la prenotazione." />
</svelte:head>

<EphemeralPage {title} {description}>
  {#if data.success && data.reservation}
    {#if !isExpired && data.reservation.pending}
      <div class="space-y-2 text-center">
        <p class="text-muted-foreground typo-body-sm">Hai a disposizione</p>
        <p class="typo-heading">{timer.show()}</p>
        <Progress value={timer.timeLeft} max={LOCK_DURATION} />
      </div>
    {/if}
  {/if}

  {#snippet actions()}
    <Button href={ROUTES.home} variant="ghost" class="flex-1 sm:flex-none">Home</Button>
    <Button href={ROUTES.myReservations} variant="outline" class="flex-1 sm:flex-none">
      Le mie prenotazioni
    </Button>
    <Button href={ROUTES.book} class="flex-1 sm:flex-none">Prenota</Button>
  {/snippet}
</EphemeralPage>
