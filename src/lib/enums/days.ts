export enum Day {
	MONDAY,
	TUESDAY,
	WEDNESDAY,
	THURSDAY,
	FRIDAY,
	SATURDAY,
	SUNDAY,
}

// export function asDay(day: string) {
// 	switch (day) {
// 		case '0':
// 			return Day.MONDAY;
// 		case '1':
// 			return Day.TUESDAY;
// 		case '2':
// 			return Day.WEDNESDAY;
// 		case '3':
// 			return Day.THURSDAY;
// 		case '4':
// 			return Day.FRIDAY;
// 		case '5':
// 			return Day.SATURDAY;
// 		case '6':
// 			return Day.SUNDAY;
// 	}
// }

export function getWeekDay(day: Day) {
	switch (day) {
		case Day.MONDAY:
			return "Lunedì";
		case Day.TUESDAY:
			return "Martedì";
		case Day.WEDNESDAY:
			return "Mercoledì";
		case Day.THURSDAY:
			return "Giovedì";
		case Day.FRIDAY:
			return "Venerdì";
		case Day.SATURDAY:
			return "Sabato";
		case Day.SUNDAY:
			return "Domenica";
		default:
			return "None";
	}
}
