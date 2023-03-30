import Ticket from './Ticket';
/**
 * An individual ticket for individual questions. A students priority will be based on himself, and not part of a group.
 */
export default class IndividualTicket extends Ticket {
  readonly _studentID: string;

  public constructor(questionType: string, description: string, studentID: string) {
    super(questionType, description);
    this._studentID = studentID;
  }

  public getStudentID(): string {
    return this._studentID;
  }
}
