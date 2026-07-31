<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import PageHeader from "$lib/components/app/pageheader.svelte";
  import ReservationDetailsSheet from "$lib/components/app/reservation-details-sheet.svelte";
  import {
    CalendarIcon,
    ChevronLeft,
    ChevronRight,
    CirclePlus,
    Search,
    Trash,
  } from "$lib/components/icons/index";
  import { Button } from "$lib/components/ui/button/index";
  import { Checkbox } from "$lib/components/ui/checkbox/index";
  import * as Dialog from "$lib/components/ui/dialog/index";
  import { Input } from "$lib/components/ui/input/index";
  import * as Table from "$lib/components/ui/table/index";
  import { formatMinuteOfDay } from "$lib/domain/minute-of-day";
  import type { ReservationDTO } from "$lib/dto";
  import { cn, formatDate } from "$lib/utils";
  import { ArrowDown, ArrowUp } from "@lucide/svelte";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { toast } from "svelte-sonner";
  import { SvelteSet } from "svelte/reactivity";

  import type { PageData } from "./$types";

  type SortKey = "name" | "date" | "offering" | "status";
  type SortDirection = "asc" | "desc";

  const sortLabels: Record<SortKey, string> = {
    name: "Nome",
    date: "Data e ora",
    offering: "Servizio",
    status: "Stato",
  };

  const { data }: { data: PageData } = $props();
  const PAGE_SIZE = 5;

  let searchQuery = $state("");
  let sortKey = $state<SortKey>("date");
  let sortDirection = $state<SortDirection>("asc");
  let currentPage = $state(1);
  const selectedIds = new SvelteSet<string>();

  let selectedReservation = $state<ReservationDTO | null>(null);
  let reservationToDelete = $state<ReservationDTO | null>(null);
  let isDetailsOpen = $state(false);
  let isDeleteOpen = $state(false);
  let isBatchDeleteOpen = $state(false);

  const reservations = $derived(data.reservations ?? []);

  const filteredReservations = $derived.by(() => {
    const term = searchQuery.toLowerCase().trim();

    const filtered = term
      ? reservations.filter((reservation) => {
          const searchable = [
            reservation.name,
            reservation.email,
            reservation.date,
            safeFormatDate(reservation.date),
            formatShortDate(reservation.date),
            formatMinuteOfDay(reservation.startMinute),
            String(reservation.startMinute),
            ...reservation.offerings.map((offering) => offering.name),
            reservation.staff?.name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchable.includes(term);
        })
      : [...reservations];

    return filtered.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      return compareReservations(a, b, sortKey) * direction;
    });
  });

  const pageCount = $derived(Math.max(1, Math.ceil(filteredReservations.length / PAGE_SIZE)));
  const paginatedReservations = $derived.by(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredReservations.slice(start, start + PAGE_SIZE);
  });
  const selectedCount = $derived(selectedIds.size);
  const selectedOnPage = $derived(
    paginatedReservations.filter((reservation) => selectedIds.has(reservation.id)).length,
  );
  const allRowsOnPageSelected = $derived(
    paginatedReservations.length > 0 && selectedOnPage === paginatedReservations.length,
  );
  const someRowsOnPageSelected = $derived(selectedOnPage > 0 && !allRowsOnPageSelected);

  $effect(() => {
    if (currentPage > pageCount) {
      currentPage = pageCount;
    }
  });

  function safeFormatDate(date: string) {
    try {
      return formatDate(date);
    } catch {
      return date;
    }
  }

  function formatShortDate(date: string) {
    const [year, month, day] = date.split("-");

    if (year && month && day) {
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    }

    return date;
  }

  function compareReservations(a: ReservationDTO, b: ReservationDTO, key: SortKey) {
    if (key === "date") {
      const byDate = a.date.localeCompare(b.date);
      return byDate !== 0 ? byDate : a.startMinute - b.startMinute;
    }

    if (key === "offering") {
      return a.offerings
        .map((offering) => offering.name)
        .join(", ")
        .localeCompare(b.offerings.map((offering) => offering.name).join(", "));
    }

    if (key === "status") {
      return Number(a.pending).toString().localeCompare(Number(b.pending).toString());
    }

    return a.name.localeCompare(b.name);
  }

  function changeSort(key: SortKey) {
    if (sortKey === key) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDirection = "asc";
    }
  }

  function openDetails(reservation: ReservationDTO) {
    selectedReservation = reservation;
    isDetailsOpen = true;
  }

  function openDelete(reservation: ReservationDTO) {
    reservationToDelete = reservation;
    isDeleteOpen = true;
  }

  function setSelected(id: string, checked: boolean) {
    if (checked) {
      selectedIds.add(id);
    } else {
      selectedIds.delete(id);
    }
  }

  function setCurrentPageSelection(checked: boolean) {
    for (const reservation of paginatedReservations) {
      setSelected(reservation.id, checked);
    }
  }

  function resetPagination() {
    currentPage = 1;
  }

  function selectedRowEdgeClass(
    side: "left" | "right",
    hasSelectedBefore: boolean,
    hasSelectedAfter: boolean,
  ) {
    return cn(
      side === "left" && !hasSelectedBefore && "rounded-tl-xl",
      side === "left" && !hasSelectedAfter && "rounded-bl-xl",
      side === "right" && !hasSelectedBefore && "rounded-tr-xl",
      side === "right" && !hasSelectedAfter && "rounded-br-xl",
    );
  }

  const submitDelete: SubmitFunction = async () => {
    return async ({ result }) => {
      if (result.type === "success") {
        await invalidateAll();
        if (reservationToDelete) {
          selectedIds.delete(reservationToDelete.id);
        }
        toast.success("Prenotazione eliminata");
      } else {
        toast.error("Errore durante l'eliminazione della prenotazione. Riprova più tardi");
      }

      isDeleteOpen = false;
      reservationToDelete = null;
    };
  };

  const submitBatchDelete: SubmitFunction = async () => {
    return async ({ result }) => {
      if (result.type === "success") {
        await invalidateAll();
        toast.success(`${selectedCount} prenotazioni eliminate`);
        selectedIds.clear();
      } else {
        toast.error("Errore durante l'eliminazione delle prenotazioni. Riprova più tardi");
      }

      isBatchDeleteOpen = false;
    };
  };
