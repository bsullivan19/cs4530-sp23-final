import { ITiledMapObject } from '@jonbell/tiled-map-type-guard';
import { nanoid } from 'nanoid';
import Player from '../lib/Player';
import Question from '../lib/Question';
import TA, { isTA } from '../lib/TA';
import {
  BoundingBox,
  TownEmitter,
  OfficeHoursArea as OfficeHoursModel,
  OfficeHoursQuestion,
  Interactable,
  OfficeHoursQueue,
} from '../types/CoveyTownSocket';
import InteractableArea from './InteractableArea';

export default class OfficeHoursArea extends InteractableArea {
  private _queue: Question[];

  private _teachingAssistantsByID: string[]; // TA's currently online

  private _numRooms: number; // TODO: How to store max number of breakout rooms?

  public get questionQueue() {
    return this._queue;
  }

  public get teachingAssistantsByID() {
    return this._teachingAssistantsByID;
  }

  public get numRooms() {
    return this._numRooms;
  }

  public get isActive(): boolean {
    return this.teachingAssistantsByID.length > 0;
  }

  public constructor(
    { id, numRooms }: OfficeHoursModel,
    coordinates: BoundingBox,
    townEmitter: TownEmitter,
  ) {
    super(id, coordinates, townEmitter);
    this._teachingAssistantsByID = [];
    this._numRooms = numRooms;
    this._queue = [];
  }

  public toQueueModel(): OfficeHoursQueue {
    return {
      officeHoursID: this.id,
      questionQueue: this.questionQueue.map(q => q.toModel()),
    };
  }

  public toModel(): OfficeHoursModel {
    return {
      id: this.id,
      numRooms: this.numRooms,
      teachingAssistantsByID: this.teachingAssistantsByID,
    };
  }

  public updateModel(model: OfficeHoursModel) {
    this._numRooms = model.numRooms;
    const queueCopy = this._queue;
    this._queue = [];
    this._teachingAssistantsByID = model.teachingAssistantsByID;
  }

  public add(player: Player) {
    super.add(player);
    if (isTA(player)) {
      this._teachingAssistantsByID.push(player.id);
      this._emitAreaChanged();
    }
  }

  public remove(player: Player) {
    super.remove(player);
    this._teachingAssistantsByID = this._teachingAssistantsByID.filter(ta => ta !== player.id);
    this._queue.forEach(q => q.removeStudent(player));
    if (isTA(player)) {
      this._emitAreaChanged();
    }
  }

  public getQuestion(questionID: string): Question | undefined {
    return this._queue.find(q => q.id === questionID);
  }

  /**
   * Adds a question queue if it does not exist in the queue,
   * or updates the question if it does exist in the queue.
   */
  public addUpdateQuestion(questionModel: OfficeHoursQuestion) {
    if (questionModel.officeHoursID !== this.id) {
      throw new Error();
    }
    const question = this._queue.find(q => q.id === questionModel.id);
    if (question) {
      question.updateModel(questionModel);
    } else {
      this._queue.push(Question.fromQuestionModel(questionModel));
    }
  }

  /**
   * Assigns a questionID to a player if the player is a TA and the questionID exists in the queue.
   * TODO: Currently, the question is not removed from the queue since the TA
   */
  public takeQuestion(teachingAssistant: Player, questionID: string): Question | undefined {
    const question = this.getQuestion(questionID);
    if (
      question &&
      isTA(teachingAssistant) &&
      this.teachingAssistantsByID.find(ta => ta === teachingAssistant.id)
    ) {
      teachingAssistant.currentQuestion = question;
    }
    return question;
  }

  /**
   * Removes an existing question from the queue if the player is the a TA.
   */
  public removeQuestion(teachingAssistant: Player, questionID: string) {
    const question = this.getQuestion(questionID);
    if (question && isTA(teachingAssistant)) {
      this._queue.filter(q => q.id !== questionID);
    }
  }

  /**
   * Removes the student from an existing question.
   * If the question has no students, the question is removed from the queue.
   */
  public leaveQuestion(student: Player, questionID: string) {
    const question = this._queue.find(q => q.id === questionID);
    if (question) {
      question.removeStudent(student);
      if (question.studentsByID.length === 0) {
        this._queue = this._queue.filter(q => q.id !== questionID);
      }
    }
  }
}
