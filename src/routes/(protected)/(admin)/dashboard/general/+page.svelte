<script lang="ts">
  import { enhance } from "$app/forms";
  import Pageheader from "$lib/components/app/pageheader.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Switch } from "$lib/components/ui/switch";
  import { tick } from "svelte";

  import ScheduleSection from "../calendar/schedule-section.svelte";
  import type { PageProps } from "./$types";
  import BannerSection from "./banner-section.svelte";
  import CalendarSection from "./calendar-section.svelte";
  import { setDataContext } from "./context";
  import ServiceSection from "./service-section.svelte";
  const { data, form }: PageProps = $props();

  setDataContext({
    get data() {
      return data;
    },
    get form() {
      return form;
    },
  });

  const isStaffActive = $derived(data.user.staff.isActive ?? false);
  let staffSwitchChecked = $derived(isStaffActive);
  let confirmDialogOpen = $state(false);
  let pendingActive = $state(false);
  let staffForm = $state<HTMLFormElement>();

  const handleStaffVisibilityChange = async (checked: boolean) => {
    if (!checked && isStaffActive) {
      staffSwitchChecked = true;
      confirmDialogOpen = true;
      return;
    }

    pendingActive = checked;
    staffSwitchChecked = checked;
    await tick();
    staffForm?.requestSubmit();
  };

  const confirmDeactivate = async () => {
    pendingActive = false;
    staffSwitchChecked = false;
    confirmDialogOpen = false;
    await tick();
    staffForm?.requestSubmit();
  };

  const cancelDeactivate = () => {
    staffSwitchChecked = true;
    confirmDialogOpen = false;
  };
</script>

<svelte:head>
  <meta
    name="description"
    content="Gestisci servizi, disponibilità, periodi di chiusura e visibilità del profilo."
  />
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto flex w-full max-w-2xl flex-col">
  <Pageheader title="Impostazioni" />

  <div class="flex flex-col gap-10">
    <section>
      <div class="mb-4 px-2">
        <h2 class="typo-subheading">Servizi</h2>
        <p class="typo-body-sm text-muted-foreground">
          Configura i servizi che gli utenti possono prenotare.
        </p>
      </div>
      <Card.Root>
        <Card.Content>
          <ServiceSection />
        </Card.Content>
      </Card.Root>
    </section>

    <section>
      <div class="mb-4 px-2">
        <h2 class="typo-subheading">Banner</h2>
        <p class="typo-body-sm text-muted-foreground">Mostra un messaggio a tutti gli utenti.</p>
      </div>
      <Card.Root class="relative">
        <Card.Content>
          <BannerSection />
        </Card.Content>
      </Card.Root>
    </section>

    <section>
      <div class="mb-4 px-2">
        <h2 class="typo-subheading">Disponibilità</h2>
        <p class="typo-body-sm text-muted-foreground">
          Configura gli orari in cui accetti prenotazioni.
        </p>
      </div>
      <ScheduleSection schedule={data.schedule} staffID={data.user.account.id} />
    </section>

    <section>
      <div class="mb-4 px-2">
        <h2 class="typo-subheading">Periodi di chiusura</h2>
        <p class="typo-body-sm text-muted-foreground">
          Giorni in cui il negozio è chiuso e le prenotazioni non sono disponibili.
        </p>
      </div>
      <Card.Root>
        <Card.Content>
          <CalendarSection {data} />
        </Card.Content>
      </Card.Root>
    </section>

    <section>
      <div class="mb-4 px-2">
        <h2 class="typo-subheading">Visibilità</h2>
        <p class="typo-body-sm text-muted-foreground">Determina la visibilità del tuo profilo.</p>
      </div>
      <form action="?/toggleStaff" method="POST" use:enhance bind:this={staffForm}>
        <Card.Root>
          <Card.Content class="flex items-center justify-between">
            <input type="hidden" value={data.user.account.id} name="id" />
            <input type="hidden" name="active" value={pendingActive ? "true" : "false"} />
            <span class="typo-label">Profilo visibile</span>
            <Switch
              id="is-staff-active"
              bind:checked={staffSwitchChecked}
              onCheckedChange={handleStaffVisibilityChange}
            />
          </Card.Content>
        </Card.Root>
      </form>
    </section>
  </div>
</div>

<Dialog.Root bind:open={confirmDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Nascondere il profilo?</Dialog.Title>
      <Dialog.Description>
        Gli utenti non potranno prenotare finché non riattivi la visibilità.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="outline" onclick={cancelDeactivate}>Annulla</Button>
      <Button variant="destructive" onclick={confirmDeactivate}>Conferma</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
