<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { CirclePlus, LoaderCircle, Pencil, Save, Trash } from "$lib/components/icons/index";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { Input } from "$lib/components/ui/input";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Slider } from "$lib/components/ui/slider";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { TOOLTIP_DELAY } from "$lib/constants";
  import { Day, dayLabels, getWeekDay } from "$lib/enums/days";
  import type { ScheduleEntry, ScheduleRange } from "$lib/shared";
  import { formatTime } from "$lib/utils";
  import { Time } from "@internationalized/date";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";

  import { initializeEmptyMap, mapToDB, mapToUI, validateRange } from "./ranges";

  const { schedule, staffID }: { schedule: Promise<ScheduleEntry[] | null>; staffID: string } =
    $props();

  type DialogView = "add" | "edit" | "confirm-delete";
  let dialogView: DialogView = $state("add");
  let editingIndex: number | undefined = $state();
  let dialogDay = $state(String(Day.MONDAY));

  const tabs = Object.keys(Day).filter((el) => !isNaN(Number(el)));

  let scheduleMap: Map<Day, ScheduleRange[]> = $state(initializeEmptyMap());

  onMount(async () => {
    scheduleMap = mapToUI((await schedule) ?? [], staffID);
  });

  let isDialogOpen = $state(false);
  let sliderValue: number[] = $state([9 * 60, 17 * 60]);
  const otherRanges = $derived(
    (scheduleMap.get(Number(dialogDay) as Day) ?? []).filter((_, i) =>
      dialogView === "edit" ? i !== editingIndex : true,
    ),
  );

  const hasConflict = $derived.by(() => {
    if (!otherRanges.length) return false;
    const [startMin, endMin] = sliderValue;
    const newRange: ScheduleRange = {
      start: new Time(Math.floor(startMin / 60), startMin % 60),
      end: new Time(Math.floor(endMin / 60), endMin % 60),
    };
    return !validateRange(newRange, otherRanges);
  });

  function openAdd(day: string) {
    dialogView = "add";
    dialogDay = day;
    sliderValue = [9 * 60, 18 * 60];
    editingIndex = undefined;
    isDialogOpen = true;
  }

  function openEditRange(day: string, idx: number, s: ScheduleRange) {
    dialogView = "edit";
    dialogDay = day;
    sliderValue = [
      (s.start.hour ?? 0) * 60 + (s.start.minute ?? 0),
      (s.end.hour ?? 0) * 60 + (s.end.minute ?? 0),
    ];
    editingIndex = idx;
    isDialogOpen = true;
  }

  function openDelete(day: string, idx: number, s: ScheduleRange) {
    if (s.id) {
      idRangeToDelete = s.id;
      dialogView = "confirm-delete";
      isDialogOpen = true;
    } else {
      const ranges = scheduleMap.get(Number(day) as Day)?.filter((_, i) => idx !== i) ?? [];
      scheduleMap.set(Number(day), ranges);
      // eslint-disable-next-line svelte/prefer-svelte-reactivity
      scheduleMap = new Map(scheduleMap);
    }
  }

  function confirmRange(existingIndex?: number) {
    if (hasConflict) return;

    const [startMin, endMin] = sliderValue;
    const targetDay = Number(dialogDay) as Day;
    const newRange: ScheduleRange = {
      start: new Time(Math.floor(startMin / 60), startMin % 60),
      end: new Time(Math.floor(endMin / 60), endMin % 60),
    };

    if (existingIndex !== undefined) {
      const arr = scheduleMap.get(targetDay) ?? [];
      arr[existingIndex] = newRange;
      scheduleMap.set(targetDay, arr);
    } else {
      const arr = scheduleMap.get(targetDay) ?? [];
      const merged = [...arr, newRange].sort((a, b) => {
        const aMinutes = (a.start.hour ?? 0) * 60 + (a.start.minute ?? 0);
        const bMinutes = (b.start.hour ?? 0) * 60 + (b.start.minute ?? 0);
        return aMinutes - bMinutes;
      });
      scheduleMap.set(targetDay, merged);
    }

    isDialogOpen = false;
  }

  let deleting = $state(false);
  const submitDelete: SubmitFunction = () => {
    deleting = true;
    return async ({ result }) => {
      if (result.type === "success") {
        await invalidateAll();
        scheduleMap = mapToUI((await schedule) ?? [], staffID);
        toast.success("Orario eliminato.");
      } else {
        toast.error("Impossibile eliminare l'orario.");
      }
      deleting = false;
      isDialogOpen = false;
    };
  };

  let updating = $state(false);
  const submitFunction: SubmitFunction = ({ formData }) => {
    updating = true;
    formData.append("data", JSON.stringify(mapToDB(scheduleMap)));
    return async ({ result }) => {
      if (result.type === "success") {
        await invalidateAll();
        scheduleMap = mapToUI((await schedule) ?? [], staffID);
        toast.success("Orario salvato.");
      } else {
        toast.error("Impossibile salvare l'orario.");
      }
      updating = false;
    };
  };

  let idRangeToDelete: number | null = $state(null);

  function minsToTimeStr(m: number) {
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }

  const SLIDER_MIN = 6 * 60; // 06:00
  const SLIDER_MAX = 22 * 60; // 22:00

  const timelineStakes = [
    { label: "06:00", min: 6 * 60 },
    { label: "10:00", min: 10 * 60 },
    { label: "14:00", min: 14 * 60 },
    { label: "18:00", min: 18 * 60 },
    { label: "22:00", min: 22 * 60 },
  ];
