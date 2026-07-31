<script lang="ts">
  import CircleCheckIcon from "@lucide/svelte/icons/circle-check";
  import InfoIcon from "@lucide/svelte/icons/info";
  import Loader2Icon from "@lucide/svelte/icons/loader-2";
  import OctagonXIcon from "@lucide/svelte/icons/octagon-x";
  import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
  import { mode } from "mode-watcher";
  import { Toaster as Sonner, type ToasterProps as SonnerProps } from "svelte-sonner";

  const { ...restProps }: SonnerProps = $props();
</script>

<Sonner theme={mode.current} class="toaster group" {...restProps}>
  {#snippet loadingIcon()}
    <Loader2Icon class="text-muted-foreground size-4 animate-spin" />
  {/snippet}
  {#snippet successIcon()}
    <CircleCheckIcon class="text-success size-4" />
  {/snippet}
  {#snippet errorIcon()}
    <OctagonXIcon class="text-destructive size-4" />
  {/snippet}
  {#snippet infoIcon()}
    <InfoIcon class="text-accent size-4" />
  {/snippet}
  {#snippet warningIcon()}
    <TriangleAlertIcon class="size-4 text-amber-500" />
  {/snippet}
</Sonner>
