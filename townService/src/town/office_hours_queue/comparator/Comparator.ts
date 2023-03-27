/**
 * Similar to Java Comparator.
 */
export default interface Comparator<T> {
  /**
   * Compares two objects. There are 3 cases.
   * x < y : negative number
   * x > y : positive number
   * x == y : 0
   * @param x object1
   * @param y object2
   */
  compare(x: T, y: T): number;
}
