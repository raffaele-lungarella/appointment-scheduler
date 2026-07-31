<script lang="ts">
  import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
  import { Slider as SliderPrimitive } from "bits-ui";

  let {
    ref = $bindable(null),
    value = $bindable(),
    orientation = "horizontal",
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<SliderPrimitive.RootProps> = $props();
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<SliderPrimitive.Root
  bind:ref
  bind:value={value as never}
  data-slot="slider"
  data-orientation={orientation}
  {orientation}
  class={cn(
    "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
    className,
  )}
  {...restProps}
>
  {#snippet children({ thumbItems })}
    <span
      data-slot="slider-track"
      data-orientation={orientation}
      class={cn(
        "bg-muted relative grow overflow-hidden rounded-xl data-[orientation=horizontal]:h-3 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-3",
      )}
    >
      <SliderPrimitive.Range
        data-slot="slider-range"
        data-orientation={orientation}
        class={cn(
          "bg-accent absolute select-none data-[orientation=horizontal]:top-0 data-[orientation=horizontal]:h-full data-[orientation=vertical]:left-0 data-[orientation=vertical]:w-full",
        )}
      />
    </span>
    {#each thumbItems as thumb (thumb.index)}
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        index={thumb.index}
        class="border-accent ring-ring/50 block size-4 shrink-0 rounded-xl border bg-white shadow-sm transition-colors select-none hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
      />
    {/each}
  {/snippet}
</SliderPrimitive.Root>
