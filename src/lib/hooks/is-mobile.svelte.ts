import { untrack } from "svelte";

const MOBILE_BREAKPOINT = 768;

export class IsMobile {
	#current = $state<boolean>(false);

	constructor(breakpoint = MOBILE_BREAKPOINT) {
		$effect(() => {
			return untrack(() => {
				const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
				const onChange = () => {
					this.#current = window.innerWidth < breakpoint;
				};
				mql.addEventListener("change", onChange);
				onChange();
				return () => {
					mql.removeEventListener("change", onChange);
				};
			});
		});
	}

	get current() {
		return this.#current;
	}
}
