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
  PlayerLocation,
} from '../types/CoveyTownSocket';
import InteractableArea from './InteractableArea';

export default class OfficeHoursArea extends InteractableArea {
  private _queue: Question[];

  private _teachingAssistantsByID: string[]; // TA's currently online

  // Map of breakout room IDs to the TA in the breakout room
  private _openBreakoutRooms: Map<string, string | undefined>;

  private _roomEmitter: TownEmitter;

  public get questionQueue() {
    return this._queue;
  }

  public get teachingAssistantsByID() {
    return this._teachingAssistantsByID;
  }

  public get openBreakoutRooms() {
    return this._openBreakoutRooms;
  }

  // TODO: should likely be removed. Added so breakout rooms can be reopened if take next
  // question fails.
  public set openBreakoutRooms(assignedBreakoutRooms: Map<string, string | undefined>) {
    this._openBreakoutRooms = assignedBreakoutRooms;
  }

  public get officeHoursActive(): boolean {
    return this.teachingAssistantsByID.length > 0;
  }

  public override get isActive(): boolean {
    return true;
  }

  public get roomEmitter() {
    return this._roomEmitter;
  }

  public constructor({ id }: OfficeHoursModel, coordinates: BoundingBox, townEmitter: TownEmitter) {
    super(id, coordinates, townEmitter);
    this._roomEmitter = townEmitter.to(this.id);
    this._teachingAssistantsByID = [];

    // initialize breakout rooms map
    this._openBreakoutRooms = new Map<string, string | undefined>();
    this._queue = [];
  }

  public addBreakoutRoom(breakoutRoomAreaID: string) {
    this._openBreakoutRooms.set(breakoutRoomAreaID, undefined);
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
      officeHoursActive: this.officeHoursActive,
      teachingAssistantsByID: this.teachingAssistantsByID,
    };
  }

  public updateModel(model: OfficeHoursModel) {
    const queueCopy = this._queue;
    this._queue = [];
  }

  public add(player: Player) {
    super.add(player);
    if (isTA(player)) {
      this._teachingAssistantsByID.push(player.id);
      this._emitAreaChanged();
    }
  }

  // doesn't remove player from queue if he walks out of area
  public remove(player: Player) {
    super.remove(player);
    this._teachingAssistantsByID = this._teachingAssistantsByID.filter(ta => ta !== player.id);
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
    let question = this._queue.find(q => q.id === questionModel.id);
    if (question) {
      question.updateModel(questionModel);
    } else {
      question = Question.fromQuestionModel(questionModel);
      this._queue.push(question);
    }
    if (question.studentsByID.length === 0) {
      this._queue = this._queue.filter(q => q.id !== question?.id);
    }
    this._emitQueueChanged();
  }

  /**
   * Stops an office hours breakout room for the TA. Resets all pertaining fields
   * in office hours area and breakout room. Throws an error if there are no
   * more breakout rooms.
   */
  public stopOfficeHours(ta: TA): PlayerLocation {
    // Add breakout room back as being open
    if (!ta.breakoutRoomID) {
      throw new Error('TA does not have a breakout room');
    }
    if (this._openBreakoutRooms.get(ta.breakoutRoomID) !== ta.id) {
      throw new Error('Breakout room and ta mismatch');
    }
    this._openBreakoutRooms.set(ta.breakoutRoomID, undefined);

    ta.breakoutRoomID = undefined;
    ta.currentQuestion = undefined;
    ta.officeHoursID = undefined;
    return this.areasCenter();
  }

  /**
   * Assigns the next question in the queue to the ta and removes it
   */
  public nextQuestion(teachingAssistant: TA): Question | undefined {
    // TODO: update to use new question queue structure
    const question = this._queue.shift();
    if (question) {
      teachingAssistant.currentQuestion = question;
    }
    this._emitQueueChanged();
    return question;
  }

  /**
   * TA is assigned a question and breakout room if both are available, otherwise
   * throws and error.
   */
  public takeQuestion(teachingAssistant: TA): Question | undefined {
    const breakoutRoomAreaID = this._getOpenBreakoutRoom();
    if (!breakoutRoomAreaID) {
      return undefined;
    }
    const question = this.nextQuestion(teachingAssistant);
    if (!question) {
      return undefined;
    }
    teachingAssistant.currentQuestion = question;
    teachingAssistant.officeHoursID = this.id;
    teachingAssistant.breakoutRoomID = breakoutRoomAreaID;
    // Set this breakout room as taken.
    // TODO: Still need to clear it when the question is finished.
    this._openBreakoutRooms.set(breakoutRoomAreaID, teachingAssistant.id);

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

  /**
   * Creates a new OfficeHoursArea object that will represent a OfficeHoursArea object in the town map.
   * @param mapObject An ITiledMapObject that represents a rectangle in which this viewing area exists
   * @param townEmitter An emitter that can be used by this viewing area to broadcast updates to players in the town
   * @returns
   */
  public static fromMapObject(
    mapObject: ITiledMapObject,
    townEmitter: TownEmitter,
  ): OfficeHoursArea {
    if (!mapObject.width || !mapObject.height) {
      throw new Error('missing width/height for map object');
    }
    const box = {
      x: mapObject.x,
      y: mapObject.y,
      width: mapObject.width,
      height: mapObject.height,
    };
    // return new OfficeHoursArea()
    return new OfficeHoursArea(
      { id: mapObject.name, officeHoursActive: false, teachingAssistantsByID: [] },
      box,
      townEmitter,
    );
  }

  private _getOpenBreakoutRoom(): string | undefined {
    for (const [areaID, ta] of this._openBreakoutRooms) {
      if (!ta) {
        return areaID;
      }
    }
    return undefined;
  }

  protected _emitQueueChanged() {
    this._roomEmitter.emit('officeHoursQueueUpdate', this.toQueueModel());
  }
}
