<script lang="ts">
  import Duration from "$lib/components/app/duration.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import * as Popover from "$lib/components/ui/popover";
  import type { OfferingDTO } from "$lib/dto";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";

  let {
    offerings,
    value = $bindable(),
    onOfferingChange,
  }: {
    offerings: OfferingDTO[];
    value: string[];
    onOfferingChange?: (value: string[]) => void;
  } = $props();

  const selectedOfferings = $derived(offerings.filter((offering) => value.includes(offering.id)));

  function toggleOffering(offeringId: string, checked: boolean) {
    const nextValue = checked
      ? value.includes(offeringId)
        ? value
        : [...value, offeringId]
      : value.filter((id) => id !== offeringId);

    value = nextValue;
    onOfferingChange?.(nextValue);
  }
</script>

<Popover.Root>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        class="h-auto min-h-12 w-full justify-between gap-3 px-3 py-2 text-left whitespace-normal enabled:active:scale-100 enabled:active:bg-gray-3 aria-expanded:bg-gray-3"
        aria-label="Seleziona i servizi"
      >
        <span class="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {#if selectedOfferings.length === 0}
            <span class="text-muted-foreground py-0.5 font-normal">Seleziona uno o più servizi</span
            >
          {:else}
            {#each selectedOfferings as offering (offering.id)}
              <Badge variant="secondary" class="max-w-full border-gray-6 border bg-gray-5">
                <span class="truncate">{offering.name}</span>
              </Badge>
            {/each}
          {/if}
        </span>
        <ChevronDownIcon class="text-muted-foreground size-4 shrink-0" />
      </Button>
    {/snippet}
  </Popover.Trigger>

  <Popover.Content
    align="start"
    class="w-(--bits-popover-anchor-width) max-w-[calc(100vw-2rem)] gap-1 p-1.5"
  >
    <div class="max-h-72 overflow-y-auto overscroll-contain pr-1">
      {#each offerings as offering (offering.id)}
        {@const selected = value.includes(offering.id)}
        {@const checkboxId = `offering-${offering.id}`}
        <label
          for={checkboxId}
          class="hover:bg-muted flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors"
        >
          <Checkbox
            id={checkboxId}
            checked={selected}
            onCheckedChange={(checked) => toggleOffering(offering.id, checked)}
          />
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="truncate typo-label">{offering.name}</span>
            <Duration amount={offering.duration} class="text-muted-foreground" />
          </span>
        </label>
      {/each}
    </div>
  </Popover.Content>
</Popover.Root>
