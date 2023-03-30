import Comparator from './comparator/Comparator';
/**
 * A waiting queue for office hours. Uses an internal array as priority queue because it does not exist in typescript.
 * Before each poll, the array is sorted according to given priority.
 */
export default class WaitingQueue<T> {
  /* Queue is implemented using a list. */
  private _queue: T[];

  // selection sort b/c I can't figure out how to pass in the comparator WITH priorities
  private _sort(comp: Comparator<T>): void {
    for (let i = 0; i < this._queue.length; i++) {
      let index = i;
      for (let j = i + 1; j < this._queue.length; j++) {
        if (comp.compare(this._queue[j], this._queue[index]) < 0) {
          index = j;
        }
      }
      const temp = this._queue[index];
      this._queue[index] = this._queue[i];
      this._queue[i] = temp;
    }
  }

  /**
   * Creates a new WaitingQueue.
   */
  public constructor() {
    this._queue = [];
  }

  /**
   * Removes and returns a ticket based on priority.
   * @param comp the priority for tickets
   */
  public poll(comp: Comparator<T>): T {
    if (this._queue.length === 0) {
      throw new Error('Cannot remove from empty queue');
    }
    this._sort(comp);
    const x = this._queue[0];
    this._queue = this._queue.splice(1);
    return x;
  }

  /**
   * Adds a ticket to the queue. If ticket already exists, throws error.
   * @param x the ticket to add
   */
  public add(x: T): void {
    if (this._queue.find(o => o === x)) {
      throw Error('Trying to add a ticket that already exists');
    }
    this._queue.push(x);
  }

  /**
   * Removes a ticket from the queue. If ticket is not found, throws error.
   * @param x the ticket to remove
   */
  public remove(x: T): void {
    if (!this._queue.find(o => o === x)) {
      throw Error('Trying to remove a ticket that does not exist');
    }
    this._queue = this._queue.filter(o => o !== x);
  }

  /**
   * Returns length of queue.
   */
  public length(): number {
    return this._queue.length;
  }

  /**
   * Returns queue as a list, sorted by priority.
   * @param comp the priority for tickets
   */
  public getQueue(comp: Comparator<T>): T[] {
    this._sort(comp);
    return this._queue;
  }
}
