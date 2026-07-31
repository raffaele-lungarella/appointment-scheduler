<script lang="ts">
  import Duration from "$lib/components/app/duration.svelte";
  import StaffPicker from "$lib/components/app/newreservation/staffpicker.svelte";
  import PageHeader from "$lib/components/app/pageheader.svelte";
  import * as Card from "$lib/components/ui/card";
  import * as Separator from "$lib/components/ui/separator";
  import { Day } from "$lib/enums/days";
  import { formatTime } from "$lib/utils";
  import { Time } from "@internationalized/date";

  import type { PageData } from "./$types";

  const { data }: { data: PageData } = $props();

  const days = Object.keys(Day).filter((el) => !isNaN(Number(el)));
  const dayNames: Record<string, string> = {
    "0": "Lunedì",
    "1": "Martedì",
    "2": "Mercoledì",
    "3": "Giovedì",
    "4": "Venerdì",
    "5": "Sabato",
    "6": "Domenica",
  };

  let selectedStaff = $state("");

  $effect(() => {
    if (!selectedStaff && data.staff?.[0]) {
      selectedStaff = data.staff[0].id;
    }
  });

  const staffMembers = $derived(data.staff ?? []);
  const selectedMember = $derived(staffMembers.find((member) => member.id === selectedStaff));
  const selectedServices = $derived(
    (data.offerings ?? [])
      .filter((offering) => offering.staffID === selectedStaff)
      .sort((a, b) => a.price - b.price),
  );
  const selectedSchedules = $derived(
    data.schedule?.filter((el) => el.staffID === selectedStaff) ?? [],
  );

  function getScheduleForDay(day: string) {
    return selectedSchedules
      .filter((el) => el.day === Number(day))
      .sort((a, b) => a.startHour * 60 + a.startMinute - (b.startHour * 60 + b.startMinute));
  }

  function formatScheduleTime(hour: number, minute: number) {
    return formatTime(new Time(hour, minute));
  }
</script>

<meta
  name="description"
  content="Scopri il listino prezzi completo di Emi Hair Club di Emiliano Lo Russo. Tagli di capelli, servizi barba, trattamenti e pacchetti personalizzati a prezzi competitivi. Qualità professionale e trasparenza nei costi."
/>

<div class="mx-auto w-full max-w-2xl">
  <PageHeader
    title="Catalogo"
    description="Consulta i servizi e gli orari disponibili del personale"
  />

  <div class="space-y-8">
    <StaffPicker staff={staffMembers} bind:value={selectedStaff} />
    <section>
      {#if selectedMember}
        <h2 class="typo-subheading px-2 mb-6">Prezzi</h2>
        <Card.Root>
          <Card.Content>
            <div class="divide-border divide-y">
              {#each selectedServices as offering (offering.id)}
                <article
                  class="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-5 first:pt-0 last:pb-0"
                >
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <h3>{offering.name}</h3>
                      <Separator.Root orientation="vertical" class="h-3" />
                      <Duration
                        amount={offering.duration}
                        class="text-muted-foreground font-mono"
                      />
                    </div>
                    {#if offering.description}
                      <p class="text-muted-foreground mt-2 max-w-prose typo-body-sm">
                        {offering.description}
                      </p>
                    {/if}
                  </div>

                  <p class="pt-1 typo-subtitle">
                    € {offering.price}
                  </p>
                </article>
              {:else}
                <div
                  class="border-border bg-card rounded-2xl border p-6 text-center text-muted-foreground"
                >
                  Nessun servizio disponibile.
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>

        <h2 class="typo-subheading px-2 mb-6 mt-8">Orari di lavoro</h2>

        <Card.Root>
          <Card.Content>
            <div class="divide-border divide-y">
              {#each days as day}
                {@const ranges = getScheduleForDay(day)}
                <div
                  class="grid grid-cols-[minmax(7rem,1fr)_auto] items-center gap-4 py-4 first:pt-2"
                >
                  <div class="flex items-center gap-3">
                    {#if ranges.length > 0}
                      <span class="bg-success size-2 rounded-full"></span>
                    {:else}
                      <span class="bg-muted size-2 rounded-full"></span>
                    {/if}
                    {dayNames[day]}
                  </div>

                  <div
                    class="text-muted-foreground flex flex-wrap justify-end gap-1 font-mono typo-caption"
                  >
                    {#each ranges as range (range.id)}
                      <span>
                        {formatScheduleTime(range.startHour, range.startMinute)} – {formatScheduleTime(
                          range.endHour,
                          range.endMinute,
                        )}
                      </span>
                    {:else}
                      <span>Non disponibile</span>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>
      {:else}
        <Card.Root class="rounded-2xl">
          <Card.Content class="text-muted-foreground py-10 text-center">
            Nessun personale disponibile.
          </Card.Content>
        </Card.Root>
      {/if}
    </section>
  </div>
</div>
