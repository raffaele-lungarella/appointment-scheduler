<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import * as ToggleGroup from "$lib/components/ui/toggle-group";
  import type { StaffSummaryDTO } from "$lib/dto";
  import { cn } from "$lib/utils";

  type Orientation = "horizontal" | "vertical";
  let {
    staff,
    orientation = "horizontal",
    value = $bindable(),
    class: className,
    onStaffChange,
  }: {
    staff: StaffSummaryDTO[] | Promise<StaffSummaryDTO[] | null> | null;
    value: string;
    class?: string;
    orientation?: Orientation;
    onStaffChange?: (value: string) => void;
  } = $props();

  const rootOrientationClass = $derived(
    orientation === "vertical"
      ? "w-full flex-col items-stretch md:max-w-125"
      : "w-fit max-w-full flex-row items-center overflow-x-auto",
  );

  const itemOrientationClass = $derived(orientation === "vertical" ? "w-full" : "min-w-40 flex-1");

  function getInitials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
</script>

<svelte:boundary>
  {#await staff}
    <Skeleton class="h-14 w-full rounded-xl" />
  {:then data}
    {#if !data || data.length === 0}
      <p class="text-muted-foreground">
        Al momento non è specificato nessun membro del personale. Riprova più tardi.
      </p>
    {:else}
      <ToggleGroup.Root
        type="single"
        {orientation}
        bind:value
        onValueChange={onStaffChange}
        class={cn("selection-group", rootOrientationClass, className)}
        spacing={2}
      >
        {#each data as member (member.id)}
          <ToggleGroup.Item
            value={member.id}
            aria-label={`Scegli ${member.name}`}
            disabled={data.length === 1}
            class={cn(
              "selection-item min-h-16 justify-start gap-2 rounded-xl px-3 py-2 text-left",
              itemOrientationClass,
            )}
          >
            <Avatar.Root
              class="data-[state=on]:ring-accent/80 data-[state=on]:after:border-foreground ring-offset-gray-4 ring-offset-2 data-[state=on]:ring-2"
              data-state={value === member.id ? "on" : "off"}
            >
              <Avatar.Image src={member.avatar} alt={member.name} />
              <Avatar.Fallback class="border-gray-10">
                {getInitials(member.name)}
              </Avatar.Fallback>
            </Avatar.Root>
            <span class="min-w-0 flex-1 truncate typo-label">{member.name}</span>
          </ToggleGroup.Item>
        {/each}
      </ToggleGroup.Root>
    {/if}
  {/await}
</svelte:boundary>
