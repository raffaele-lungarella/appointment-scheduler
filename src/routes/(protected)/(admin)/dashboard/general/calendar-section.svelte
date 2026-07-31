<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { CirclePlus, LoaderCircle, Trash } from "$lib/components/icons/index";
  import { Button } from "$lib/components/ui/button/index.js";
  import RangeCalendar from "$lib/components/ui/calendar/range-calendar.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { formatDateRange } from "$lib/utils";
  import type { DateValue } from "@internationalized/date";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { toast } from "svelte-sonner";

  import type { PageProps } from "./$types";

  const { data }: { data: PageProps["data"] } = $props();

  let value: { start: DateValue | undefined; end: DateValue | undefined } | undefined = $state();

  const selectedPeriod = $derived(Boolean(value?.start && value.end));

  let addDialogOpen = $state(false);

  let adding = $state(false);
  const submit: SubmitFunction = ({ formData }) => {
    if (!value?.start || !value.end) {
      return;
    }
    adding = true;
    formData.append("start", value.start.toString());
    formData.append("end", value.end.toString());
    formData.append("id", data.user.account.id);

    return async ({ result }) => {
      if (result.type === "success") {
        toast.success("Periodo di chiusura aggiunto.");
        await invalidateAll();
        addDialogOpen = false;
        value = undefined;
      } else if (result.type === "failure") {
        toast.error("Impossibile aggiungere il periodo di chiusura.");
      }
      adding = false;
    };
  };

  let deleting = $state(false);
  let deleteDialogOpen = $state(false);
  let idToDelete = $state("");

  const submitDelete: SubmitFunction = ({ formData }) => {
    if (!idToDelete) {
      return;
    }
    formData.append("id", idToDelete);

    deleting = true;
    return async ({ result }) => {
      if (result.type === "success") {
        toast.success("Periodo di chiusura eliminato.");
        await invalidateAll();
        deleteDialogOpen = false;
      } else if (result.type === "failure") {
        toast.error("Impossibile eliminare il periodo di chiusura.");
      }
      deleting = false;
    };
  };

  const deleteAction = (id: string) => {
    idToDelete = id;
    deleteDialogOpen = true;
  };
</script>

{#await data.shutdown}
  <div class="mb-4 flex flex-col gap-1">
    <Skeleton class="h-13 w-full rounded-md" />
    <Skeleton class="h-13 w-full rounded-md" />
  </div>
{:then shutdown}
  <div class="mb-4 flex flex-col gap-1">
    {#if shutdown && shutdown.length > 0}
      {#each shutdown as p (p.id)}
        <div
          class="group border-border flex items-center justify-between border px-4 py-3 transition-colors rounded-xl hover:bg-gray-4/80 bg-gray-3"
        >
          <span class="typo-label">{formatDateRange(p.start, p.end)}</span>
          <div class="opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              size="icon"
              variant="ghost"
              class="text-destructive hover:text-destructive size-8"
              onclick={() => deleteAction(p.id)}
            >
              <Trash class="size-4" />
            </Button>
          </div>
        </div>
      {/each}
    {:else}
      <p class="text-muted-foreground mb-4 typo-body-sm">Nessun periodo di chiusura configurato.</p>
    {/if}
  </div>
{/await}

<Button onclick={() => (addDialogOpen = true)}>
  <CirclePlus />
  Aggiungi periodo di chiusura
</Button>

<!-- Add period dialog -->
<Dialog.Root
  bind:open={addDialogOpen}
  onOpenChange={(v) => {
    if (!v) {
      value = undefined;
    }
  }}
>
  <Dialog.Content class="sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>Aggiungi periodo di chiusura</Dialog.Title>
      <Dialog.Description>Seleziona il periodo in cui il negozio sarà chiuso.</Dialog.Description>
    </Dialog.Header>
    <div class="flex justify-center">
      <RangeCalendar bind:value numberOfMonths={2} />
    </div>
    <form use:enhance={submit} method="post" action="?/insertShutdown">
      <Dialog.Footer>
        <Button
          type="button"
          variant="secondary"
          onclick={() => (addDialogOpen = false)}
          disabled={adding}
        >
          Annulla
        </Button>
        <Button type="submit" disabled={!selectedPeriod || adding}>
          {#if adding}
            <LoaderCircle class="size-4 animate-spin" />
            Attendi
          {:else}
            Aggiungi
          {/if}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<!-- Delete confirm dialog -->
<Dialog.Root bind:open={deleteDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Eliminare il periodo di chiusura?</Dialog.Title>
      <Dialog.Description>Questa azione è irreversibile.</Dialog.Description>
    </Dialog.Header>
    <form action="?/deleteShutdown" method="post" use:enhance={submitDelete}>
      <input type="hidden" name="id" value={idToDelete} />
      <Dialog.Footer>
        <Button
          type="button"
          variant="secondary"
          disabled={deleting}
          onclick={() => (deleteDialogOpen = false)}
        >
          Annulla
        </Button>
        <Button type="submit" variant="destructive" disabled={deleting}>
          {#if deleting}
            <LoaderCircle class="size-4 animate-spin" />
            Attendi
          {:else}
            Elimina
          {/if}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
