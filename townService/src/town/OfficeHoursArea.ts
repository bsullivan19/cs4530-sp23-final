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

  public get questionQueue() {
    return this._queue;
  }

  public get teachingAssistantsByID() {
    return this._teachingAssistantsByID;
  }

  public get openBreakoutRooms() {
    return this._openBreakoutRooms;
  }

  public get isActive(): boolean {
    return this.teachingAssistantsByID.length > 0;
  }

  public constructor({ id }: OfficeHoursModel, coordinates: BoundingBox, townEmitter: TownEmitter) {
    super(id, coordinates, townEmitter);
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
    const question = this._queue.pop();
    if (question) {
      teachingAssistant.currentQuestion = question;
    }
    return question;
    // TODO: add emit event later
  }

  /**
   * TA is assigned a question and breakout room if both are available, otherwise
   * throws and error.
   */
  public takeQuestion(teachingAssistant: TA): Question {
    const breakoutRoomAreaID = this._getOpenBreakoutRoom();
    if (!breakoutRoomAreaID) {
      throw new Error('No open breakout rooms');
    }
    const question = this.nextQuestion(teachingAssistant);
    if (!question) {
      throw new Error('No questions available');
    }
    teachingAssistant.currentQuestion = question;
    teachingAssistant.officeHoursID = this.id;
    teachingAssistant.breakoutRoomID = breakoutRoomAreaID;
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
    return new OfficeHoursArea({ id: mapObject.name }, box, townEmitter);
  }

  private _getOpenBreakoutRoom(): string | undefined {
    for (const [areaID, ta] of this._openBreakoutRooms) {
      if (!ta) {
        return areaID;
      }
    }
    return undefined;
  }
}
