export class Feedback {
	#body: string;

	constructor(body: string) {
		this.#body = body;
	}

	getBody(): string {
		return this.#body;
	}
}