</script>

<Card.Root>
  <Card.Content>
    <div class="flex flex-col gap-1">
      {#each tabs as t}
        <div class="flex items-center gap-2 border-b border-border py-2">
          <!-- Day label -->
          <p class="text-muted-foreground w-12 shrink-0 typo-subtitle">
            {dayLabels[t]}
          </p>

          <!-- Ranges -->
          <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {#await schedule}
              <Skeleton class="h-8 w-24 rounded-md" />
            {:then _}
              {#each scheduleMap.get(Number(t) as Day) ?? [] as s, idx}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger>
                    {#snippet child({ props })}
                      <button
                        {...props}
                        class={[
                          "cursor-pointer px-2 py-1 group border-border flex items-center justify-between border transition-colors rounded-xl hover:bg-gray-4/80 bg-gray-3",
                          !s.id && "border-yellow-400/60",
                        ]}
                      >
                        <span class="typo-label">{formatTime(s.start)}</span>
                        <span class="text-muted-foreground mx-0.5">–</span>
                        <span class="text-muted-foreground">{formatTime(s.end)}</span>
                      </button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content>
                    <DropdownMenu.Item onclick={() => openEditRange(t, idx, s)}>
                      <Pencil class="size-4" />
                      Modifica
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item
                      class="text-destructive focus:text-destructive"
                      onclick={() => openDelete(t, idx, s)}
                    >
                      <Trash class="size-4" />
                      Elimina
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              {/each}
            {/await}
            <!-- Add button -->
            <Tooltip.Root delayDuration={TOOLTIP_DELAY}>
              <Tooltip.Trigger>
                {#snippet child({ props })}
                  <Button {...props} variant="outline" onclick={() => openAdd(t)} size="icon">
                    <CirclePlus class="size-3.5" />
                  </Button>
                {/snippet}
              </Tooltip.Trigger>
              <Tooltip.Content>Aggiungi orario</Tooltip.Content>
            </Tooltip.Root>
          </div>
        </div>
      {/each}
    </div>
  </Card.Content>
  <Card.Footer>
    <form action="?/addSchedule" method="POST" use:enhance={submitFunction}>
      <Button type="submit" disabled={updating}>
        {#if updating}
          <LoaderCircle class="size-4 animate-spin" />
          Attendi
        {:else}
          <Save class="size-4" />
          Salva orario
        {/if}
      </Button>
    </form>
  </Card.Footer>
</Card.Root>

<!-- Dialog: add / edit / confirm-delete range -->
<Dialog.Root bind:open={isDialogOpen}>
  <Dialog.Content>
    {#if dialogView !== "confirm-delete"}
      <Dialog.Header>
        <Dialog.Title>
          {dialogView === "add" ? "Aggiungi orario" : "Modifica orario"}
          per
          {getWeekDay(Number(dialogDay))}
        </Dialog.Title>
      </Dialog.Header>

      <div class="py-4">
        <div class="mb-6 flex items-center justify-center gap-2">
          <Input
            type="time"
            min={minsToTimeStr(SLIDER_MIN)}
            max={minsToTimeStr(SLIDER_MAX)}
            value={minsToTimeStr(sliderValue[0])}
            class={[
              "w-auto",
              hasConflict
                ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                : "",
            ]}
            onchange={(e) => {
              const [h, m] = e.currentTarget.value.split(":").map(Number);
              const mins = Math.max(SLIDER_MIN, Math.min(sliderValue[1] - 15, h * 60 + m));
              sliderValue = [mins, sliderValue[1]];
            }}
          />
          <span class="text-muted-foreground shrink-0">–</span>
          <Input
            type="time"
            min={minsToTimeStr(SLIDER_MIN)}
            max={minsToTimeStr(SLIDER_MAX)}
            value={minsToTimeStr(sliderValue[1])}
            class={[
              "w-auto",
              hasConflict
                ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                : "",
            ]}
            onchange={(e) => {
              const [h, m] = e.currentTarget.value.split(":").map(Number);
              const mins = Math.max(sliderValue[0] + 15, Math.min(SLIDER_MAX, h * 60 + m));
              sliderValue = [sliderValue[0], mins];
            }}
          />
        </div>
        <Slider
          type="multiple"
          bind:value={sliderValue}
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={15}
        />

        <!-- Timeline + stakes -->
        <div class="mt-3">
          <div class="bg-muted relative h-3 w-full overflow-hidden rounded-full">
            {#each otherRanges as r}
              {@const startPct =
                ((r.start.hour * 60 + r.start.minute - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) *
                100}
              {@const endPct =
                ((r.end.hour * 60 + r.end.minute - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100}
              <div
                class="bg-muted-foreground/40 absolute h-full"
                style="left: {startPct}%; width: {endPct - startPct}%"
              ></div>
            {/each}
            <div
              class={[
                "absolute h-full transition-colors",
                hasConflict ? "bg-destructive/70" : "bg-accent/60",
              ]}
              style="left: {((sliderValue[0] - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) *
                100}%; width: {((sliderValue[1] - sliderValue[0]) / (SLIDER_MAX - SLIDER_MIN)) *
                100}%"
            ></div>
          </div>
          <div class="mt-1 flex justify-between">
            {#each timelineStakes as stake}
              <span class="text-muted-foreground typo-caption">{stake.label}</span>
            {/each}
          </div>
        </div>
      </div>

      <Dialog.Footer class="gap-1">
        <Button variant="outline" onclick={() => (isDialogOpen = false)}>Annulla</Button>
        {#if dialogView === "add"}
          <Button disabled={hasConflict} onclick={() => confirmRange()}>Aggiungi</Button>
        {:else}
          <Button disabled={hasConflict} onclick={() => confirmRange(editingIndex)}>Conferma</Button
          >
        {/if}
      </Dialog.Footer>
    {:else}
      <Dialog.Header>
        <Dialog.Title>Eliminare l'orario?</Dialog.Title>
        <Dialog.Description>Questa azione è irreversibile.</Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer>
        <form action="?/deleteSchedule" method="POST" use:enhance={submitDelete}>
          <input type="hidden" name="id" value={idRangeToDelete} />
          <Button
            variant="outline"
            type="button"
            disabled={deleting}
            onclick={() => (isDialogOpen = false)}
          >
            Annulla
          </Button>
          <Button variant="destructive" type="submit" disabled={deleting}>
            {#if deleting}
              <LoaderCircle class="size-4 animate-spin" />
              Attendi
            {:else}
              Elimina
            {/if}
          </Button>
        </form>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
