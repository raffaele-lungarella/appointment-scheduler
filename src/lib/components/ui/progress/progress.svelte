<script lang="ts">
  import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
  import { Progress as ProgressPrimitive } from "bits-ui";

  let {
    ref = $bindable(null),
    class: className,
    max = 100,
    value,
    ...restProps
  }: WithoutChildrenOrChild<ProgressPrimitive.RootProps> = $props();

  const percentage = $derived.by(() => {
    if (!max || max <= 0) return 0;
    return Math.min(100, Math.max(0, ((value ?? 0) / max) * 100));
  });
</script>

<ProgressPrimitive.Root
  bind:ref
  data-slot="progress"
  class={cn(
    "bg-muted relative flex h-2 w-full items-center overflow-x-hidden rounded-xl",
    className,
  )}
  {value}
  {max}
  {...restProps}
>
  <div
    data-slot="progress-indicator"
    class="bg-accent size-full flex-1 transition-all"
    style="transform: translateX(-{100 - percentage}%)"
  ></div>
</ProgressPrimitive.Root>
