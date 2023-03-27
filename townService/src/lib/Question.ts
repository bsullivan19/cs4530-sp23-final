import { nanoid } from 'nanoid';
import Player from './Player';
import { OfficeHoursQuestion } from '../types/CoveyTownSocket';

export default class Question {
  /* The unique identifier for this question */
  private readonly _id: string;

  private readonly _officeHoursID: string;

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

  public get officeHoursID() {
    return this._officeHoursID;
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
  constructor(
    id: string,
    officeHoursID: string,
    studentCreatorID: string,
    questionContent: string,
  ) {
    this._id = id;
    this._officeHoursID = officeHoursID;
    this._questionContent = questionContent;
    this._studentsByID.push(studentCreatorID);
    this._groupQuestion = false;
    this._waitTime = 0;
  }

  public addStudent(student: Player) {
    this._studentsByID.push(student.id);
    student.townEmitter.emit('officeHoursQuestionUpdate', this.toModel());
  }

  public removeStudent(student: Player) {
    this._studentsByID = this._studentsByID.filter(s => s !== student.id);
    student.townEmitter.emit('officeHoursQuestionUpdate', this.toModel());
  }

  public toModel(): OfficeHoursQuestion {
    return {
      id: this.id,
      officeHoursID: this.officeHoursID,
      students: this.studentsByID,
      questionContent: this.questionContent,
      groupQuestion: this._groupQuestion,
    };
  }

  public updateModel(model: OfficeHoursQuestion) {
    if (model.id !== this.id || model.officeHoursID !== this._officeHoursID) {
      throw new Error('Model must be the same ID and in the same OfficeHoursArea');
    }
    this._studentsByID = model.students;
    this._questionContent = model.questionContent;
    this._groupQuestion = model.groupQuestion;
  }

  public static fromQuestionModel(model: OfficeHoursQuestion): Question {
    const question = new Question(
      model.id,
      model.officeHoursID,
      model.students[0],
      model.questionContent,
    );
    question._groupQuestion = model.groupQuestion;
    question._studentsByID = model.students;
    return question;
  }
}
