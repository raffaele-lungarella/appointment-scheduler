<script lang="ts">
  import { ChevronLeft } from "$lib/components/icons/index";
  import { ChevronRight } from "$lib/components/icons/index";
  import { buttonVariants } from "$lib/components/ui/button/button.svelte";
  import { cn } from "$lib/utils.js";
  import { RangeCalendar } from "bits-ui";
  import type { ComponentProps } from "svelte";

  let {
    value = $bindable(),
    class: className = "",
    ...restProps
  }: ComponentProps<typeof RangeCalendar.Root> = $props();
</script>

<RangeCalendar.Root
  class={cn(
    "bg-card text-card-foreground rounded-2xl p-3 shadow-xs [--cell-size:--spacing(10)]",
    className,
  )}
  weekdayFormat="short"
  fixedWeeks={true}
  bind:value
  {...restProps}
>
  {#snippet children({ months, weekdays })}
    <RangeCalendar.Header class="flex items-center justify-between gap-2">
      <RangeCalendar.PrevButton class={buttonVariants({ variant: "outline", size: "icon-sm" })}>
        <ChevronLeft class="size-4" />
      </RangeCalendar.PrevButton>
      <RangeCalendar.Heading class="typo-label" />
      <RangeCalendar.NextButton class={buttonVariants({ variant: "outline", size: "icon-sm" })}>
        <ChevronRight class="size-4" />
      </RangeCalendar.NextButton>
    </RangeCalendar.Header>
    <div class="flex flex-col gap-4 pt-4 sm:flex-row">
      {#each months as month (month.value.month)}
        <RangeCalendar.Grid class="w-full border-collapse select-none">
          <RangeCalendar.GridHead>
            <RangeCalendar.GridRow class="mb-2 flex w-full">
              {#each weekdays as day (day)}
                <RangeCalendar.HeadCell
                  class="text-muted-foreground flex size-10 items-center justify-center rounded-xl typo-caption"
                >
                  <div>{day.slice(0, 2)}</div>
                </RangeCalendar.HeadCell>
              {/each}
            </RangeCalendar.GridRow>
          </RangeCalendar.GridHead>
          <RangeCalendar.GridBody>
            {#each month.weeks as weekDates, i (i)}
              <RangeCalendar.GridRow class="mt-1 flex w-full">
                {#each weekDates as date, d (d)}
                  <RangeCalendar.Cell
                    {date}
                    month={month.value}
                    class="relative size-10 p-0 text-center typo-label focus-within:z-20"
                  >
                    <RangeCalendar.Day
                      class="group text-foreground not-data-selected:hover:bg-gray-3 data-selected:bg-foreground/15 data-selection-start:bg-foreground data-selection-end:bg-foreground data-selection-start:text-background data-selection-end:text-background data-disabled:text-muted-foreground data-unavailable:text-muted-foreground data-outside-month:not-data-selected:text-muted-foreground relative inline-flex size-10 items-center justify-center rounded-xl border border-transparent bg-transparent p-0 typo-label whitespace-nowrap select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-outside-month:pointer-events-none data-selected:not-data-selection-start:not-data-selection-end:rounded-none data-unavailable:line-through"
                    >
                      <span
                        class="bg-foreground group-data-selection-end:bg-background group-data-selection-start:bg-background absolute bottom-1.5 hidden h-0.5 w-3 rounded-full group-data-today:block"
                      ></span>
                      <span class="relative">{date.day}</span>
                    </RangeCalendar.Day>
                  </RangeCalendar.Cell>
                {/each}
              </RangeCalendar.GridRow>
            {/each}
          </RangeCalendar.GridBody>
        </RangeCalendar.Grid>
      {/each}
    </div>
  {/snippet}
</RangeCalendar.Root>
