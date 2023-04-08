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

  // public constructor(
  //   { id, teachingAssistantsByID }: OfficeHoursModel,
  //   coordinates: BoundingBox,
  //   townEmitter: TownEmitter,
  // ) {

  public get questionTypes() {
    return this._questionTypes;
  }

  public constructor(
    { id, teachingAssistantsByID }: OfficeHoursModel,
    coordinates: BoundingBox,
    townEmitter: TownEmitter,
  ) {
    super(id, coordinates, townEmitter);
    this._roomEmitter = townEmitter.to(this.id);
    this._teachingAssistantsByID = teachingAssistantsByID;

    // initialize breakout rooms map
    this._openBreakoutRooms = new Map<string, string | undefined>();
    this._queue = [];
    this._questionTypes = ['any'];
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
      taInfos: this.taInfos.map(info => {
        const x: TAInfo = {
          taID: info.taID,
          isSorted: info.isSorted,
          priorities: info.priorities.map(p => {
            const y: Priority = { key: p.key, value: p.value };
            return y;
          }),
        };
        return x;
      }),
    };
  }

  // TODO intended functionallity?
  public updateModel(model: OfficeHoursModel) {
    this._questionTypes = model.questionTypes;
    this._taInfos = model.taInfos;
  }

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
      this._emitAreaChanged();
    }
  }

  // doesn't remove player from queue if he walks out of area
  public remove(player: Player) {
    this._teachingAssistantsByID = this._teachingAssistantsByID.filter(ta => ta !== player.id);
    // Don't want to filter ta infos, it should always be there
    // this._taInfos = this._taInfos.filter((info) => info.taID !== player.id);
    // This removes the question
    // Not desriable if we want to implement original group questions
    // this._queue = this._queue.filter((q) => !q.studentsByID.includes(player.id));
    super.remove(player);
    if (isTA(player)) {
      this._emitAreaChanged();
    }
    this._emitQueueChanged();
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
  public nextQuestion(
    teachingAssistant: TA,
    questionID: string | undefined = undefined,
  ): Question | undefined {
    // TODO: update to use new question queue structure
    let question;
    if (questionID) {
      question = this.getQuestion(questionID);
      this.removeQuestion(teachingAssistant, questionID);
    } else {
      question = this._queue.shift();
    }
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
  public takeQuestion(teachingAssistant: TA, questionID: string | undefined = undefined): Question {
    const breakoutRoomAreaID = this._getOpenBreakoutRoom();
    if (!breakoutRoomAreaID) {
      throw new Error('No open breakout rooms');
    }

    const question = this.nextQuestion(teachingAssistant, questionID);

    if (!question) {
      throw new Error('No questions available');
    }
    this._assignBreakoutRoom(teachingAssistant.id, breakoutRoomAreaID);
    teachingAssistant.currentQuestion = question;
    teachingAssistant.officeHoursID = this.id;
    teachingAssistant.breakoutRoomID = breakoutRoomAreaID;
    return question;
  }

  // TODO unused, remove?
  /**
   * TA is assigned a question and breakout room if both are available, otherwise
   * throws and error.
   */
  // public takeQuestions(teachingAssistant: TA, questionIDs: string[]): Question {
  //   const breakoutRoomAreaID = this._getOpenBreakoutRoom();
  //   if (!breakoutRoomAreaID) {
  //     throw new Error('No open breakout rooms');
  //   }
  //   questionIds.forEach((question) => {
  //
  //   })
  //   for(const question: questionID) {
  //
  //   }
  //   const question = this.nextQuestion(teachingAssistant, questionID);
  //   if (!question) {
  //     throw new Error('No questions available');
  //   }
  //   teachingAssistant.currentQuestion = question;
  //   teachingAssistant.officeHoursID = this.id;
  //   teachingAssistant.breakoutRoomID = breakoutRoomAreaID;
  //   return question;
  // }

  /**
   * Removes an existing question from the queue if the player is the a TA.
   */
  public removeQuestion(teachingAssistant: Player, questionID: string) {
    const question = this.getQuestion(questionID);
    if (question && isTA(teachingAssistant)) {
      this._queue = this._queue.filter(q => q.id !== questionID);
    }
  }

  // TODO unused, remove?
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
    return new OfficeHoursArea(
      {
        id: mapObject.name,
        officeHoursActive: false,
        teachingAssistantsByID: [],
        questionTypes: ['any'],
        taInfos: [],
      },
      box,
      townEmitter,
    );
  }

  /**
   * Assigns the next question in the queue to the ta and removes it
   */
  private _nextQuestion(teachingAssistant: TA): Question | undefined {
    // TODO: update to use new question queue structure
    const question = this._queue.shift();
    if (question) {
      teachingAssistant.currentQuestion = question;
    }
    this._emitQueueChanged();
    return question;
  }

  private _getOpenBreakoutRoom(): string | undefined {
    for (const [areaID, ta] of this._openBreakoutRooms) {
      if (!ta) {
        return areaID;
      }
    }
    return undefined;
  }

  private _assignBreakoutRoom(taID: string, breakoutRoomID: string) {
    if (this._openBreakoutRooms.get(breakoutRoomID)) {
      throw new Error('Attempted to assign busy breakout room');
    }
    this._openBreakoutRooms.set(breakoutRoomID, taID);
  }

  protected _emitQueueChanged() {
    this._townEmitter.emit('officeHoursQueueUpdate', this.toQueueModel());
  }
}
