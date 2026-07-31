<script lang="ts">
  import { formatMinuteOfDay } from "$lib/domain/minute-of-day";
  import type { ReservationDTO } from "$lib/dto";
  import { cn, formatDuration } from "$lib/utils";
  import BarChart3 from "@lucide/svelte/icons/chart-no-axes-column-increasing";

  const {
    reservations = [],
    loading = false,
  }: {
    reservations?: ReservationDTO[];
    loading?: boolean;
  } = $props();

  const pendingCount = $derived(reservations.filter((reservation) => reservation.pending).length);
  const totalMinutes = $derived(
    reservations.reduce(
      (total, reservation) =>
        total +
        reservation.offerings.reduce((duration, offering) => duration + offering.duration, 0),
      0,
    ),
  );
  const firstArrival = $derived.by(() => {
    const first = [...reservations].sort((a, b) => a.startMinute - b.startMinute)[0];
    return first ? formatMinuteOfDay(first.startMinute) : undefined;
  });
</script>

<aside
  class="h-full min-h-56 w-full shrink-0 overflow-hidden rounded-xl border border-border bg-card shadow-xs lg:w-68"
  aria-label="Analisi della giornata"
  aria-busy={loading}
>
  <div class="flex items-center gap-2 border-b border-border bg-muted/35 px-4 py-3">
    <div>
      <h2 class="typo-subtitle">Analisi</h2>
      <p class="typo-caption text-muted-foreground">Panoramica del giorno</p>
    </div>
  </div>

  {#if loading}
    <div class="space-y-4 p-4">
      {#each Array(4) as _}
        <div class="space-y-2">
          <div class="h-3 w-20 animate-pulse rounded bg-muted"></div>
          <div class="h-7 w-12 animate-pulse rounded bg-muted"></div>
        </div>
      {/each}
    </div>
  {:else if reservations.length === 0}
    <div class="flex min-h-44 flex-col items-center justify-center px-6 py-8 text-center">
      <div class="mb-3 rounded-full bg-muted p-3">
        <BarChart3 class="size-5 text-muted-foreground" />
      </div>
      <p class="typo-label">Nessun dato disponibile</p>
      <p class="mt-1 typo-caption text-muted-foreground">
        Le analisi compariranno quando ci saranno prenotazioni in questa giornata.
      </p>
    </div>
  {:else}
    <dl class="divide-y divide-border">
      <div class="px-4 py-3">
        <dt class="typo-caption text-muted-foreground">Appuntamenti</dt>
        <dd class="mt-1 typo-heading tabular-nums">{reservations.length}</dd>
      </div>
      <div class="px-4 py-3">
        <dt class="typo-caption text-muted-foreground">In attesa</dt>
        <dd
          class={cn(
            "mt-1 typo-heading tabular-nums",
            pendingCount > 0 && "text-amber-600 dark:text-amber-400",
          )}
        >
          {pendingCount}
        </dd>
      </div>
      <div class="px-4 py-3">
        <dt class="typo-caption text-muted-foreground">Primo arrivo</dt>
        <dd class="mt-1 typo-subheading tabular-nums">{firstArrival}</dd>
      </div>
      <div class="px-4 py-3">
        <dt class="typo-caption text-muted-foreground">Tempo prenotato</dt>
        <dd class="mt-1 typo-subheading">{formatDuration(totalMinutes)}</dd>
      </div>
    </dl>
  {/if}
</aside>
