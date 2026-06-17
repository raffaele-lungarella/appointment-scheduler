export enum PageCase {
	CONFIRM_RESERVATION,
	CONFIRM_USER,
	PENDING_RESERVATION,
	RECOVER_PASSWORD,
	NORMAL,
}

export function getPageCase(url: URL) {
	if (url.searchParams.get("reservation")) {
		return PageCase.CONFIRM_RESERVATION;
	} else if (url.searchParams.get("user")) {
		return PageCase.CONFIRM_USER;
	} else if (url.searchParams.get("pending")) {
		return PageCase.PENDING_RESERVATION;
	} else if (url.searchParams.get("recover")) {
		return PageCase.RECOVER_PASSWORD;
	} else {
		return PageCase.NORMAL;
	}
}
