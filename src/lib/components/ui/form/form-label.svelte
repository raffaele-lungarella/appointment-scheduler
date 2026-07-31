<script lang="ts">
  import { Label } from "$lib/components/ui/label/index.js";
  import { cn, type WithoutChild } from "$lib/utils.js";
  import * as FormPrimitive from "formsnap";

  let {
    ref = $bindable(null),
    children,
    class: className,
    required = false,
    ...restProps
  }: WithoutChild<FormPrimitive.LabelProps> & { required?: boolean } = $props();
</script>

<FormPrimitive.Label {...restProps} bind:ref>
  {#snippet child({ props })}
    <Label
      {...props}
      data-slot="form-label"
      class={cn("data-fs-error:text-destructive pl-1", className)}
    >
      {@render children?.()}
      {#if required}
        <span class="text-destructive" aria-hidden="true">*</span>
      {/if}
    </Label>
  {/snippet}
</FormPrimitive.Label>
