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
  TAInfo,
  Priority,
} from '../types/CoveyTownSocket';
import InteractableArea from './InteractableArea';

export default class OfficeHoursArea extends InteractableArea {
  private _queue: Question[];

  private _teachingAssistantsByID: string[]; // TA's currently online

  // Map of breakout room IDs to the TA in the breakout room
  private _openBreakoutRooms: Map<string, string | undefined>;

  private _roomEmitter: TownEmitter;

  private _questionTypes: string[];

  private _taInfos: TAInfo[];

  private _timeLimit: number | undefined = undefined;

  public get timeLimit() {
    return this._timeLimit;
  }

  public get taInfos() {
    return this._taInfos;
  }

  public get questionQueue() {
    return this._queue;
  }

  public get teachingAssistantsByID() {
    return this._teachingAssistantsByID;
  }

  public get openBreakoutRooms() {
    return this._openBreakoutRooms;
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

  public get questionTypes() {
    return this._questionTypes;
  }

  public constructor(
    { id, teachingAssistantsByID }: OfficeHoursModel,
    coordinates: BoundingBox,
    townEmitter: TownEmitter,
  ) {
    super(id, coordinates, townEmitter);
    this._roomEmitter = townEmitter; // townEmitter.to(this.id);
    this._teachingAssistantsByID = teachingAssistantsByID;

    // initialize breakout rooms map
    this._openBreakoutRooms = new Map<string, string | undefined>();
    this._queue = [];
    this._questionTypes = ['Other'];
    this._taInfos = [];
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
      questionTypes: this.questionTypes,
      timeLimit: this.timeLimit,
      taInfos: this.taInfos,
    };
  }

  public updateModel(model: OfficeHoursModel) {
    this._teachingAssistantsByID = model.teachingAssistantsByID;
    this._questionTypes = model.questionTypes;
    this._taInfos = model.taInfos;
    this._timeLimit = model.timeLimit;
    this._emitAreaChanged();
  }

  /**
   * Adds a player to this area. Extends the original functionality to update corresponding
   * TA values if a TA is added.
   * @param player The player being added.
   */
  public add(player: Player) {
    super.add(player);
    if (isTA(player)) {
      const info: TAInfo | undefined = this._taInfos.find(i => i.taID === player.id);
      if (!info) {
        const x: TAInfo = {
          taID: player.id,
          isSorted: false,
          priorities: [],
        };
        this._taInfos.push(x);
      }
      this._teachingAssistantsByID.push(player.id);
    }
    this._emitAreaChanged();
    this._emitQueueChanged();
  }

  /**
   * removes a player to this area. Extends the original functionality to update corresponding
   * TA values if a TA is removed.
   * @param player The player being removed.
   */
  public remove(player: Player) {
    this._teachingAssistantsByID = this._teachingAssistantsByID.filter(ta => ta !== player.id);
    super.remove(player);
    if (isTA(player)) {
      this._emitAreaChanged();
    }
    this._emitQueueChanged();
  }

  public getQuestion(questionID: string): Question | undefined {
    return this._queue.find(q => q.id === questionID);
  }

  public getQuestionForPlayer(playerID: string): Question | undefined {
    let question: Question | undefined;
    this._queue.forEach((q: Question) => {
      if (q.studentsByID.includes(playerID)) {
        question = q;
      }
    });
    return question;
  }

  /**
   * Adds a question queue if it does not exist in the queue,
   * or updates the question if it does exist in the queue.
   * @param questionModel the OfficeHoursQuestion being added/updated in the queue
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
   * in office hours area and breakout room and teleports the players back to the
   * office hours area. Throws an error if there are no more breakout rooms.
   * @param ta TA that is ending their office hours.
   */
  public stopOfficeHours(ta: TA) {
    // Add breakout room back as being open
    if (!ta.breakoutRoomID) {
      throw new Error('TA does not have a breakout room');
    }
    if (this._openBreakoutRooms.get(ta.breakoutRoomID) !== ta.id) {
      throw new Error('Breakout room and ta mismatch');
    }
    this._openBreakoutRooms.set(ta.breakoutRoomID, undefined);

    ta.breakoutRoomID = undefined;
    ta.officeHoursID = undefined;

    // Move this TA back to the office hours area
    ta.location = this.areasCenter();
    ta.location.interactableID = this.id;

    this._townEmitter.emit('officeHoursQuestionTaken', ta.toModel());

    ta.currentQuestions = [];
  }

