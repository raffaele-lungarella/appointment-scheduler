<script lang="ts">
  import { goto, invalidate } from "$app/navigation";
  import { ChevronLeft, ChevronRight } from "$lib/components/icons";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Calendar } from "$lib/components/ui/calendar/";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { formatDate } from "$lib/utils.js";
  import type { CalendarDate, DateValue } from "@internationalized/date";
  import { getLocalTimeZone, parseDate, today, isToday } from "@internationalized/date";
  import { PanelRight } from "@lucide/svelte";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import { onMount, untrack } from "svelte";
  import { cubicOut } from "svelte/easing";
  import { scale } from "svelte/transition";

  import type { PageProps } from "./$types";
  import AnalyticsSidebar from "./analytics-sidebar.svelte";
  import Timeline from "./timeline.svelte";

  const { data }: PageProps = $props();
  const reservations = $derived(data.reservations ?? []);

  const date: CalendarDate | null = untrack(() => (data.date ? parseDate(data.date) : null));
  let selectedDate = $state<DateValue>(date ?? today(getLocalTimeZone()));
  let isCalendarOpen = $state(false);

  let analyticsOpen = $state(false);
  let reservationsRefreshInProgress = false;

  async function refreshReservations() {
    if (document.hidden || reservationsRefreshInProgress) return;

    reservationsRefreshInProgress = true;
    try {
      await invalidate("app:dashboard-reservations");
    } finally {
      reservationsRefreshInProgress = false;
    }
  }

  onMount(() => {
    const interval = window.setInterval(refreshReservations, 15_000);

    function refreshWhenVisible() {
      if (!document.hidden) void refreshReservations();
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  });

  function dashboardUrl(dateValue: DateValue) {
    const params = new URLSearchParams({ date: dateValue.toString() });
    return `?${params.toString()}`;
  }

  function goToDate(value: DateValue) {
    selectedDate = value;
    goto(dashboardUrl(value), { keepFocus: true, noScroll: true });
    isCalendarOpen = false;
  }

  function onValueChange() {
    if (selectedDate) goToDate(selectedDate);
  }

  function moveDay(days: number) {
    goToDate(selectedDate.add({ days }));
  }

  function goToToday() {
    goToDate(today(getLocalTimeZone()));
  }
</script>

<svelte:head>
  <meta
    name="description"
    content="Visualizza tutte le prenotazioni relative ad un determinato giorno."
  />
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="space-y-4">
  <div class="flex items-center justify-between gap-3 overflow-x-auto pb-1">
    <div class="flex shrink-0 items-center gap-3">
      <div class="flex items-center gap-1">
        <Button size="icon-sm" onclick={() => moveDay(-1)} aria-label="Giorno precedente">
          <ChevronLeft />
        </Button>
        <Popover.Root bind:open={isCalendarOpen}>
          <Popover.Trigger>
            {#snippet child({ props })}
              <Button size="sm" {...props}>
                <CalendarIcon class="size-4" />
                {selectedDate ? formatDate(selectedDate.toString()) : "Seleziona data"}
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content class="w-auto p-0" align="start">
            <Calendar {onValueChange} bind:value={selectedDate} type="single" initialFocus />
          </Popover.Content>
        </Popover.Root>
        <Button size="icon-sm" onclick={() => moveDay(1)} aria-label="Giorno successivo">
          <ChevronRight />
        </Button>
      </div>
      {#if !isToday(selectedDate, getLocalTimeZone())}
        <Button variant="outline" size="sm" onclick={goToToday}>Oggi</Button>
      {/if}
    </div>

    <div class="flex shrink-0 items-center gap-2">
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Button
            variant="icon"
            size="icon"
            class={analyticsOpen ? "bg-gray-3 text-foreground" : ""}
            onclick={() => (analyticsOpen = !analyticsOpen)}
            aria-label={analyticsOpen ? "Nascondi analisi" : "Mostra analisi"}
            aria-pressed={analyticsOpen}
            title={analyticsOpen ? "Nascondi analisi" : "Mostra analisi"}
          >
            <PanelRight />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>{analyticsOpen ? "Chiudi sidebar" : "Apri sidebar"}</Tooltip.Content>
      </Tooltip.Root>
    </div>
  </div>

  <div
    class="relative grid transition-[grid-template-columns,column-gap] duration-180 ease-[cubic-bezier(0.16,1,0.3,1)] lg:grid-cols-[minmax(0,1fr)_var(--analytics-width)] lg:gap-x-(--analytics-gap)"
    style={`--analytics-width: ${analyticsOpen ? "17rem" : "0rem"}; --analytics-gap: ${analyticsOpen ? "1rem" : "0rem"}`}
  >
    <main class="min-w-0 mt-8">
      {#if reservations.length}
        <Timeline {reservations} date={selectedDate} />
      {:else}
        <div class="flex min-h-56 flex-col items-center justify-center rounded-xl p-8 text-center">
          <CalendarIcon class="mb-3 size-8 text-muted-foreground" />
          <p class="typo-subtitle">Nessuna prenotazione</p>
          <p class="mt-1 typo-body-sm text-muted-foreground">
            La giornata è libera. Seleziona un’altra data per consultare l’agenda.
          </p>
        </div>
      {/if}
    </main>

    {#if analyticsOpen}
      <div
        class="absolute inset-y-0 right-0 z-30 w-[min(17rem,calc(100%-1rem))] origin-right lg:static lg:z-auto lg:w-auto"
        transition:scale={{ start: 0.98, duration: 160, opacity: 0, easing: cubicOut }}
      >
        <AnalyticsSidebar {reservations} />
      </div>
    {/if}
  </div>
</div>
