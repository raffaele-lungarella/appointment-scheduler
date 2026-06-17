import { renderComponent, renderSnippet } from "$lib/components/ui/data-table";
import { formatDate, formatTime } from "$lib/utils";
import type { ColumnDef } from "@tanstack/table-core";
import { createRawSnippet } from "svelte";
import DatatableActions from "./datatableactions.svelte";

type Reservation = {
	id: string;
	date: string;
	hour: string;
	name: string;
	email: string;
	kindName: string;
	kindDuration: number;
	kindPrice: number;
};

export const columns: ColumnDef<Reservation>[] = [
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
		accessorKey: "hour",
		header: "Ora",
		cell: ({ row }) => {
			return formatTime(row.original.hour);
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
