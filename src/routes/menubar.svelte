<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  import { ChevronDown, ChevronRight } from "$lib/components/icons/index";
  import { Button } from "$lib/components/ui/button";
  import * as Menubar from "$lib/components/ui/menubar/index.js";
  import { Separator } from "$lib/components/ui/separator";
  import * as Sheet from "$lib/components/ui/sheet/index.js";
  import type { UserDTO } from "$lib/dto";
  import {
    isNavigationItemActive,
    ROUTES,
    getNavigationItems,
    type NavigationItem,
  } from "$lib/navigation";
  import MenuIcon from "@lucide/svelte/icons/menu";

  const { user }: { user: UserDTO | null } = $props();

  let logoutForm: HTMLFormElement | undefined = $state();
  let menubarValue = $state("");
  let mobileMenuOpen = $state(false);
  let isAccountMenuHovered = $state(false);
  let closeAccountMenuTimeout: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    if (isAccountMenuHovered && menubarValue !== "account") {
      menubarValue = "account";
    }
  });

  function openAccountMenu() {
    if (closeAccountMenuTimeout) {
      clearTimeout(closeAccountMenuTimeout);
    }
    isAccountMenuHovered = true;
    menubarValue = "account";
  }

  function closeAccountMenu() {
    if (closeAccountMenuTimeout) {
      clearTimeout(closeAccountMenuTimeout);
    }
    isAccountMenuHovered = false;
    menubarValue = "";
  }

  function scheduleCloseAccountMenu() {
    if (closeAccountMenuTimeout) {
      clearTimeout(closeAccountMenuTimeout);
    }
    closeAccountMenuTimeout = setTimeout(closeAccountMenu, 100);
  }

  function preventAccountMenuToggle(event: Event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const navigationItems = $derived(getNavigationItems(user));
  const mainNavigationItems = $derived(
    navigationItems.filter(
      (item) =>
        item.visibility === "public" ||
        item.visibility === "logged-out" ||
        item.visibility === "dev",
    ),
  );
  const accountNavigationItems = $derived(
    navigationItems.filter(
      (item) =>
        item.visibility === "logged-in" || item.visibility === "admin" || item.action === "logout",
    ),
  );
  const mobileNavigationItems = $derived(
    navigationItems.filter((item) => item.action !== "logout"),
  );
  const mobileLogoutItem = $derived(navigationItems.find((item) => item.action === "logout"));
  const dashboardNavigationItem = $derived(
    navigationItems.find((item) => item.url === ROUTES.dashboard),
  );
</script>

<div class="app-padding bg-background border-border border-b">
  <div class="w-full">
    <nav
      class="flex flex-row-reverse items-center justify-between gap-1 px-2 py-4 **:data-[slot=button]:active:translate-y-0 sm:px-8 md:flex"
    >
      <div class="md:hidden">
        <Sheet.Root bind:open={mobileMenuOpen}>
          <Sheet.Trigger>
            {#snippet child({ props })}
              <Button {...props} variant="ghost" size="icon" aria-label="Apri menu">
                <MenuIcon />
              </Button>
            {/snippet}
          </Sheet.Trigger>
          <Sheet.Content side="bottom">
            <Sheet.Header>
              <Sheet.Title>Menu</Sheet.Title>
              <Sheet.Description>Vai a una sezione del sito</Sheet.Description>
            </Sheet.Header>

            <Sheet.Body>
              <nav class="flex flex-col gap-2">
                {#if mobileLogoutItem}
                  <Button
                    variant="destructive"
                    class="mb-2 w-full justify-between"
                    onclick={() => {
                      mobileMenuOpen = false;
                      logoutForm?.requestSubmit();
                    }}
                  >
                    <span>{mobileLogoutItem.title}</span>
                    <ChevronRight class="size-4 opacity-60" />
                  </Button>
                  <Separator class="mb-2" />
                {/if}

                {#each mobileNavigationItems as item (item.title)}
                  {@render MobileMenuItem(item)}
                {/each}
                <Separator />
                <Button variant="secondary" onclick={() => (mobileMenuOpen = false)}
                  >Close Menu</Button
                >
              </nav>
            </Sheet.Body>
          </Sheet.Content>
        </Sheet.Root>
      </div>

      <div class="hidden items-center gap-2 md:flex">
        <Menubar.Root
          bind:value={menubarValue}
          class="h-auto gap-1 border-transparent bg-transparent p-0"
        >
          {#each mainNavigationItems as item (item.title)}
            {#if item.url === "/login"}
              <span aria-hidden="true" class="bg-border mx-2 h-5 w-px"></span>
            {/if}
            {@render MenuButton(item)}
          {/each}

          {#if user}
            <Menubar.Menu value="account">
              <Menubar.Trigger
                onpointerenter={openAccountMenu}
                onpointerleave={scheduleCloseAccountMenu}
                onpointerdown={preventAccountMenuToggle}
                onclick={preventAccountMenuToggle}
                class={accountNavigationItems.some((item) =>
                  isNavigationItemActive(page.url.pathname, item.url),
                )
                  ? "text-foreground"
                  : "text-muted-foreground"}
              >
                {#snippet child({ props })}
                  <Button {...props} variant="ghost">
                    Menu
                    <ChevronDown
                      class="transition-transform duration-200 group-aria-expanded/button:rotate-180"
                    />
                  </Button>
                {/snippet}
              </Menubar.Trigger>
              <Menubar.Content
                align="end"
                class="min-w-48"
                onpointerenter={openAccountMenu}
                onpointerleave={closeAccountMenu}
              >
                {#each accountNavigationItems as item (item.title)}
                  {@render MenuItem(item)}
                {/each}
              </Menubar.Content>
            </Menubar.Menu>
          {/if}
        </Menubar.Root>

        {#if dashboardNavigationItem}
          <Button href={dashboardNavigationItem.url} variant="default">
            {dashboardNavigationItem.title}
          </Button>
        {/if}
      </div>
      <a href="/" class="font-flatline text-3xl hover:text-muted-foreground">EMI</a>
    </nav>
  </div>
</div>
{#snippet MenuButton(item: NavigationItem)}
  <Button
    href={item.url}
    variant="ghost"
    aria-label="Go to {item.title}"
    class={isNavigationItemActive(page.url.pathname, item.url)
      ? "text-foreground"
      : "text-muted-foreground"}
  >
    {item.title}
  </Button>
{/snippet}

{#snippet MobileMenuItem(item: NavigationItem)}
  <Button
    href={item.url}
    variant={isNavigationItemActive(page.url.pathname, item.url) ? "secondary" : "ghost"}
    class="w-full justify-between"
    onclick={() => (mobileMenuOpen = false)}
  >
    <span>{item.title}</span>
    <ChevronRight class="size-4 opacity-60" />
  </Button>
{/snippet}

{#snippet MenuItem(item: NavigationItem)}
  {#if item.action === "logout"}
    <Menubar.Separator />
    <Menubar.Item variant="destructive" class="w-full">
      {#snippet child({ props })}
        <button {...props} type="button" onclick={() => logoutForm?.requestSubmit()}>
          {item.title}
        </button>
      {/snippet}
    </Menubar.Item>
  {:else}
    <Menubar.Item>
      {#snippet child({ props })}
        <a {...props} href={item.url}>
          {item.title}
        </a>
      {/snippet}
    </Menubar.Item>
  {/if}
{/snippet}

<form
  bind:this={logoutForm}
  method="post"
  action={ROUTES.logout}
  use:enhance
  id="logout-menubar-form"
></form>
