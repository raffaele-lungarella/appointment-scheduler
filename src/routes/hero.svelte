<script lang="ts">
  import { ArrowUpRight } from "$lib/components/icons";
  import { Button } from "$lib/components/ui/button";
  import { ROUTES } from "$lib/navigation";
</script>

<section
  class="border-border bg-card relative isolate flex min-h-[70dvh] overflow-hidden rounded-3xl border shadow-sm"
  aria-labelledby="home-hero-title"
>
  <img
    src="/hairs.webp"
    alt=""
    aria-hidden="true"
    class="absolute inset-0 size-full object-cover"
  />
  <div class="absolute inset-0 bg-black/60" aria-hidden="true"></div>
  <div
    class="absolute inset-0 bg-linear-to-r from-black/70 via-black/35 to-black/20"
    aria-hidden="true"
  ></div>

  <div class="relative z-10 flex min-h-[70dvh] w-full items-end p-6 sm:p-10 md:p-14 lg:p-16">
    <div class="max-w-4xl">
      <h1 id="home-hero-title" class="max-w-3xl typo-display text-balance text-white">
        Emi<br />Hair Club
      </h1>

      <p class="mt-8 max-w-xl typo-body-lg text-white/65">
        Il tuo salone di fiducia per tagli di capelli unici e personalizzati.
      </p>

      <div class="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button
          href={ROUTES.book}
          size="lg"
          class="bg-white text-black shadow-lg shadow-black/20 not-disabled:hover:bg-white/90"
        >
          Prenota ora
          <ArrowUpRight />
        </Button>
        <Button
          href={ROUTES.prices}
          size="lg"
          variant="outline"
          class="border-white/50 bg-black/30 text-white backdrop-blur-sm not-disabled:hover:border-white/70 not-disabled:hover:bg-black/45 not-disabled:hover:text-white"
        >
          Vedi i servizi
        </Button>
      </div>
    </div>
  </div>
</section>
