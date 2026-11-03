<script>
  import { Button } from "$lib/components/ui/button";
  import { onMount } from "svelte";

  let isBannerVisible = false;

  function dismiss() {
    isBannerVisible = false;
    localStorage.setItem("areCookieAccepted", "true");
  }

  onMount(() => {
    const hasAccepted = localStorage.getItem("areCookieAccepted") === "true";
    if (hasAccepted) {
      isBannerVisible = false;
    } else {
      isBannerVisible = true;
    }
  });
</script>

{#if isBannerVisible}
  <div class="cookie-banner z-40 flex w-full flex-row-reverse p-12">
    <div class="flex rounded-lg border bg-sidebar shadow-lg md:w-1/2 lg:w-1/3 border-border">
      <div class="p-4">
        <p class="text-xs">
          Questo sito utilizza esclusivamente cookie tecnici necessari per l'autenticazione e la
          gestione della sessione utente.
        </p>
        <div class="mt-3 flex flex-row-reverse items-center gap-4">
          <Button size="xs" variant="ghost" onclick={dismiss}>Ho capito</Button>
          <Button size="xs" variant="link" href="/cookies">Cookie policy</Button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .cookie-banner {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
  }

  p {
    margin: 0;
    line-height: 1.5;
  }
</style>
