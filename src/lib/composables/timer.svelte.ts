import { LOCK_DURATION } from "$lib/constants";

export default class Timer {
	timeLeft: number = $state(0);
	// @ts-expect-error any
	timerInterval;
	isRunning = $state(false);
	isEnded = $derived(this.timeLeft <= 0);

	getTimer() {
		return this.timeLeft;
	}

	setTimer(newValue: number) {
		if (newValue > LOCK_DURATION) {
			return LOCK_DURATION;
		}
		if (newValue <= 0) {
			return 0;
		}
		return newValue;
	}

	update = () => {
		// Using arrow function to preserve 'this' context
		this.timeLeft -= 1000;

		// Check if the timer has finished
		if (this.timeLeft <= 0) {
			this.stop();
		}
	};

	start(time: number) {
		this.timeLeft = time;
		if (!this.isRunning) {
			this.isRunning = true;
			this.timerInterval = setInterval(this.update, 1000);
		}
	}

	stop() {
		if (this.isRunning) {
			clearInterval(this.timerInterval);
			this.isRunning = false;
		}
	}

	reset() {
		this.stop();
		this.timeLeft = LOCK_DURATION;
	}

	pause() {
		if (this.isRunning) {
			clearInterval(this.timerInterval);
			this.isRunning = false;
		}
	}

	resume() {
		if (!this.isRunning && this.timeLeft > 0) {
			this.isRunning = true;
			this.timerInterval = setInterval(this.update, 1000);
		}
	}

	show() {
		if (!this.timeLeft || this.timeLeft < 0) {
			return `00:00`;
		}
		const totalSeconds = Math.floor(this.timeLeft / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
	}
}
