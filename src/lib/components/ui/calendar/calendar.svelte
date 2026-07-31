<script lang="ts">
  import { ChevronLeft } from "$lib/components/icons/index";
  import { ChevronRight } from "$lib/components/icons/index";
  import { buttonVariants } from "$lib/components/ui/button/button.svelte";
  import { cn } from "$lib/utils.js";
  import { getLocalTimeZone, today } from "@internationalized/date";
  import { Calendar } from "bits-ui";

  let {
    value = $bindable(today(getLocalTimeZone())),
    type: _type = "single",
    class: className = "",
    ...restProps
  } = $props();
</script>

<Calendar.Root
  class={cn(
    "bg-card text-card-foreground rounded-2xl p-3 shadow-xs [--cell-size:--spacing(10)]",
    className,
  )}
  weekdayFormat="short"
  fixedWeeks={true}
  type="single"
  bind:value={value as never}
  {...restProps}
>
  {#snippet children({ months, weekdays })}
    <Calendar.Header class="flex items-center justify-between gap-2">
      <Calendar.PrevButton class={buttonVariants({ variant: "outline", size: "icon-sm" })}>
        <ChevronLeft class="size-4" />
      </Calendar.PrevButton>
      <Calendar.Heading class="typo-label" />
      <Calendar.NextButton class={buttonVariants({ variant: "outline", size: "icon-sm" })}>
        <ChevronRight class="size-4" />
      </Calendar.NextButton>
    </Calendar.Header>
    <div class="flex flex-col gap-4 pt-4 sm:flex-row">
      {#each months as month, i (i)}
        <Calendar.Grid class="w-full border-collapse select-none">
          <Calendar.GridHead>
            <Calendar.GridRow class="mb-2 flex w-full">
              {#each weekdays as day, i (i)}
                <Calendar.HeadCell
                  class="text-muted-foreground flex size-10 items-center justify-center rounded-xl typo-caption"
                >
                  <div>{day.slice(0, 2)}</div>
                </Calendar.HeadCell>
              {/each}
            </Calendar.GridRow>
          </Calendar.GridHead>
          <Calendar.GridBody>
            {#each month.weeks as weekDates, i (i)}
              <Calendar.GridRow class="mt-1 flex w-full">
                {#each weekDates as date, i (i)}
                  <Calendar.Cell
                    {date}
                    month={month.value}
                    class="relative size-10 p-0 text-center typo-label focus-within:z-20"
                  >
                    <Calendar.Day
                      class="group text-foreground not-data-selected:hover:bg-gray-3 data-selected:bg-foreground data-selected:text-background data-selected:hover:bg-foreground/90 data-disabled:text-muted-foreground data-unavailable:text-muted-foreground data-outside-month:not-data-selected:text-muted-foreground relative inline-flex size-10 items-center justify-center rounded-xl border border-transparent bg-transparent p-0 typo-label whitespace-nowrap select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-outside-month:pointer-events-none data-unavailable:line-through"
                    >
                      <span
                        class="bg-foreground group-data-selected:bg-background absolute bottom-1.5 hidden h-0.5 w-3 rounded-full group-data-today:block"
                      ></span>
                      <span class="relative">{date.day}</span>
                    </Calendar.Day>
                  </Calendar.Cell>
                {/each}
              </Calendar.GridRow>
            {/each}
          </Calendar.GridBody>
        </Calendar.Grid>
      {/each}
    </div>
  {/snippet}
</Calendar.Root>
