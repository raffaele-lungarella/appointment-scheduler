import { renderComponent, renderSnippet } from "$lib/components/ui/data-table";
import { formatMinuteOfDay } from "$lib/domain/minute-of-day";
import type { ReservationDTO } from "$lib/dto";
import { formatDate } from "$lib/utils";
import type { ColumnDef } from "@tanstack/table-core";
import { createRawSnippet } from "svelte";

import DatatableActions from "./datatableactions.svelte";

export const columns: ColumnDef<ReservationDTO>[] = [
  {
    accessorKey: "name",
    header: "Nome",
  },
  {
    accessorKey: "date",
    header: "Giorno",
    cell: ({ row }) => {
      const dateSnippet = createRawSnippet<[string]>((getDate) => {
        const date = getDate();
        return {
          render: () => `<div class="text-left font-medium">${date}</div>`,
        };
      });

      return renderSnippet(dateSnippet, formatDate(row.getValue("date")));
    },
  },
  {
    accessorKey: "startMinute",
    header: "Ora",
    cell: ({ row }) => {
      return formatMinuteOfDay(row.original.startMinute);
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      // You can pass whatever you need from `row.original` to the component
      return renderComponent(DatatableActions, { id: row.original.id });
    },
  },
];
