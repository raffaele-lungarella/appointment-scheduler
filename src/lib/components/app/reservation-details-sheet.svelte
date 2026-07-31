<script lang="ts">
  import ReservationStatusBadge from "$lib/components/app/reservationstatusbadge.svelte";
  import { ChevronLeft, ChevronRight, Mail, Trash } from "$lib/components/icons";
  import { Button } from "$lib/components/ui/button";
  import * as Sheet from "$lib/components/ui/sheet";
  import {
    createMinuteOfDay,
    formatMinuteOfDay,
    type MinuteOfDay,
  } from "$lib/domain/minute-of-day";
  import type { ReservationDTO } from "$lib/dto";
  import { formatCurrency, formatDuration } from "$lib/utils";
  import ChevronsRight from "@lucide/svelte/icons/chevrons-right";

  let {
    reservation = $bindable(null),
    reservations = [],
    open = $bindable(false),
    onDelete,
  }: {
    reservation?: ReservationDTO | null;
    reservations?: ReservationDTO[];
    open?: boolean;
    onDelete?: (reservation: ReservationDTO) => void;
  } = $props();

  const orderedReservations = $derived(
    [...reservations].sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      return byDate !== 0 ? byDate : a.startMinute - b.startMinute;
    }),
  );
  const currentIndex = $derived(
    reservation ? orderedReservations.findIndex((item) => item.id === reservation?.id) : -1,
  );
  const hasPrevious = $derived(currentIndex > 0);
  const hasNext = $derived(currentIndex >= 0 && currentIndex < orderedReservations.length - 1);
  const totalDuration = $derived(
    reservation?.offerings.reduce((total, offering) => total + offering.duration, 0) ?? 0,
  );
  const totalPrice = $derived(
    reservation?.offerings.reduce((total, offering) => total + offering.price, 0) ?? 0,
  );

  function navigate(offset: -1 | 1) {
    const nextReservation = orderedReservations[currentIndex + offset];
    if (nextReservation) reservation = nextReservation;
  }

  function endTime(startMinute: MinuteOfDay, duration: number) {
    return formatMinuteOfDay(createMinuteOfDay((startMinute + duration) % (24 * 60)));
  }

  function requestDelete() {
    if (reservation) onDelete?.(reservation);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!open || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }

    const offset =
      event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? -1
        : event.key === "ArrowRight" || event.key === "ArrowDown"
          ? 1
          : null;

    if (offset === null || (offset === -1 && !hasPrevious) || (offset === 1 && !hasNext)) return;

    event.preventDefault();
    navigate(offset);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<Sheet.Root bind:open>
  <Sheet.Content class="w-full sm:max-w-md" showCloseButton={false}>
    {#if reservation}
      <Sheet.Header class="border-b border-border">
        <div class="mb-3 flex items-center justify-between gap-4">
          <Sheet.Close>
            {#snippet child({ props })}
              <Button
                {...props}
                variant="ghost"
                size="icon-sm"
                aria-label="Chiudi dettagli prenotazione"
                title="Chiudi"
              >
                <ChevronsRight />
              </Button>
            {/snippet}
          </Sheet.Close>

          <div class="flex items-center gap-1" aria-label="Naviga tra le prenotazioni">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!hasPrevious}
              onclick={() => navigate(-1)}
              aria-label="Prenotazione precedente"
              title="Prenotazione precedente"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!hasNext}
              onclick={() => navigate(1)}
              aria-label="Prenotazione successiva"
              title="Prenotazione successiva"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
        <Sheet.Title class="truncate">{reservation.name}</Sheet.Title>
        <Sheet.Description
          >Prenotazione delle {formatMinuteOfDay(reservation.startMinute)}</Sheet.Description
        >
      </Sheet.Header>

      <Sheet.Body class="space-y-4 overflow-y-auto p-5">
        <dl
          class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-gray-2"
        >
          <div class="flex items-center justify-between gap-4 px-4 py-3">
            <dt class="text-muted-foreground typo-body-sm">Orario</dt>
            <dd class="text-right typo-label tabular-nums">
              {formatMinuteOfDay(reservation.startMinute)}–{endTime(
                reservation.startMinute,
                totalDuration,
              )}
            </dd>
          </div>
          <div class="flex items-center justify-between gap-4 px-4 py-3">
            <dt class="text-muted-foreground typo-body-sm">Durata</dt>
            <dd class="text-right typo-label">{formatDuration(totalDuration)}</dd>
          </div>
          <div class="flex items-center justify-between gap-4 px-4 py-3">
            <dt class="text-muted-foreground typo-body-sm">Personale</dt>
            <dd class="min-w-0 truncate text-right typo-label">{reservation.staff.name}</dd>
          </div>
          <div class="flex items-center justify-between gap-4 px-4 py-3">
            <dt class="text-muted-foreground typo-body-sm">Stato</dt>
            <dd><ReservationStatusBadge pending={reservation.pending} /></dd>
          </div>
        </dl>

        <section class="space-y-2" aria-labelledby="reservation-services-title">
          <div class="flex items-center justify-between px-1">
            <h3 id="reservation-services-title" class="text-muted-foreground typo-body-sm">
              Servizi
            </h3>
            <span class="rounded-full bg-gray-5 px-2 py-0.5 typo-caption">
              {reservation.offerings.length}
            </span>
          </div>
          <div
            class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-gray-2"
          >
            {#each reservation.offerings as offering (offering.id)}
              <div class="flex items-center justify-between gap-4 px-4 py-3">
                <div class="min-w-0">
                  <p class="truncate typo-label">{offering.name}</p>
                  <p class="typo-caption text-muted-foreground">
                    {formatDuration(offering.duration)}
                  </p>
                </div>
                <p class="shrink-0 typo-label">{formatCurrency(String(offering.price))}</p>
              </div>
            {/each}
            <div class="flex items-center justify-between gap-4 px-4 py-3">
              <span class="text-muted-foreground typo-body-sm">Totale</span>
              <span class="typo-label">{formatCurrency(String(totalPrice))}</span>
            </div>
          </div>
        </section>

        <section class="space-y-2" aria-labelledby="reservation-client-title">
          <h3 id="reservation-client-title" class="px-1 text-muted-foreground typo-body-sm">
            Cliente
          </h3>
          <dl
            class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-gray-2"
          >
            <div class="flex items-center justify-between gap-4 px-4 py-3">
              <dt class="text-muted-foreground typo-body-sm">Nome</dt>
              <dd class="min-w-0 truncate text-right typo-label">{reservation.name}</dd>
            </div>
            <div class="flex items-center justify-between gap-4 px-4 py-3">
              <dt class="text-muted-foreground typo-body-sm">Email</dt>
              <dd class="min-w-0 truncate text-right typo-label" title={reservation.email}>
                {reservation.email}
              </dd>
            </div>
          </dl>
        </section>

        <Button variant="outline" href={`mailto:${reservation.email}`} class="w-full">
          <Mail class="size-4" />
          Invia email
        </Button>
      </Sheet.Body>

      <Sheet.Footer class="border-t border-border">
        <Button variant="destructive" class="w-full" onclick={requestDelete}>
          <Trash class="size-4" />
          Elimina prenotazione
        </Button>
      </Sheet.Footer>
    {/if}
  </Sheet.Content>
</Sheet.Root>
