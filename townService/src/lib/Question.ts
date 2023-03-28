// import { nanoid } from 'nanoid';
import Player from './Player';
import { OfficeHoursQuestion } from '../types/CoveyTownSocket';

export default class Question {
  /* The unique identifier for this question */
  private readonly _id: string;

  /* The actual content of the question */
  private _questionContent: string;

  /* The current set of players in this question. */
  protected _studentsByID: string[] = [];

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
    return this._studentsByID;
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
  constructor(id: string, studentCreatorID: string, questionContent: string) {
    this._id = id;
    this._questionContent = questionContent;
    this._studentsByID.push(studentCreatorID);
    this._groupQuestion = false;
    this._waitTime = 0;
  }

  public addStudent(studentID: string) {
    this._studentsByID.push(studentID);
  }

  public removeStudent(studentID: string) {
    this._studentsByID = this._studentsByID.filter(s => s !== studentID);
  }

  public toModel(): OfficeHoursQuestion {
    return {
      id: this.id,
      students: this.studentsByID,
      questionContent: this.questionContent,
      groupQuestion: this._groupQuestion,
    };
  }

  public static fromQuestionModel(
    id: string,
    studentsByID: string[],
    questionContent: string,
    groupQuestion: boolean,
  ): Question {
    const question = new Question(id, studentsByID[0], questionContent);
    question._groupQuestion = groupQuestion;
    question._studentsByID = studentsByID;
    return question;
  }
}
