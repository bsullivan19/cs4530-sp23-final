import { ITiledMapObject } from '@jonbell/tiled-map-type-guard';
import Player from '../lib/Player';
import {
  BoundingBox,
  BreakoutRoomArea as BreakoutRoomAreaModel,
  TownEmitter,
} from '../types/CoveyTownSocket';
import ConversationArea from './ConversationArea';

export default class BreakoutRoomArea extends ConversationArea {
  // TODO add office hours area id link
  private readonly _linkedOfficeHoursID: string;

  public get linkedOfficeHoursID(): string {
    return this._linkedOfficeHoursID;
  }

  /**
   * Creates a new BreakoutRoomArea
   *
   * @param BreakoutRoomModel model containing this area's current topic and its ID
   * @param coordinates  the bounding box that defines this conversation area
   * @param townEmitter a broadcast emitter that can be used to emit updates to players
   */
  public constructor(
    areaModel: BreakoutRoomAreaModel,
    coordinates: BoundingBox,
    townEmitter: TownEmitter,
    linkedOfficeHoursID: string,
  ) {
    super(areaModel, coordinates, townEmitter);
    this._linkedOfficeHoursID = linkedOfficeHoursID;
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
  }

  /**
   * Convert this BreakoutRoomArea instance to a simple BreakoutRoomAreaModel suitable for
   * transporting over a socket to a client.
   */
  public toModel(): BreakoutRoomAreaModel {
    return {
      id: this.id,
      occupantsByID: this.occupantsByID,
      topic: this.topic,
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
    const officeHoursProp = mapObject.properties?.find(prop => prop.name === 'linkedOfficeHoursID')
    if (!officeHoursProp) {
      throw new Error('no linkedOfficeHoursID property');
    }
    const officeHoursIDVal: string = officeHoursProp.value as string;
    if (!officeHoursIDVal) {
      throw new Error('no linkedOfficeHoursID value');
    }
    return new BreakoutRoomArea(
      { id: name, occupantsByID: [] },
      rect,
      broadcastEmitter,
      officeHoursIDVal,
    );
  }
}
