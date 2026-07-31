<script lang="ts">
  import Logo from "$lib/components/app/logo.svelte";
  import { BARBER_SHOP_DETAILS, SOCIAL_LINKS } from "$lib/constants";
  import type { UserDTO } from "$lib/dto";
  import { getNavigationItems, ROUTES } from "$lib/navigation";

  const { user }: { user: UserDTO | null } = $props();
  const currentYear = new Date().getFullYear();

  type FooterLink = {
    label: string;
    href: string;
    external?: boolean;
  };

  const navigationLinks = $derived(
    getNavigationItems(user)
      .filter((item) => item.action !== "logout")
      .map((item) => ({ label: item.title, href: item.url })),
  );

  const contactLinks: FooterLink[] = [
    { label: "Instagram", href: SOCIAL_LINKS.instagram, external: true },
    {
      label: BARBER_SHOP_DETAILS.street,
      href: BARBER_SHOP_DETAILS.google_page,
      external: true,
    },
  ];

  const legalLinks: FooterLink[] = [
    { label: "Privacy", href: "/privacy" },
    { label: "Cookies", href: "/cookies" },
  ];
</script>

<footer class="bg-muted-background mt-24">
  <div class="app-padding border-border border-t">
    <div class="px-2 py-12 sm:px-8 md:py-16">
      <div class="grid gap-12 lg:grid-cols-[minmax(10rem,1fr)_3fr] lg:gap-16">
        <a href={ROUTES.home} aria-label="Vai alla home">
          <Logo />
        </a>

        <nav
          aria-label="Footer"
          class="grid grid-cols-1 gap-x-14 gap-y-10 sm:grid-cols-[repeat(2,minmax(12rem,1fr))] 2xl:grid-cols-[repeat(3,minmax(13rem,1fr))]"
        >
          <div>
            <h2 class="text-foreground mb-6 typo-body-sm">Navigazione</h2>
            <ul class="space-y-4">
              {#each navigationLinks as link}
                <li>
                  <a
                    href={link.href}
                    class="text-muted-foreground hover:text-foreground typo-body-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              {/each}
            </ul>
          </div>

          <div>
            <h2 class="text-foreground mb-6 typo-body-sm">Contatti</h2>
            <ul class="space-y-4">
              {#each contactLinks as link}
                <li>
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noreferrer" : undefined}
                    class="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 typo-body-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              {/each}
            </ul>
          </div>

          <div>
            <h2 class="text-foreground mb-6 typo-body-sm">Trasparenza</h2>
            <ul class="space-y-4">
              {#each legalLinks as link}
                <li>
                  <a
                    href={link.href}
                    class="text-muted-foreground hover:text-foreground typo-body-sm transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        </nav>
      </div>

      <div
        class="border-border text-muted-foreground mt-12 flex flex-col gap-3 border-t pt-6 typo-body-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <p>© {currentYear} Emi Hair Club. Tutti i diritti riservati.</p>
        <p>
          Realizzato da
          <a
            href="https://raffaelelungarella.dev"
            target="_blank"
            rel="noreferrer"
            class="text-foreground hover:text-accent transition-colors p-0"
          >
            Raffaele Lungarella
          </a>
        </p>
      </div>
    </div>
  </div>
</footer>
