import { mock, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { ITiledMap, ITiledMapObject } from '@jonbell/tiled-map-type-guard';
import Player from '../lib/Player';
import { getLastEmittedEvent } from '../TestUtils';
import { TownEmitter } from '../types/CoveyTownSocket';
import BreakoutRoomArea from './BreakoutRoomArea';

describe('BreakoutRoomArea', () => {
  const testAreaBox = { x: 100, y: 100, width: 100, height: 100 };
  let testArea: BreakoutRoomArea;
  const townEmitter = mock<TownEmitter>();
  const topic = nanoid();
  const id = nanoid();
  const oid = nanoid();
  let newPlayer: Player;

  beforeEach(() => {
    mockClear(townEmitter);
    testArea = new BreakoutRoomArea(
      { id, studentsByID: [], topic, linkedOfficeHoursID: oid },
      testAreaBox,
      townEmitter,
    );
    newPlayer = new Player(nanoid(), mock<TownEmitter>());
    testArea.add(newPlayer);
  });
  // delete these tests? We don't use the sockets in backend
  // describe('add', () => {
  //   it('Adds the player to the occupants list and emits an interactableUpdate event', () => {
  //     expect(testArea.occupantsByID).toEqual([newPlayer.id]);
  //
  //     const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
  //     expect(lastEmittedUpdate).toEqual({id: id, studentsByID: [newPlayer.id], topic: topic, linkedOfficeHoursID: oid});
  //   });
  //   it("Sets the player's conversationLabel and emits an update for their location", () => {
  //     expect(newPlayer.location.interactableID).toEqual(id);
  //
  //     const lastEmittedMovement = getLastEmittedEvent(townEmitter, 'playerMoved');
  //     expect(lastEmittedMovement.location.interactableID).toEqual(id);
  //   });
  // });
  // describe('remove', () => {
  //   it('Removes the player from the list of occupants and emits an interactableUpdate event', () => {
  //     // Add another player so that we are not also testing what happens when the last player leaves
  //     const extraPlayer = new Player(nanoid(), mock<TownEmitter>());
  //     testArea.add(extraPlayer);
  //     testArea.remove(newPlayer);
  //
  //     expect(testArea.occupantsByID).toEqual([extraPlayer.id]);
  //     const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
  //     expect(lastEmittedUpdate).toEqual({ topic, id, occupantsByID: [extraPlayer.id] });
  //   });
  //   it("Clears the player's conversationLabel and emits an update for their location", () => {
  //     testArea.remove(newPlayer);
  //     expect(newPlayer.location.interactableID).toBeUndefined();
  //     const lastEmittedMovement = getLastEmittedEvent(townEmitter, 'playerMoved');
  //     expect(lastEmittedMovement.location.interactableID).toBeUndefined();
  //   });
  //   it('Clears the topic of the conversation area when the last occupant leaves', () => {
  //     testArea.remove(newPlayer);
  //     const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
  //     expect(lastEmittedUpdate).toEqual({ topic: undefined, id, occupantsByID: [] });
  //     expect(testArea.topic).toBeUndefined();
  //   });
  // });
  test('toModel sets the ID, topic and occupantsByID and sets no other properties', () => {
    const model = testArea.toModel();
    expect(model).toEqual({ id, studentsByID: [], topic, linkedOfficeHoursID: oid });
  });
  describe('fromMapObject', () => {
    it('Throws an error if the width or height are missing', () => {
      expect(() =>
        BreakoutRoomArea.fromMapObject(
          { id: 1, name: nanoid(), visible: true, x: 0, y: 0 },
          townEmitter,
        ),
      ).toThrowError();
    });
    it('Creates a new conversation area using the provided boundingBox and id, with an empty occupants list, and correct office hours link', () => {
      const x = 30;
      const y = 20;
      const width = 10;
      const height = 20;
      const name = 'name';
      const linkedOfficeHours = nanoid();
      const map: ITiledMapObject = {
        x,
        y,
        width,
        height,
        name,
        id: 10,
        visible: true,
      };
      map.properties = [
        {
          value: linkedOfficeHours,
          propertytype: nanoid(),
          type: 'string',
          name: 'linkedOfficeHoursID',
        },
      ];
      const val = BreakoutRoomArea.fromMapObject(map, townEmitter);
      expect(val.boundingBox).toEqual({ x, y, width, height });
      expect(val.id).toEqual(name);
      expect(val.topic).toBeUndefined();
      expect(val.occupantsByID).toEqual([]);
      expect(val.linkedOfficeHoursID).toEqual(linkedOfficeHours);
    });
  });
});
