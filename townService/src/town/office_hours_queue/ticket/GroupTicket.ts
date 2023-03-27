import Ticket from './Ticket';
/**
 * A group ticket where students can create and add themselves to. Students who submit as part of a group question
 * will have the same priority. This makes it possible for students who join later get their question answered quickly
 * if the group question they choose has early priority.
 */
export default class GroupTicket extends Ticket {
  private _studentIDS: string[];

  public constructor(questionType: string, description: string) {
    super(questionType, description);
    this._studentIDS = [];
  }

  /**
   * Adds a student to this ticket. If student is already in, throws error.
   * @param id the student being added
   */
  public addStudent(id: string): void {
    if (this._studentIDS.find(x => id === x)) {
      throw Error('Trying to add a student that is already in group');
    }
    this._studentIDS.push(id);
  }

  /**
   * Removes a student from this ticket. If student is not in, throws error.
   * @param id the student being removed
   */
  public removeStudent(id: string): void {
    if (!this._studentIDS.find(x => id === x)) {
      throw Error('Trying to remove a student that is not in group');
    }
    this._studentIDS = this._studentIDS.filter(x => id !== x);
  }

  public getStudentIDS(): string[] {
    return this._studentIDS;
  }
}
