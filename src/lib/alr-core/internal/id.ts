 /**
  * Design doc:
  * Each node in the tree should have a unique stable ID.
  * This enables things like synchronizing between different views on the tree / bidirectional transformations
  */
 export class AlrId {
	#value: symbol;

	public constructor() {
		this.#value = Symbol();
	}

  // c.f. the course?
	equals(g: AlrId): boolean {
		return g.#value == this.#value;
	}

	toString() {
		return this.#value.toString();
	}
}
