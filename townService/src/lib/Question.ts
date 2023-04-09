// import { nanoid } from 'nanoid';
import Player from './Player';
import { OfficeHoursQuestion } from '../types/CoveyTownSocket';

export default class Question {
  /* The unique identifier for this question */
  private readonly _id: string;

  /* The interactableID of the OfficeHoursArea */
  private readonly _officeHoursID: string;

  /* The time when this question was created */
  private readonly _timeAsked: number;

  /* The actual content of the question */
  private readonly _questionContent: string;

  /* The current set of players in this question. */
  // this is actually always 1. TODO change this to non array
  private _studentsByID: string[] = [];

  /* Is this question a group question */
  private _groupQuestion: boolean;

  /* Is this question a group question */
  private _questionType: string;

  public get id() {
    return this._id;
  }

  public get officeHoursID() {
    return this._officeHoursID;
  }

  public get questionContent() {
    return this._questionContent;
  }

  public get questionType() {
    return this._questionContent;
  }

  public get studentsByID(): string[] {
    return this._studentsByID;
  }

  public get isGroup(): boolean {
    return this._groupQuestion;
  }

  public get timeAsked() {
    return this._timeAsked;
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
    studentsByID: string[],
    questionContent: string,
    groupQuestion: boolean,
    questionType: string,
    timeAsked?: number,
  ) {
    if (!groupQuestion && studentsByID.length > 1) {
      throw new Error('An individual question can only 1 student');
    }
    this._id = id;
    this._officeHoursID = officeHoursID;
    this._questionContent = questionContent;
    this._studentsByID = studentsByID;
    this._groupQuestion = groupQuestion;
    this._timeAsked = timeAsked || Date.now();
    this._questionType = questionType;
  }

  /**
   * Adds a student to the list of students asking the question.
   * Throws an error if trying to add another student to an individual question.
   *
   * @param student Player to add to this Question.
   */
  public addStudent(student: Player) {
    if (!this.isGroup) {
      throw new Error('Cannot add another student to an individual question');
    }
    this._studentsByID.push(student.id);
  }

  /**
   * Removes a student from the list of players asking the question.
   *
   * @param student Player to remove from this Question.
   */
  public removeStudent(student: Player) {
    this._studentsByID = this._studentsByID.filter(s => s !== student.id);
  }

  /**
   * Converts this Question to an OfficeHoursQuestion model.
   * @returns OfficeHoursQuestion representing this Question.
   */
  public toModel(): OfficeHoursQuestion {
    return {
      id: this.id,
      officeHoursID: this.officeHoursID,
      students: this.studentsByID,
      questionContent: this.questionContent,
      groupQuestion: this.isGroup,
      timeAsked: this.timeAsked,
      questionType: this._questionType,
    };
  }

  /**
   * Updates this Question using an OfficeHoursQuestion model.
   * @param model OfficeHoursQuestion model to update this Question.
   */
  public updateModel(model: OfficeHoursQuestion) {
    if (model.id !== this.id || model.officeHoursID !== this._officeHoursID) {
      throw new Error('Model must be the same ID and in the same OfficeHoursArea');
    }
    if (model.students.length > 1 && !model.groupQuestion) {
      throw new Error('Cannot have more than 1 student in an individual question');
    }
    this._studentsByID = model.students;
    this._groupQuestion = model.groupQuestion;
    this._questionType = model.questionType;
  }

  public static fromQuestionModel(model: OfficeHoursQuestion): Question {
    const question = new Question(
      model.id,
      model.officeHoursID,
      model.students,
      model.questionContent,
      model.groupQuestion,
      model.questionType,
      model.timeAsked,
    );
    return question;
  }
}