</script>

{#snippet sortButton(key: SortKey)}
  <button
    class="group flex items-center gap-1 rounded-lg px-2 py-1 typo-label text-muted-foreground hover:bg-gray-4 hover:text-foreground"
    onclick={() => changeSort(key)}
  >
    {sortLabels[key]}
    <span
      class="transition-opacity {sortKey === key
        ? 'opacity-100'
        : 'opacity-0 group-hover:opacity-100'}"
      aria-hidden="true"
    >
      {#if sortKey === key && sortDirection === "desc"}
        <ArrowDown size={12} />
      {:else}
        <ArrowUp size={12} />
      {/if}
    </span>
  </button>
{/snippet}

<div class="mx-auto w-full max-w-4xl">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <PageHeader
      title="Le tue prenotazioni"
      description="Cerca, ordina e gestisci le prenotazioni attive."
    />

    <Button class="hidden md:inline-flex" href="/book">
      <CirclePlus />
      Nuova prenotazione
    </Button>
  </div>

  <div class="mb-6 flex items-center gap-2">
    <div class="relative min-w-0 flex-1 md:max-w-md">
      <Search class="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
      <Input
        bind:value={searchQuery}
        oninput={resetPagination}
        class="pl-9"
        placeholder="Cerca per nome, data o ora..."
        aria-label="Cerca prenotazioni"
      />
    </div>
    {#if selectedCount > 0}
      <Button
        variant="destructive"
        onclick={() => (isBatchDeleteOpen = true)}
        aria-label={`Elimina ${selectedCount} prenotazioni selezionate`}
      >
        <Trash class="size-4" />
        <span class="hidden sm:inline">
          Elimina ({selectedCount})
        </span>
      </Button>
    {/if}
  </div>

  {#if paginatedReservations.length !== 0}
    <Table.Root class="typo-body-sm">
      <Table.Header>
        <Table.Row>
          <Table.Head class="w-12">
            <Checkbox
              bind:checked={() => allRowsOnPageSelected, setCurrentPageSelection}
              indeterminate={someRowsOnPageSelected}
              aria-label="Seleziona prenotazioni in questa pagina"
              onclick={(event) => event.stopPropagation()}
            />
          </Table.Head>
          {#if data.user?.role === "staff"}
            <Table.Head>{@render sortButton("name")}</Table.Head>
          {/if}
          <Table.Head>{@render sortButton("date")}</Table.Head>
          <Table.Head>{@render sortButton("offering")}</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each paginatedReservations as reservation, index (reservation.id)}
          {@const isSelected = selectedIds.has(reservation.id)}
          {@const hasSelectedBefore =
            index > 0 && selectedIds.has(paginatedReservations[index - 1].id)}
          {@const hasSelectedAfter =
            index < paginatedReservations.length - 1 &&
            selectedIds.has(paginatedReservations[index + 1].id)}
          <Table.Row
            data-state={isSelected ? "selected" : undefined}
            class="group cursor-pointer rounded-xl outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50 data-[state=selected]:bg-transparent"
            role="button"
            tabindex={0}
            onclick={() => openDetails(reservation)}
            onkeydown={(event) => {
              if (
                event.target === event.currentTarget &&
                (event.key === "Enter" || event.key === " ")
              ) {
                event.preventDefault();
                openDetails(reservation);
              }
            }}
          >
            <Table.Cell
              class={cn(
                "transition-all duration-150 ease-in-out group-not-data-[state=selected]:group-hover:rounded-l-xl group-hover:bg-muted/30 group-data-[state=selected]:bg-muted/80 group-data-[state=selected]:group-hover:bg-muted/90",
                isSelected && selectedRowEdgeClass("left", hasSelectedBefore, hasSelectedAfter),
              )}
              onclick={(event) => event.stopPropagation()}
            >
              <Checkbox
                bind:checked={
                  () => selectedIds.has(reservation.id),
                  (checked) => setSelected(reservation.id, checked)
                }
                aria-label={`Seleziona prenotazione di ${reservation.name}`}
                onclick={(event) => event.stopPropagation()}
              />
            </Table.Cell>

            {#if data.user?.role === "staff"}
              <Table.Cell
                class="transition-all duration-150 ease-in-out group-hover:bg-muted/30 group-data-[state=selected]:bg-muted/80 group-data-[state=selected]:group-hover:bg-muted/90"
              >
                <div class="typo-label">
                  {reservation.name}
                </div>
                <div class="text-muted-foreground typo-caption">
                  {reservation.email}
                </div>
              </Table.Cell>
            {/if}
            <Table.Cell
              class="transition-all duration-150 ease-in-out group-hover:bg-muted/30 group-data-[state=selected]:bg-muted/80 group-data-[state=selected]:group-hover:bg-muted/90"
            >
              <div class="typo-label">
                {safeFormatDate(reservation.date)}
              </div>
              <div class="typo-caption text-muted-foreground">
                {formatMinuteOfDay(reservation.startMinute)}
              </div>
            </Table.Cell>
            <Table.Cell
              class={cn(
                "transition-all duration-150 ease-in-out group-not-data-[state=selected]:group-hover:rounded-r-xl group-hover:bg-muted/30 group-data-[state=selected]:bg-muted/80 group-data-[state=selected]:group-hover:bg-muted/90",
                isSelected && selectedRowEdgeClass("right", hasSelectedBefore, hasSelectedAfter),
              )}
            >
              <div
                class="typo-label w-32 truncate"
                title={reservation.offerings.map((offering) => offering.name).join(", ")}
              >
                {reservation.offerings.map((offering) => offering.name).join(", ")}
              </div>
              <div class="typo-caption text-muted-foreground">
                {reservation.staff?.name}
              </div>
            </Table.Cell>
          </Table.Row>
        {:else}
          <Table.Row>
            <Table.Cell colspan={6} class="h-32 text-center">
              <div class="flex flex-col items-center gap-2 text-muted-foreground">
                <CalendarIcon class="size-8" />
                <p>Nessuna prenotazione trovata.</p>
              </div>
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  {:else if searchQuery}
    Nessun risultato per la ricerca inserita
  {:else}
    Nessuna prenotazione precedente
  {/if}
  <div
    class="mt-6 flex flex-col gap-3 typo-body-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-6 sm:px-4 px-0 lg:px-12"
  >
    <div class="flex w-full items-center gap-2 align-middle justify-center">
      <Button
        variant="outline"
        disabled={currentPage === 1}
        onclick={() => (currentPage = Math.max(1, currentPage - 1))}
      >
        <ChevronLeft class="size-5" />
      </Button>
      <span>Pagina {currentPage} di {pageCount}</span>
      <Button
        variant="outline"
        disabled={currentPage === pageCount}
        onclick={() => (currentPage = Math.min(pageCount, currentPage + 1))}
      >
        <ChevronRight class="size-5" />
      </Button>
    </div>
  </div>
</div>

<ReservationDetailsSheet
  bind:reservation={selectedReservation}
  reservations={filteredReservations}
  bind:open={isDetailsOpen}
  onDelete={(reservation) => {
    isDetailsOpen = false;
    openDelete(reservation);
  }}
/>

<Dialog.Root bind:open={isDeleteOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Eliminare questa prenotazione?</Dialog.Title>
      <Dialog.Description>L'azione è irreversibile.</Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (isDeleteOpen = false)}>Annulla</Button>
      <form action="?/delete" method="post" use:enhance={submitDelete}>
        <input type="hidden" name="id" value={reservationToDelete?.id ?? ""} />
        <Button type="submit" variant="destructive">Conferma</Button>
      </form>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={isBatchDeleteOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Eliminare {selectedCount} prenotazioni?</Dialog.Title>
      <Dialog.Description
        >L'azione è irreversibile e verrà applicata a tutte le righe selezionate.</Dialog.Description
      >
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (isBatchDeleteOpen = false)}>Annulla</Button>
      <form action="?/deleteBatch" method="post" use:enhance={submitBatchDelete}>
        {#each selectedIds as id}
          <input type="hidden" name="ids" value={id} />
        {/each}
        <Button type="submit" variant="destructive">Elimina</Button>
      </form>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