  /**
   * TA is takes the questions identified and breakout room if both are available, otherwise
   * throws and error.
   * @param teachingAssistant TA taking the questions.
   * @param questionIDs IDs of the questions being taken.
   * @returns the list of questions that are being taken.
   */
  public takeQuestions(teachingAssistant: TA, questionIDs: string[]): Question[] {
    const breakoutRoomAreaID = this._getOpenBreakoutRoom();
    if (!breakoutRoomAreaID) {
      throw new Error('No open breakout rooms');
    }

    const questionQueueByID = this.questionQueue.map(question => question.id); // All the question ID's in the queue
    if (!questionIDs.length || !questionIDs.every(qid => questionQueueByID.includes(qid))) {
      throw new Error('Questions not available');
    }

    // Only set if all questions exist
    this.openBreakoutRooms.set(breakoutRoomAreaID, teachingAssistant.id);
    teachingAssistant.breakoutRoomID = breakoutRoomAreaID;

    const questionsTaken: Question[] = [];
    questionIDs.forEach(questionID => {
      const question = this.removeQuestion(teachingAssistant, questionID);
      if (!question) {
        // not reachable
        throw new Error('Question not available');
      }
      questionsTaken.push(question);
    });

    teachingAssistant.currentQuestions = questionsTaken;
    teachingAssistant.officeHoursID = this.id;
    return questionsTaken;
  }

  /**
   * Removes an existing question from the queue if the player is a TA.
   * @param teachingAssistant TA removing the question.
   * @param questionIDs ID of the question being removed.
   */
  public removeQuestion(teachingAssistant: Player, questionID: string): Question | undefined {
    const question = this.getQuestion(questionID);
    if (question && isTA(teachingAssistant)) {
      this._queue = this._queue.filter(q => q.id !== questionID);
      this._emitQueueChanged();
    }
    return question;
  }

  /**
   * Removes player from an existing question and removes question if it has no more students.
   * @param player Player to remove.
   */
  public removeQuestionForPlayer(player: Player) {
    const question = this.getQuestionForPlayer(player.id);
    if (question) {
      question.removeStudent(player);
      if (question.studentsByID.length === 0) {
        this._queue = this._queue.filter(q => q.id !== question.id);
      }
      this._emitQueueChanged();
    }
  }

  /**
   * Remove all the player data in this area. Handles both TA and student data.
   * @param player Player being removed.
   */
  public removePlayerData(player: Player) {
    this.removeQuestionForPlayer(player);
    this._taInfos = this._taInfos.filter(taInfo => taInfo.taID !== player.id);
    this._openBreakoutRooms.forEach((taID, breakoutID) => {
      if (taID === player.id) {
        this._openBreakoutRooms.set(breakoutID, undefined);
      }
    });
  }

  /**
   * Creates a new OfficeHoursArea object that will represent a OfficeHoursArea object in the town map.
   * @param mapObject An ITiledMapObject that represents a rectangle in which this viewing area exists
   * @param townEmitter An emitter that can be used by this viewing area to broadcast updates to players in the town
   * @returns the new OfficeHoursArea
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
    return new OfficeHoursArea(
      {
        id: mapObject.name,
        officeHoursActive: false,
        teachingAssistantsByID: [],
        questionTypes: ['Other'],
        taInfos: [],
        timeLimit: undefined,
      },
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

  private _emitQueueChanged() {
    this._townEmitter.emit('officeHoursQueueUpdate', this.toQueueModel());
  }
}
