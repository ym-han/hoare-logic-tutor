/**
 * Design doc:
 * Each node in the tree should have a unique stable ID.
 * This enables things like synchronizing between different views on the tree / bidirectional transformations
 */
export class AlrId {
  private static counter = 0;

  public constructor(private value: symbol = Symbol(AlrId.counter++)) {}

  // c.f. the course?
  equals(g: AlrId): boolean {
    return g.value == this.value;
  }

  toString() {
    return this.value.toString();
  }
}
