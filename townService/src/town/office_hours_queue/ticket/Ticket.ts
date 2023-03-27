/**
 * A group ticket where students can create and add themselves to. Students who submit as part of a group question
 * will have the same priority. This makes it possible for students who join later get their question answered quickly
 * if the group question they choose has early priority.
 */
export default class Ticket {
  /* Time ticket was made (student submit ticket) */
  readonly _time: number;

  /* question that students could ask (e.g. question 1)  */
  readonly _questionType: string;

  /* description of the students specific needs */
  private _description: string;

  public constructor(questionType: string, description: string) {
    this._time = Date.now();
    this._questionType = questionType;
    this._description = description;
  }

  public getDescription(): string {
    return this._description;
  }

  public setDescription(value: string): void {
    this._description = value;
  }

  public getTime(): number {
    return this._time;
  }

  public getQuestionType(): string {
    return this._questionType;
  }
}
