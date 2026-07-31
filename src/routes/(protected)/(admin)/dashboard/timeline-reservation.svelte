<script lang="ts">
  import { formatMinuteOfDay } from "$lib/domain/minute-of-day";
  import type { ReservationDTO } from "$lib/dto";
  import { formatMinute } from "$lib/modules/timeline";
  import { formatDuration } from "$lib/utils";

  const {
    reservation,
    top,
    height,
    column,
    columnCount,
    timelineHeight,
    timing,
    clippedAtStart,
    clippedAtEnd,
    onselect,
  }: {
    reservation: ReservationDTO;
    top: number;
    height: number;
    column: number;
    columnCount: number;
    timelineHeight: number;
    timing: "past" | "current" | "upcoming";
    clippedAtStart: boolean;
    clippedAtEnd: boolean;
    onselect: (reservation: ReservationDTO) => void;
  } = $props();

  const width = $derived(100 / columnCount);
  const totalDuration = $derived(
    reservation.offerings.reduce((total, offering) => total + offering.duration, 0),
  );
  const endTime = $derived(formatMinute(reservation.startMinute + totalDuration));
  const durationLabel = $derived(formatDuration(totalDuration));
  const statusLabel = $derived(reservation.pending ? "In attesa" : "Confermata");
</script>

<button
  type="button"
  onclick={() => onselect(reservation)}
  style:top={`${(top / timelineHeight) * 100}%`}
  style:height={`${(height / timelineHeight) * 100}%`}
  style:left={`calc(${column * width}% + ${column === 0 ? 0 : 2}px)`}
  style:width={`calc(${width}% - ${columnCount === 1 ? 0 : 2}px)`}
  class="group absolute z-10 grid min-h-7 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 overflow-hidden rounded-xl border border-border bg-gray-2 px-2 text-start shadow-xs transition-all hover:z-20 hover:bg-gray-3 hover:shadow-md focus-visible:z-20 focus-visible:border-ring focus-visible:bg-gray-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 data-[timing=current]:border-accent-7 data-[timing=current]:bg-accent-3 data-[timing=current]:hover:bg-accent-4"
  class:opacity-50={timing === "past"}
  class:saturate-0={timing === "past"}
  class:rounded-t-none={clippedAtStart}
  class:rounded-b-none={clippedAtEnd}
  data-timing={timing}
  aria-label="Apri i dettagli della prenotazione di {reservation.name}, dalle {formatMinuteOfDay(
    reservation.startMinute,
  )} alle {endTime}, durata {durationLabel}, {timing === 'past' ? 'conclusa' : ''}, {statusLabel}"
>
  <span class="shrink-0 typo-label tabular-nums text-xs">
    {formatMinuteOfDay(reservation.startMinute)} - {endTime}
  </span>

  <span class="min-w-0 truncate typo-body-sm">
    <b>{reservation.name}</b>
    <span class="text-muted-foreground">
      · {reservation.offerings.map((offering) => offering.name).join(", ")}</span
    >
  </span>

  <span class="shrink-0 typo-caption text-foreground/70">{durationLabel}</span>

  <span class="flex shrink-0 items-center gap-1.5">
    {#if reservation.pending}
      <span
        class="flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 typo-caption text-amber-800"
      >
        <span class="size-1.5 rounded-full bg-amber-500"></span>
        {statusLabel}
      </span>
    {/if}
  </span>
</button>
