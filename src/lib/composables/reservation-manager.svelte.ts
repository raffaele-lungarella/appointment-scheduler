import { getContext, hasContext, setContext } from "svelte";
import type { Data, Tab, User } from "@types";
import { toast } from "svelte-sonner";
import { anonymousUserSchema, usualUserSchema } from "@schema";

export default class ReservationManager {
	tabs: Tab[] = [];
	currentTab: Tab | undefined = $state();
	data: Data = $state({} as Data);

	errorIDs: string[] = $state([]);

	static #contextID = "reservation-manager";

	/** Creates a singleton */
	static instance(role?: User["role"]): ReservationManager {
		if (hasContext(this.#contextID)) {
			console.warn("ReservationManager already created");
			return getContext(this.#contextID);
		} else {
			return setContext(this.#contextID, new ReservationManager(role));
		}
	}

	/** @returns An instance of a ReservationManager singleton */
	static get() {
		return getContext<ReservationManager>(this.#contextID);
	}

	/**
	 * Checks wheter all the info has been filled, moves the view to invalid tabs
	 * and pops up an error toaster @returns true if the values are all inserted
	 */
	check() {
		let parse;
		const dataToParse = { ...this.data, date: this.data.date?.toString() };
		if (this.data.who === "anonymous") {
			parse = anonymousUserSchema.safeParse(dataToParse);
		} else if (this.data.who === "usual") {
			parse = usualUserSchema.safeParse(dataToParse);
		} else {
			parse = usualUserSchema.safeParse(dataToParse);
		}

		if (parse.success) {
			return true;
		}

		console.warn(parse.error.issues);

		const { path } = parse.error.issues[0];

		if (path.includes("email") || path.includes("name")) {
			toast.warning("Devi inserire un nome e una mail valida");
			this.goToTab("info");
			return false;
		} else if (path.includes("kind")) {
			toast.warning("Devi scegliere un servizio per poter proseguire");
			this.goToTab("kind");
			return false;
		} else if (path.includes("date") || path.includes("hour")) {
			toast.warning("Devi scegliere una data o un orario per poter proseguire");
			this.goToTab("date");
			return false;
		} else {
			toast.warning("Dati inseriti errati");
			return false;
		}
	}

	/**
	 * Go to a specific tab
	 * @param tab Target tab
	 */
	goToTab(tab: Tab) {
		this.currentTab = tab;
	}

	private constructor(role?: User["role"]) {
		if (!role) {
			this.data = {
				who: "anonymous",
				hour: "",
				date: "",
				kind: "",
				staff: "",
				name: "",
				email: "",
				phone: "",
			};
		} else {
			if (role === "user") {
				this.data = {
					who: "usual",
					date: "",
					hour: "",
					kind: "",
					staff: "",
				};
			} else {
				this.data = {
					who: "staff",
					name: "",
					phone: "",
					date: "",
					hour: "",
					kind: "",
					staff: "",
				};
			}
		}

		// Info only present if the user is not logged
		if (this.data.who === "anonymous") this.tabs.push("info");

		this.tabs.push("kind");
		this.tabs.push("date");
		this.currentTab = this.tabs[0];
	}
}
