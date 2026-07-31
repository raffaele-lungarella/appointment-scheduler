<script lang="ts">
  import * as Select from "$lib/components/ui/select/index.js";
  import { formatMinuteOfDay } from "$lib/domain/minute-of-day";
  import type { Slot } from "$lib/modules/get-slots";

  let {
    availableSlots,
    date,
    value = $bindable(),
    onStartMinuteChange,
  }: {
    availableSlots: Slot[];
    date: string;
    value: string;
    onStartMinuteChange?: (value: string) => void;
  } = $props();

  const selectableSlots = $derived(
    availableSlots.filter((slot) => slot.available && !slot.invalid && !slot.past),
  );
  const selectedSlot = $derived(selectableSlots.find((slot) => String(slot.startMinute) === value));
  const placeholder = $derived(
    date && selectableSlots.length === 0 ? "Nessun orario disponibile" : "Seleziona un orario",
  );
</script>

<div>
  <h2 class="sr-only">Seleziona un orario</h2>

  <Select.Root
    type="single"
    bind:value
    disabled={selectableSlots.length === 0}
    onValueChange={onStartMinuteChange}
  >
    <Select.Trigger class="h-12 w-full" aria-label="Seleziona un orario">
      <span data-slot="select-value" class:tabular-nums={selectedSlot}>
        {selectedSlot ? formatMinuteOfDay(selectedSlot.startMinute) : placeholder}
      </span>
    </Select.Trigger>
    <Select.Content class="max-h-64">
      {#each selectableSlots as slot (slot.startMinute)}
        {@const slotValue = String(slot.startMinute)}
        {@const slotLabel = formatMinuteOfDay(slot.startMinute)}
        <Select.Item value={slotValue} label={slotLabel}>
          <span class="tabular-nums">{slotLabel}</span>
        </Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>
</div>
