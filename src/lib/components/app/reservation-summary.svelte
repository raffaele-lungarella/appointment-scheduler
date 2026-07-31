<script lang="ts">
  import Duration from "$lib/components/app/duration.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Separator } from "$lib/components/ui/separator";
  import { formatMinuteOfDay } from "$lib/domain/minute-of-day";
  import type { ReservationDTO } from "$lib/dto";
  import { formatCurrency, formatDate } from "$lib/utils";

  const { reservation }: { reservation: ReservationDTO } = $props();

  const totalDuration = $derived(
    reservation.offerings.reduce((total, offering) => total + offering.duration, 0),
  );
  const totalPrice = $derived(
    reservation.offerings.reduce((total, offering) => total + offering.price, 0),
  );
</script>

<Card.Root>
  <Card.Content>
    <div class="space-y-4">
      <div class="flex justify-between gap-4">
        <span class="text-muted-foreground">Nome</span>
        <span class="text-right typo-label">{reservation.name}</span>
      </div>
      <Separator />
      <div class="flex justify-between gap-4">
        <span class="text-muted-foreground">Email</span>
        <span class="text-right typo-label">{reservation.email}</span>
      </div>
      <Separator />
      <div class="flex justify-between gap-4">
        <span class="text-muted-foreground">Personale</span>
        <span class="text-right typo-label">{reservation.staff.name}</span>
      </div>
      <Separator />
      <div class="flex justify-between gap-4">
        <span class="text-muted-foreground">Servizi</span>
        <span class="space-y-1 text-right typo-label">
          {#each reservation.offerings as offering (offering.id)}
            <span class="block">{offering.name}</span>
          {/each}
        </span>
      </div>
      <Separator />
      <div class="flex justify-between gap-4">
        <span class="text-muted-foreground">Data</span>
        <span class="text-right typo-label">{formatDate(reservation.date)}</span>
      </div>
      <Separator />
      <div class="flex justify-between gap-4">
        <span class="text-muted-foreground">Ora</span>
        <span class="text-right typo-label">{formatMinuteOfDay(reservation.startMinute)}</span>
      </div>
      <Separator />
      <div class="flex justify-between gap-4">
        <span class="text-muted-foreground">Durata</span>
        <span class="text-right typo-label text-foreground text-base"
          ><Duration amount={totalDuration} /></span
        >
      </div>
      <Separator />
      <div class="flex justify-between gap-4">
        <span class="text-muted-foreground">Prezzo</span>
        <span class="text-right typo-subtitle">{formatCurrency(String(totalPrice))}</span>
      </div>
    </div>
  </Card.Content>
</Card.Root>
