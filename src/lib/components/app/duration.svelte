<script lang="ts">
  import { cn, formatDurationParts } from "$lib/utils";
  import { Clock } from "@lucide/svelte";

  const {
    amount,
    class: className,
    showIcon = false,
  }: { amount: number; class?: string; showIcon?: boolean } = $props();

  const time = $derived(formatDurationParts(amount));
</script>

<span class={cn("inline-flex items-center gap-1 typo-caption", className)}>
  {#if showIcon}
    <Clock class="size-3" />
  {/if}
  <span>
    {#if time.hours}
      {time.hours}
      <span class="text-muted-foreground">
        {#if time.hours === 1}
          ora
        {:else}
          ore
        {/if}
      </span>
    {/if}
    {#if time.hours && time.minutes}
      <span class="text-muted-foreground">e</span>
    {/if}
    {#if time.minutes}
      {time.minutes} <span class="text-muted-foreground">min</span>
    {/if}
  </span>
</span>
