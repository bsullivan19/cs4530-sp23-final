import { ITiledMapObject } from '@jonbell/tiled-map-type-guard';
import Player from '../lib/Player';
import {
  BoundingBox,
  // Use conversation area representation as a breakot room model.
  // No special frontend functionallity needed.
  BreakoutRoomArea as BreakoutRoomAreaModel,
  TownEmitter,
} from '../types/CoveyTownSocket';
import { isTA } from '../lib/TA';
import InteractableArea from './InteractableArea';
import Question from '../lib/Question';

export default class BreakoutRoomArea extends InteractableArea {
  public _topic: string | undefined;

  public _teachingAssistant: Player | undefined;

  public _students: Player[] = [];

  public _timeLeft: undefined | number = undefined;

  public _interval: undefined | NodeJS.Timer = undefined;

  private readonly _linkedOfficeHoursID: string;

  public override get isActive(): boolean {
    return this._teachingAssistant !== undefined;
  }

  public get topic() {
    return this._topic;
  }

  public set topic(newTopic: string | undefined) {
    if (this.topic !== newTopic) {
      this._topic = newTopic;
      this._emitAreaChanged();
    }
  }

  public get teachingAssistant() {
    return this._teachingAssistant;
  }

  public set teachingAssistant(p: Player | undefined) {
    this._teachingAssistant = p;
  }

  public get linkedOfficeHoursID(): string {
    return this._linkedOfficeHoursID;
  }

  public get studentsByID() {
    return this._students.map(s => s.id);
  }

  /**
   * Creates a new BreakoutRoomArea
   *
   * @param BreakoutRoomModel model containing this area's current topic and its ID
   * @param coordinates  the bounding box that defines this conversation area
   * @param townEmitter a broadcast emitter that can be used to emit updates to players
   */
  public constructor(
    { id, linkedOfficeHoursID: officeHoursAreaID, topic }: BreakoutRoomAreaModel,
    coordinates: BoundingBox,
    townEmitter: TownEmitter,
  ) {
    super(id, coordinates, townEmitter);
    this._linkedOfficeHoursID = officeHoursAreaID;
    this._topic = topic;
  }

  /**
   * Removes a player from this conversation area.
   *
   * Extends the base behavior of InteractableArea to set the topic of this BreakoutRoomArea to undefined and
   * emit an update to other players in the town when the last player leaves.
   *
   * @param player
   */
  public remove(player: Player) {
    super.remove(player);
    this._students = this._students.filter(s => s.id !== player.id);
    if (player.id === this.teachingAssistant?.id) {
      this._teachingAssistant = undefined;
      this._emitAreaChanged();
    }
  }

  public startTimer(startTime: number) {
    this.stopTimer();
    this._timeLeft = startTime;
    this._interval = setInterval(() => {
      if (this._timeLeft !== undefined) {
        this._timeLeft -= 1000;
        this._townEmitter.emit('breakOutRoomUpdate', this.toModel());
        if (this._timeLeft <= 0) {
          this.stopTimer();
        }
      }
    }, 1000);
  }

  public stopTimer() {
    clearInterval(this._interval);
    this._interval = undefined;
  }

  /**
   * Convert this BreakoutRoomArea instance to a simple BreakoutRoomAreaModel suitable for
   * transporting over a socket to a client.
   */
  public toModel(): BreakoutRoomAreaModel {
    return {
      id: this.id,
      topic: this.topic,
      teachingAssistantID: this.teachingAssistant?.id,
      studentsByID: this.studentsByID,
      linkedOfficeHoursID: this._linkedOfficeHoursID,
      timeLeft: this._timeLeft,
    };
  }

  /**
   * Creates a new BreakoutRoomArea object that will represent a BreakoutRoom Area object in the town map.
   * @param mapObject An ITiledMapObject that represents a rectangle in which this conversation area exists
   * @param broadcastEmitter An emitter that can be used by this conversation area to broadcast updates
   * @returns
   */
  public static fromMapObject(
    mapObject: ITiledMapObject,
    broadcastEmitter: TownEmitter,
  ): BreakoutRoomArea {
    const { name, width, height } = mapObject;
    if (!width || !height) {
      throw new Error(`Malformed viewing area ${name}`);
    }
    const rect: BoundingBox = { x: mapObject.x, y: mapObject.y, width, height };

    // Get linked office hours id from ITiledMap
    const officeHoursProp = mapObject.properties?.find(prop => prop.name === 'linkedOfficeHoursID');
    if (!officeHoursProp) {
      throw new Error('no linkedOfficeHoursID property');
    }
    const officeHoursIDVal: string = officeHoursProp.value as string;
    if (!officeHoursIDVal) {
      throw new Error('no linkedOfficeHoursID value');
    }
    return new BreakoutRoomArea(
      { id: name, linkedOfficeHoursID: officeHoursIDVal, studentsByID: [], timeLeft: undefined },
      rect,
      broadcastEmitter,
    );
  }
}
