<script lang="ts">
  import ReservationDetailsSheet from "$lib/components/app/reservation-details-sheet.svelte";
  import type { ReservationDTO } from "$lib/dto";
  import {
    createTimelineScale,
    createTimelineTicks,
    DEFAULT_TIMELINE_CONFIG,
    formatMinute,
    layoutReservations,
  } from "$lib/modules/timeline";
  import { getLocalTimeZone, isToday, today } from "@internationalized/date";
  import type { DateValue } from "@internationalized/date";
  import { onMount } from "svelte";

  import TimelineReservation from "./timeline-reservation.svelte";

  const {
    reservations,
    date,
  }: {
    reservations: ReservationDTO[];
    date: DateValue;
  } = $props();

  const showCurrentTime = $derived(isToday(date, getLocalTimeZone()));
  const isPastDay = $derived(date.compare(today(getLocalTimeZone())) < 0);

  const config = DEFAULT_TIMELINE_CONFIG;
  const scale = createTimelineScale(config);
  const ticks = createTimelineTicks(config);
  const reservationLayouts = $derived(layoutReservations(reservations, config));

  let now = $state(new Date());
  const currentMinute = $derived(now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60);
  const currentTimeTop = $derived(scale.minuteToTop(currentMinute));
  const currentTimeLabel = $derived(formatMinute(currentMinute));
  const currentTimeIsVisible = $derived(
    showCurrentTime && currentMinute >= config.startMinute && currentMinute <= config.endMinute,
  );

  let timelineElement: HTMLDivElement | null = $state(null);
  let hoverMinute: number | null = $state(null);
  const hoverTop = $derived(hoverMinute === null ? null : scale.minuteToTop(hoverMinute));
  const hoverTimeLabel = $derived(hoverMinute === null ? "" : formatMinute(hoverMinute));

  function tickLabelIsVisible(minute: number) {
    return !currentTimeIsVisible || Math.abs(minute - currentMinute) > 12;
  }

  function reservationTiming(startMinute: number, endMinute: number) {
    if (isPastDay || (showCurrentTime && endMinute <= currentMinute)) return "past" as const;
    if (showCurrentTime && startMinute <= currentMinute && endMinute > currentMinute) {
      return "current" as const;
    }
    return "upcoming" as const;
  }

  function updateHoverTime(event: PointerEvent) {
    if (!timelineElement) return;

    const bounds = timelineElement.getBoundingClientRect();
    const renderedTop = Math.min(Math.max(event.clientY - bounds.top, 0), bounds.height);
    const timelineTop = (renderedTop / bounds.height) * scale.height;
    hoverMinute = Math.round(scale.topToMinute(timelineTop));
  }

  function clearHoverTime() {
    hoverMinute = null;
  }

  onMount(() => {
    if (!showCurrentTime) return;

    now = new Date();
    const interval = window.setInterval(() => {
      now = new Date();
    }, 30_000);

    return () => window.clearInterval(interval);
  });

  let selectedReservation: ReservationDTO | null = $state(null);
  let detailsOpen = $state(false);

  function showDetails(reservation: ReservationDTO) {
    selectedReservation = reservation;
    detailsOpen = true;
  }
</script>

{#snippet timeChip(label: string, variant: "hover" | "current")}
  <span
    class={variant === "hover"
      ? "absolute top-1/2 left-full ml-2 inline-flex w-fit -translate-y-1/2 items-center whitespace-nowrap rounded-xl bg-foreground px-3 py-1.5 typo-caption tabular-nums text-background shadow-md"
      : "absolute top-1/2 left-full ml-2 inline-flex w-fit -translate-y-1/2 items-center whitespace-nowrap rounded-xl bg-accent px-3 py-1.5 typo-caption tabular-nums text-background shadow-sm"}
  >
    <span
      class={variant === "hover"
        ? "absolute top-1/2 -left-0.75 size-2 -translate-y-1/2 rotate-45 rounded-[1px] bg-foreground"
        : "absolute top-1/2 -left-0.75 size-2 -translate-y-1/2 rotate-45 rounded-[1px] bg-accent"}
    ></span>
    <span class={variant === "current" ? "relative text-white" : "relative"}>{label}</span>
  </span>
{/snippet}

<div class="w-full">
  <div>
    <div
      bind:this={timelineElement}
      style:height={`${scale.height}px`}
      class="relative mr-16 ml-14 border-border sm:mr-20"
      role="presentation"
      onpointermove={updateHoverTime}
      onpointerleave={clearHoverTime}
    >
      {#each ticks as tick (tick.minute)}
        <div
          style:top={`${(tick.top / scale.height) * 100}%`}
          class="pointer-events-none absolute inset-x-0"
        >
          {#if tick.major}
            <span
              class="absolute right-0 -left-4 border-t border-dashed border-border/50 mask-[linear-gradient(to_right,black_0%,black_80%,transparent_100%)]"
            ></span>
          {/if}
          {#if tick.label && tickLabelIsVisible(tick.minute)}
            <span
              class="absolute -left-14 w-10 -translate-y-1/2 text-right typo-caption tabular-nums text-muted-foreground"
            >
              {tick.label}
            </span>
          {/if}
        </div>
      {/each}

      {#each reservationLayouts as layout (layout.reservation.id)}
        <TimelineReservation
          {...layout}
          timelineHeight={scale.height}
          timing={reservationTiming(layout.startMinute, layout.endMinute)}
          onselect={showDetails}
        />
      {/each}

      {#if hoverTop !== null}
        <div
          class="pointer-events-none absolute inset-x-0 z-40 -translate-y-1/2"
          style:top={`${(hoverTop / scale.height) * 100}%`}
          aria-hidden="true"
        >
          <span class="block h-px w-full bg-foreground/20"></span>
          {@render timeChip(hoverTimeLabel, "hover")}
        </div>
      {/if}

      {#if currentTimeIsVisible}
        <div
          class="pointer-events-none absolute inset-x-0 z-30 -translate-y-1/2"
          style:top={`${(currentTimeTop / scale.height) * 100}%`}
          aria-hidden="true"
        >
          {@render timeChip(currentTimeLabel, "current")}
        </div>
      {/if}
    </div>
  </div>
</div>

<ReservationDetailsSheet
  bind:reservation={selectedReservation}
  {reservations}
  bind:open={detailsOpen}
/>
