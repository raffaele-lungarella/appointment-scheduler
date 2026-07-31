<script lang="ts">
  import { navigating, page } from "$app/state";
  import { Progress } from "$lib/components/ui/progress";
  import { Toaster } from "$lib/components/ui/sonner";
  import { watch } from "$lib/modules/watch.svelte";
  import { ModeWatcher } from "mode-watcher";

  import "../app.css";
  import Banner from "./banner.svelte";
  import CookieBanner from "./cookiebanner.svelte";
  import Footer from "./footer.svelte";
  import MenuBar from "./menubar.svelte";

  const { data, children } = $props();

  let isNavigating = $state(false);
  let navigationProgress = $state(0);

  watch(
    () => navigating.complete,
    () => {
      if (navigating.complete) {
        isNavigating = true;
        navigationProgress = 0;
        // Use requestAnimationFrame to ensure the display change is rendered before the width transition starts
        requestAnimationFrame(() => {
          navigationProgress = 30;
        });
      } else if (!navigating.complete && isNavigating) {
        requestAnimationFrame(() => {
          navigationProgress = 100;
        });
        setTimeout(() => {
          isNavigating = false;
          navigationProgress = 0;
        }, 300);
      }
    },
  );
</script>

<svelte:head>
  <title>{page.data.title} Emi Hair Club</title>
</svelte:head>

<ModeWatcher />
<Toaster
  position="bottom-right"
  toastOptions={{
    unstyled: true,
    classes: {
      toast:
        "border-border bg-muted-background text-foreground relative flex w-full items-start gap-3 rounded-xl border p-4 shadow-lg",
      content: "flex min-w-0 flex-1 flex-col gap-1",
      icon: "mt-0.5 shrink-0",
      title: "text-foreground typo-label",
      description: "text-foreground/80! typo-body-sm",
      actionButton:
        "bg-foreground text-background hover:bg-foreground/90 h-8 shrink-0 rounded-lg px-3 typo-label transition-colors",
      cancelButton:
        "border-border bg-background text-foreground hover:bg-muted h-8 shrink-0 rounded-lg border px-3 typo-label transition-colors",
      closeButton:
        "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border shadow-sm transition-colors",
    },
  }}
/>

{#if isNavigating}
  <Progress class="fixed top-0 z-50 h-1 w-full rounded-none" value={navigationProgress} />
{/if}

<div class="flex min-h-dvh w-full min-w-0 flex-col">
  {#if data.banner?.visible}
    <Banner message={data.banner.message} />
  {/if}
  <div class="sticky top-0 z-40">
    <MenuBar user={data.user} />
  </div>
  <main class="app-padding relative flex min-h-dvh min-w-0 flex-col">
    <div class="min-w-0 grow px-2 py-16 sm:px-8">
      {@render children()}
    </div>
  </main>
  <Footer user={data.user} />
</div>

<CookieBanner />
