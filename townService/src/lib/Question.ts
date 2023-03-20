import Player from './Player';

export default class Question {

  /* The unique identifier for this question */
  private readonly _id: string;

  /* The actual content of the question */
  private _questionContent: string;

  /* The current set of players in this question. */
  protected _students: Player[] = [];

  /* Is this question a group question */
  private _groupQuestion: boolean;

  /* How long has this question gone unanswered? */
  private _waitTime: number;

  public get id() {
    return this._id;
  }

  public get questionContent() {
    return this._questionContent;
  }

  public get studentsByID(): string[] {
    return this._students.map(eachStudent => eachStudent.id);
  }

  public get isGroup(): boolean {
    return this._groupQuestion;
  }

  public get waitTime() {
    return this._waitTime;
  }

  /**
   * Constructs a new Question
   * @param id Unique ID for this question
   * @param studentCreator The player that asked the question
   * @param questionContent The content of the question
   */
  constructor(id: string, studentCreator: Player, questionContent: string) {
    this._id = id;
    this._questionContent = questionContent;
    this._students.push(studentCreator);
    this._groupQuestion = false;
    this._waitTime = 0;
  }

  public addStudent(newStudent: Player) {
    this._students.push(newStudent);
  }

  public removeStudent(student: Player) {
    const index = this._students.findIndex(currStudent => currStudent.id === student.id);
    if (index !== -1) {
      this._students.splice(index, 1);
    }
  }
}