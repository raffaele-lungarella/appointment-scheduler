<script lang="ts">
  import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
  import CheckIcon from "@lucide/svelte/icons/check";
  import MinusIcon from "@lucide/svelte/icons/minus";
  import { Checkbox as CheckboxPrimitive } from "bits-ui";

  let {
    ref = $bindable(null),
    checked = $bindable(false),
    indeterminate = $bindable(false),
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<CheckboxPrimitive.RootProps> = $props();
</script>

<CheckboxPrimitive.Root
  bind:ref
  data-slot="checkbox"
  class={cn(
    "border-gray-6 dark:bg-input/30 data-[state=checked]:bg-accent data-[state=checked]:text-white data-[state=checked]:border-accent data-[state=indeterminate]:bg-accent data-[state=indeterminate]:text-white data-[state=indeterminate]:border-accent aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 flex size-4 items-center justify-center rounded-lg border transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out group-has-disabled/field:opacity-50 focus-visible:ring-[3px] aria-invalid:ring-2 peer relative shrink-0 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 hover:border-accent enabled:active:scale-95",
    className,
  )}
  bind:checked
  bind:indeterminate
  {...restProps}
>
  {#snippet children({ checked, indeterminate })}
    <div
      data-slot="checkbox-indicator"
      class="[&>svg]:size-3 grid place-content-center text-current transition-transform duration-150 ease-out"
    >
      {#if checked}
        <CheckIcon />
      {:else if indeterminate}
        <MinusIcon />
      {/if}
    </div>
  {/snippet}
</CheckboxPrimitive.Root>
