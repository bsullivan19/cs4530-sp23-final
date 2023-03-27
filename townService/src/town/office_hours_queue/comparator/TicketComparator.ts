import Comparator from './Comparator';
import Ticket from '../ticket/Ticket';
/**
 * A comparator that uses priorities and uses time to break ties.
 */
export default class TicketComparator implements Comparator<Ticket> {
  private _priorities: Map<string, number>;

  public constructor() {
    this._priorities = new Map<string, number>();
  }

  public setPriorities(priorities: Map<string, number>) {
    this._priorities = priorities;
  }

  /**
   * Compares tickets based on priority. Uses time to break ties. Puts less weight on tickets that are not in priority.
   */
  compare(x: Ticket, y: Ticket): number {
    const p1 = this._priorities.get(x.getQuestionType());
    const p2 = this._priorities.get(y.getQuestionType());
    if (
      (p1 === undefined && p2 === undefined) ||
      (p1 !== undefined && p2 !== undefined && p1 === p2)
    ) {
      return x.getTime() - y.getTime();
    }
    if (p1 === undefined) {
      return 1;
    }
    if (p2 === undefined) {
      return -1;
    }
    return p1 - p2;
  }
}
