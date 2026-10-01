<script lang="ts">
  import { ArrowUpRight } from "$lib/components/icons";
  import Button from "$lib/components/ui/button/button.svelte";
  import Separator from "$lib/components/ui/separator/separator.svelte";
  import { BARBER_SHOP_DETAILS } from "$lib/constants";

  import Hero from "./hero.svelte";
</script>

<svelte:head>
  <meta
    name="description"
    content="Prenota il tuo appuntamento da Emi Hair Club, il salone di Emiliano Lo Russo. Tagli di capelli, barba e trattamenti personalizzati con un servizio professionale e di qualità. Prenota online in pochi secondi."
  />
</svelte:head>

<Hero />

<section class="py-20 md:py-28" aria-labelledby="club-title">
    <div class="max-w-2xl space-y-6 typo-body-lg text-pretty">
      <p>
        Emi Hair Club nasce come salone, ma vive come un club: un luogo dove entrare per un taglio e restare per una conversazione.
      </p>
      <p class="text-muted-foreground">
        Il servizio è curato, preciso e personale, ma l'atmosfera resta semplice e familiare.
      </p>
      <div class="flex flex-col items-start gap-1 pt-2 sm:flex-row sm:gap-3">
        <Button variant="link" href="/prices">
          Vedi tutti i servizi
          <ArrowUpRight />
        </Button>
        <Button variant="link" href={BARBER_SHOP_DETAILS.google_page} target="_blank">
          Dove trovarmi
          <ArrowUpRight />
        </Button>
      </div>
  </div>
</section>

<Separator />

<section class="py-20 md:py-28" aria-labelledby="location-title">
  <section aria-label="Galleria fotografica del salone">
    <h1 class="typo-display font-flatline mb-8">Il Club</h1>
    <div class="grid auto-rows-50 grid-cols-1 gap-4 lg:grid-cols-4">
      <!-- Large 2x2 -->
      <div
        role="img"
        aria-label="Vista principale del salone EMI Hair Club con interni moderni"
        class="col-span-1 row-span-2 rounded-lg bg-cover bg-center shadow-md lg:col-span-3"
        style="background-image: url('/barber.webp')"
      ></div>

      <!-- Tall 1x2 -->
      <div
        role="img"
        aria-label="Poltrona da barbiere professionale nel nostro salone"
        class="col-span-1 row-span-2 rounded-lg bg-cover bg-center shadow-md"
        style="background-image: url('/chair.webp')"
      ></div>

      <div
        role="img"
        aria-label="Area reception e scrivania del salone"
        class="col-span-1 row-span-2 rounded-lg bg-cover bg-center shadow-md"
        style="background-image: url('/desk-wide.webp')"
      ></div>

      <div
        role="img"
        aria-label="Interno del salone con vista completa delle postazioni di lavoro"
        class="col-span-1 row-span-2 rounded-lg bg-cover bg-center shadow-md lg:col-span-3"
        style="background-image: url('/salon.webp')"
      ></div>

      <div
        role="img"
        aria-label="Dettaglio della scrivania e area di lavoro del barbiere"
        class="col-span-1 row-span-2 rounded-lg bg-cover bg-center shadow-md lg:col-span-3"
        style="background-image: url('/desk.webp')"
      ></div>

      <div
        role="img"
        aria-label="Dettaglio della poltrona da barbiere con vista laterale"
        class="col-span-1 row-span-2 rounded-lg bg-cover bg-center shadow-md"
        style="background-image: url('/chair-wide.webp')"
      ></div>
    </div>
  </section>
</section>
