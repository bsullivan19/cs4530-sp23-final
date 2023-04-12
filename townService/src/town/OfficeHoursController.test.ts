import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { readFileSync } from 'fs';
import {
  Interactable,
  TownEmitter,
  OfficeHoursArea as OfficeHoursModel,
  OfficeHoursQuestion,
  OfficeHoursQueue,
  TAInfo,
  BreakoutRoomArea as BreakoutRoomAreaModel,
} from '../types/CoveyTownSocket';
import TownsStore from '../lib/TownsStore';
import {
  getLastEmittedEvent,
  mockPlayer,
  MockedPlayer,
  isOfficeHoursArea,
  isBreakoutRoomArea,
} from '../TestUtils';
import { TownsController } from './TownsController';
import OfficeHoursArea from './OfficeHoursArea';
import Question from '../lib/Question';
import BreakoutRoomArea from './BreakoutRoomArea';

type TestTownData = {
  friendlyName: string;
  townID: string;
  isPubliclyListed: boolean;
  townUpdatePassword: string;
};

const broadcastEmitter = jest.fn();
describe('TownsController integration tests for offie hours functions', () => {
  let controller: TownsController;

  const createdTownEmitters: Map<string, DeepMockProxy<TownEmitter>> = new Map();
  async function createTownForTesting(
    friendlyNameToUse?: string,
    isPublic = false,
    townTaPassword = nanoid(),
  ): Promise<TestTownData> {
    const friendlyName =
      friendlyNameToUse !== undefined
        ? friendlyNameToUse
        : `${isPublic ? 'Public' : 'Private'}TestingTown=${nanoid()}`;
    const ret = await controller.createTown({
      friendlyName,
      isPubliclyListed: isPublic,
      taPassword: townTaPassword,
      mapFile: 'testData/indoors2.json',
    });
    return {
      friendlyName,
      isPubliclyListed: isPublic,
      townID: ret.townID,
      townUpdatePassword: ret.townUpdatePassword,
    };
  }
  function getBroadcastEmitterForTownID(townID: string) {
    const ret = createdTownEmitters.get(townID);
    if (!ret) {
      throw new Error(`Could not find broadcast emitter for ${townID}`);
    }
    return ret;
  }

  beforeAll(() => {
    // Set the twilio tokens to dummy values so that the unit tests can run
    process.env.TWILIO_API_AUTH_TOKEN = 'testing';
    process.env.TWILIO_ACCOUNT_SID = 'ACtesting';
    process.env.TWILIO_API_KEY_SID = 'testing';
    process.env.TWILIO_API_KEY_SECRET = 'testing';
  });

  beforeEach(async () => {
    createdTownEmitters.clear();
    broadcastEmitter.mockImplementation((townID: string) => {
      const mockRoomEmitter = mockDeep<TownEmitter>();
      createdTownEmitters.set(townID, mockRoomEmitter);
      return mockRoomEmitter;
    });
    TownsStore.initializeTownsStore(broadcastEmitter);
    controller = new TownsController();
  });

  describe('Interactables', () => {
    let testingTown: TestTownData;
    let player: MockedPlayer;
    let sessionToken: string;
    let interactables: Interactable[];
    let townTaPassword: string;
    it('Throws an error when creating a new Office Hours area with non TA', async () => {
      townTaPassword = nanoid();
      testingTown = await createTownForTesting(undefined, true, townTaPassword);
      player = mockPlayer(testingTown.townID);
      await controller.joinTown(player.socket);
      const initialData = getLastEmittedEvent(player.socket, 'initialize');
      sessionToken = initialData.sessionToken;
      interactables = initialData.interactables;
      const officeHoursArea = interactables.find(isOfficeHoursArea) as OfficeHoursArea;
      if (!officeHoursArea) {
        fail('Expected at least one office hours area to be returned in the initial join data');
      } else {
        const newOfficeHoursArea: OfficeHoursModel = {
          id: officeHoursArea.id,
          officeHoursActive: false,
          teachingAssistantsByID: [],
          questionTypes: [],
          taInfos: [],
        };
        await expect(
          controller.createOfficeHoursArea(testingTown.townID, sessionToken, newOfficeHoursArea),
        ).rejects.toThrowError();
      }
    });

    describe('Created with TA', () => {
      beforeEach(async () => {
        townTaPassword = nanoid();
        testingTown = await createTownForTesting(undefined, true, townTaPassword);
        player = mockPlayer(testingTown.townID, townTaPassword);
        await controller.joinTown(player.socket);
        const initialData = getLastEmittedEvent(player.socket, 'initialize');
        sessionToken = initialData.sessionToken;
        interactables = initialData.interactables;
      });

      describe('Create Office Hours Area', () => {
        it('Executes without error when creating a new Office Hours area', async () => {
          const officeHoursArea = interactables.find(isOfficeHoursArea) as OfficeHoursArea;
          if (!officeHoursArea) {
            fail('Expected at least one office hours area to be returned in the initial join data');
          } else {
            const newOfficeHoursArea: OfficeHoursModel = {
              id: officeHoursArea.id,
              officeHoursActive: false,
              teachingAssistantsByID: [],
              questionTypes: [],
              taInfos: [],
            };
            await controller.createOfficeHoursArea(
              testingTown.townID,
              sessionToken,
              newOfficeHoursArea,
            );
            // Check to see that the office hours area was successfully updated
            const townEmitter = getBroadcastEmitterForTownID(testingTown.townID);
            const updateMessage = getLastEmittedEvent(townEmitter, 'interactableUpdate');
            if (isOfficeHoursArea(updateMessage)) {
              expect(updateMessage).toEqual(newOfficeHoursArea);
            } else {
              fail(
                'Expected an interactableUpdate to be dispatched with the new office hours area',
              );
            }
          }
        });
        it('Returns an error message if the town ID is invalid', async () => {
          const officeHoursArea = interactables.find(isOfficeHoursArea) as OfficeHoursArea;
          const newOfficeHoursArea: OfficeHoursModel = {
            id: officeHoursArea.id,
            officeHoursActive: false,
            teachingAssistantsByID: [],
            questionTypes: [],
            taInfos: [],
          };
          await expect(
            controller.createOfficeHoursArea(nanoid(), sessionToken, newOfficeHoursArea),
          ).rejects.toThrow();
        });
        it('Checks for a valid session token before creating a office hours area', async () => {
          const invalidSessionToken = nanoid();
          const officeHoursArea = interactables.find(isOfficeHoursArea) as OfficeHoursArea;
          const newOfficeHoursArea: OfficeHoursModel = {
            id: officeHoursArea.id,
            officeHoursActive: false,
            teachingAssistantsByID: [],
            questionTypes: [],
            taInfos: [],
          };
          await expect(
            controller.createOfficeHoursArea(
              testingTown.townID,
              invalidSessionToken,
              newOfficeHoursArea,
            ),
          ).rejects.toThrow();
        });
        it('Returns an error message if addOfficeHoursArea returns false', async () => {
          const officeHoursArea = interactables.find(isOfficeHoursArea) as OfficeHoursArea;
          const newOfficeHoursArea: OfficeHoursModel = {
            id: nanoid(),
            officeHoursActive: false,
            teachingAssistantsByID: [],
            questionTypes: [],
            taInfos: [],
          };
          await expect(
            controller.createOfficeHoursArea(testingTown.townID, sessionToken, newOfficeHoursArea),
          ).rejects.toThrow();
        });
      });
      describe('Interact with existing Office Hours area', () => {
        let officeHoursArea: OfficeHoursArea;
        let newOfficeHoursArea: OfficeHoursModel;

        beforeEach(async () => {
          officeHoursArea = interactables.find(isOfficeHoursArea) as OfficeHoursArea;
          if (!officeHoursArea) {
            fail('Expected at least one office hours area to be returned in the initial join data');
          } else {
            newOfficeHoursArea = {
              id: officeHoursArea.id,
              officeHoursActive: false,
              teachingAssistantsByID: [],
              questionTypes: ['1'],
              taInfos: [],
            };
            await controller.createOfficeHoursArea(
              testingTown.townID,
              sessionToken,
              newOfficeHoursArea,
            );
          }
        });
        describe('addOfficeHoursQuestion', () => {
          it('Properly adds an office hours question', async () => {
            const requestQuestion = {
              questionContent: nanoid(),
              groupQuestion: false,
              questionType: '1',
            };
            const question = await controller.addOfficeHoursQuestion(
              testingTown.townID,
              newOfficeHoursArea.id,
              sessionToken,
              requestQuestion,
            );
            expect(question.officeHoursID).toEqual(newOfficeHoursArea.id);
            expect(question.groupQuestion).toEqual(requestQuestion.groupQuestion);
            expect(question.questionContent).toEqual(requestQuestion.questionContent);
            expect(question.questionType).toEqual(requestQuestion.questionType);
            const lastEmittedUpdate = getLastEmittedEvent(
              getBroadcastEmitterForTownID(testingTown.townID),
              'officeHoursQueueUpdate',
            );
            expect(lastEmittedUpdate).toEqual({
              officeHoursID: newOfficeHoursArea.id,
              questionQueue: [question],
            } as OfficeHoursQueue);
          });
          it('Throws an error if invalid town id', async () => {
            const requestQuestion = {
              questionContent: nanoid(),
              groupQuestion: false,
              questionType: '1',
            };
            await expect(
              controller.addOfficeHoursQuestion(
                nanoid(),
                newOfficeHoursArea.id,
                sessionToken,
                requestQuestion,
              ),
            ).rejects.toThrow();
          });
          it('Throws an error if invalid office hours id', async () => {
            const requestQuestion = {
              questionContent: nanoid(),
              groupQuestion: false,
              questionType: '1',
            };
            await expect(
              controller.addOfficeHoursQuestion(
                testingTown.townID,
                nanoid(),
                sessionToken,
                requestQuestion,
              ),
            ).rejects.toThrow();
          });
          it('Throws an error if invalid session token', async () => {
            const requestQuestion = {
              questionContent: nanoid(),
              groupQuestion: false,
              questionType: '1',
            };
            await expect(
              controller.addOfficeHoursQuestion(
                testingTown.townID,
                newOfficeHoursArea.id,
                nanoid(),
                requestQuestion,
              ),
            ).rejects.toThrow();
          });
        });
        describe('Contains starting questions', () => {
          let ta1: MockedPlayer;
          let ta1Session: string;
          let student1: MockedPlayer;
          let student1Session: string;
          let q1Setup;
          let q1: OfficeHoursQuestion;
          let q2Setup;
          let q2: OfficeHoursQuestion;
          let q3Setup;
          let q3: OfficeHoursQuestion;
          beforeEach(async () => {
            ta1 = mockPlayer(testingTown.townID, townTaPassword);
            await controller.joinTown(player.socket);
            const initialData = getLastEmittedEvent(player.socket, 'initialize');
            ta1Session = initialData.sessionToken;
            q1Setup = {
              questionContent: nanoid(),
              groupQuestion: true,
              questionType: '1',
            };
            q2Setup = {
              questionContent: nanoid(),
              groupQuestion: true,
              questionType: '5',
            };
            q3Setup = {
              questionContent: nanoid(),
              groupQuestion: true,
              questionType: 'type',
            };
            q1 = await controller.addOfficeHoursQuestion(
              testingTown.townID,
              newOfficeHoursArea.id,
              sessionToken,
              q1Setup,
            );
            q2 = await controller.addOfficeHoursQuestion(
              testingTown.townID,
              newOfficeHoursArea.id,
              sessionToken,
              q2Setup,
            );
          });
          describe('joinOfficeHoursQuestion', () => {
            it('Throws an error if invalid town id', async () => {
              await expect(
                controller.joinOfficeHoursQuestion(
                  nanoid(),
                  newOfficeHoursArea.id,
                  q1.id,
                  ta1Session,
                ),
              ).rejects.toThrow();
            });
            it('Throws an error if invalid office hours id', async () => {
              await expect(
                controller.joinOfficeHoursQuestion(testingTown.townID, nanoid(), q1.id, ta1Session),
              ).rejects.toThrow();
            });
            it('Throws an error if invalid session token', async () => {
              const requestQuestion = {
                questionContent: nanoid(),
                groupQuestion: false,
                questionType: '1',
              };
              await expect(
                controller.joinOfficeHoursQuestion(
                  testingTown.townID,
                  newOfficeHoursArea.id,
                  q1.id,
                  nanoid(),
                ),
              ).rejects.toThrow();
            });
            it('Throws an error if invalid office hours id', async () => {
              const requestQuestion = {
                questionContent: nanoid(),
                groupQuestion: false,
                questionType: '1',
              };
              await expect(
                controller.joinOfficeHoursQuestion(
                  testingTown.townID,
                  newOfficeHoursArea.id,
                  nanoid(),
                  ta1Session,
                ),
              ).rejects.toThrow();
            });
            it('Properly joins question', async () => {
              const question = await controller.joinOfficeHoursQuestion(
                testingTown.townID,
                newOfficeHoursArea.id,
                q1.id,
                ta1Session,
              );
              expect(question.students.length).toEqual(2);
              expect(question.questionContent).toEqual(q1.questionContent);
              expect(question.questionType).toEqual(q1.questionType);
              const lastEmittedUpdate = getLastEmittedEvent(
                getBroadcastEmitterForTownID(testingTown.townID),
                'officeHoursQueueUpdate',
              );
              expect(lastEmittedUpdate).toEqual({
                officeHoursID: newOfficeHoursArea.id,
                questionQueue: [q1, q2],
              } as OfficeHoursQueue);
            });
          }); // TODO
          describe('takeOfficeHoursQuestions', () => {
            it('Throws an error if invalid town id', async () => {
              await expect(
                controller.takeOfficeHoursQuestions(
                  nanoid(),
                  newOfficeHoursArea.id,
                  { questionIDs: [q1.id, q2.id] },
                  ta1Session,
                ),
              ).rejects.toThrow('Invalid town ID');
            });
            it('Throws an error if invalid office hours id', async () => {
              await expect(
                controller.takeOfficeHoursQuestions(
                  testingTown.townID,
                  nanoid(),
                  { questionIDs: [q1.id, q2.id] },
                  ta1Session,
                ),
              ).rejects.toThrow();
            });
            it('Throws an error if invalid session token', async () => {
              await expect(
                controller.takeOfficeHoursQuestions(
                  testingTown.townID,
                  newOfficeHoursArea.id,
                  { questionIDs: [q1.id, q2.id] },
                  nanoid(),
                ),
              ).rejects.toThrow('Invalid session ID');
            });
            it('Throws an error if not a TA', async () => {
              const student = mockPlayer(testingTown.townID, nanoid());
              await controller.joinTown(student.socket);
              const intiData = getLastEmittedEvent(student.socket, 'initialize');
              await expect(
                controller.takeOfficeHoursQuestions(
                  testingTown.townID,
                  newOfficeHoursArea.id,
                  { questionIDs: [q1.id, q2.id] },
                  intiData.sessionToken,
                ),
              ).rejects.toThrow();
            });
            it('Throws an error if any questions do not exist', async () => {
              const requestQuestion = {
                questionContent: nanoid(),
                groupQuestion: false,
                questionType: '1',
              };
              await expect(
                controller.takeOfficeHoursQuestions(
                  testingTown.townID,
                  newOfficeHoursArea.id,
                  { questionIDs: [nanoid()] },
                  nanoid(),
                ),
              ).rejects.toThrow();
            });
            it('Properly takes questions', async () => {
              const taReturn = await controller.takeOfficeHoursQuestions(
                testingTown.townID,
                newOfficeHoursArea.id,
                { questionIDs: [q1.id, q2.id] },
                sessionToken,
              );
              expect(taReturn.breakoutRoomID).toEqual('Breakout1');
              expect(taReturn.questions).toEqual([q1, q2]);
              expect(taReturn.userName).toEqual('TA: '.concat(player.userName));
              const lastEmittedUpdate = getLastEmittedEvent(
                getBroadcastEmitterForTownID(testingTown.townID),
                'officeHoursQuestionTaken',
              );
              expect(lastEmittedUpdate.userName).toEqual('TA: '.concat(player.userName));
              expect(lastEmittedUpdate.questions).toEqual([q1, q2]);
              expect(lastEmittedUpdate.breakoutRoomID).toEqual('Breakout1');
            });
          });
          describe('getUpdatedOfficeHoursModel', () => {
            it('Throws an error if invalid town id', async () => {
              const updatedModel = newOfficeHoursArea;
              updatedModel.questionTypes = ['type1', 'type2'];
              updatedModel.teachingAssistantsByID = [nanoid()];
              updatedModel.taInfos = [
                {
                  taID: nanoid(),
                  isSorted: true,
                  priorities: [],
                } as TAInfo,
              ];
              updatedModel.officeHoursActive = true;
              await expect(
                controller.getUpdatedOfficeHoursModel(
                  nanoid(),
                  newOfficeHoursArea.id,
                  sessionToken,
                  updatedModel,
                ),
              ).rejects.toThrow();
            });
            it('Throws an error if invalid office hours id', async () => {
              const updatedModel = newOfficeHoursArea;
              updatedModel.questionTypes = ['type1', 'type2'];
              updatedModel.teachingAssistantsByID = [nanoid()];
              updatedModel.taInfos = [
                {
                  taID: nanoid(),
                  isSorted: true,
                  priorities: [],
                } as TAInfo,
              ];
              updatedModel.officeHoursActive = true;
              await expect(
                controller.getUpdatedOfficeHoursModel(
                  testingTown.townID,
                  nanoid(),
                  sessionToken,
                  updatedModel,
                ),
              ).rejects.toThrow();
            });
            it('Throws an error if invalid session token', async () => {
              const updatedModel = newOfficeHoursArea;
              updatedModel.questionTypes = ['type1', 'type2'];
              updatedModel.teachingAssistantsByID = [nanoid()];
              updatedModel.taInfos = [
                {
                  taID: nanoid(),
                  isSorted: true,
                  priorities: [],
                } as TAInfo,
              ];
              updatedModel.officeHoursActive = true;
              await expect(
                controller.getUpdatedOfficeHoursModel(
                  testingTown.townID,
                  newOfficeHoursArea.id,
                  nanoid(),
                  updatedModel,
                ),
              ).rejects.toThrow();
            });
            it('Properly updates and gets office hours model', async () => {
              const updatedModel = newOfficeHoursArea;
              updatedModel.questionTypes = ['type1', 'type2'];
              updatedModel.teachingAssistantsByID = [nanoid()];
              updatedModel.taInfos = [
                {
                  taID: nanoid(),
                  isSorted: true,
                  priorities: [],
                } as TAInfo,
              ];
              updatedModel.officeHoursActive = true;
              const question = await controller.getUpdatedOfficeHoursModel(
                testingTown.townID,
                newOfficeHoursArea.id,
                sessionToken,
                updatedModel,
              );
              expect(question).toEqual(updatedModel);
              const lastEmittedUpdate = getLastEmittedEvent(
                getBroadcastEmitterForTownID(testingTown.townID),
                'interactableUpdate',
              );
              expect(lastEmittedUpdate).toEqual(updatedModel);
            });
          });
          describe('closeBreakoutRoomArea', () => {
            let bRoomArea: BreakoutRoomAreaModel;
            beforeEach(() => {
              const found = interactables.find(isBreakoutRoomArea);
              if (found) {
                bRoomArea = found;
              }
              if (
                bRoomArea.id !== 'Breakout1' ||
                bRoomArea.linkedOfficeHoursID !== officeHoursArea.id
              ) {
                fail('invalid breakout room');
              }
            });
            it('Throws an error if invalid town id', async () => {
              await expect(
                controller.closeBreakoutRoomArea(nanoid(), bRoomArea.id, sessionToken),
              ).rejects.toThrow('Invalid town ID');
            });
            it('Throws an error if invalid breakout room id', async () => {
              await expect(
                controller.closeBreakoutRoomArea(testingTown.townID, nanoid(), sessionToken),
              ).rejects.toThrow();
            });
            it('Throws an error if invalid session token', async () => {
              await expect(
                controller.closeBreakoutRoomArea(testingTown.townID, bRoomArea.id, nanoid()),
              ).rejects.toThrow('Invalid session ID');
            });
            it('Throws an error if not a TA', async () => {
              const student = mockPlayer(testingTown.townID, nanoid());
              await controller.joinTown(student.socket);
              const intiData = getLastEmittedEvent(student.socket, 'initialize');
              await expect(
                controller.closeBreakoutRoomArea(
                  testingTown.townID,
                  bRoomArea.id,
                  intiData.sessionToken,
                ),
              ).rejects.toThrow('This player is not a TA');
            });
            it('Properly closes breakout room area', async () => {
              await controller.takeOfficeHoursQuestions(
                testingTown.townID,
                newOfficeHoursArea.id,
                { questionIDs: [q1.id, q2.id] },
                ta1Session,
              );
              let lastEmittedUpdate = getLastEmittedEvent(
                getBroadcastEmitterForTownID(testingTown.townID),
                'officeHoursQuestionTaken',
              );
              expect(lastEmittedUpdate.breakoutRoomID).toEqual('Breakout1');
              expect(lastEmittedUpdate.questions).toEqual([q1, q2]);
              controller.closeBreakoutRoomArea(testingTown.townID, bRoomArea.id, ta1Session);
              lastEmittedUpdate = getLastEmittedEvent(
                getBroadcastEmitterForTownID(testingTown.townID),
                'officeHoursQuestionTaken',
              );
              expect(lastEmittedUpdate.breakoutRoomID).toEqual(undefined);
              expect(lastEmittedUpdate.questions).toEqual([q1, q2]);
            });
          });
          describe('removeOfficeHoursQuestion', () => {
            it('Throws an error if invalid town id', async () => {
              await expect(
                controller.removeOfficeHoursQuestion(
                  nanoid(),
                  newOfficeHoursArea.id,
                  q1.id,
                  sessionToken,
                ),
              ).rejects.toThrow('Invalid town ID');
            });
            it('Throws an error if invalid office hours area id', async () => {
              await expect(
                controller.removeOfficeHoursQuestion(
                  testingTown.townID,
                  nanoid(),
                  q1.id,
                  sessionToken,
                ),
              ).rejects.toThrow();
            });
            it('Throws an error if invalid session token', async () => {
              await expect(
                controller.removeOfficeHoursQuestion(
                  testingTown.townID,
                  newOfficeHoursArea.id,
                  q1.id,
                  nanoid(),
                ),
              ).rejects.toThrow('Invalid session ID');
            });
            it('Throws an error if not a TA', async () => {
              const student = mockPlayer(testingTown.townID, nanoid());
              await controller.joinTown(student.socket);
              const intiData = getLastEmittedEvent(student.socket, 'initialize');
              await expect(
                controller.removeOfficeHoursQuestion(
                  testingTown.townID,
                  newOfficeHoursArea.id,
                  q1.id,
                  intiData.sessionToken,
                ),
              ).rejects.toThrow('This player is not a TA');
            });
            it('Properly removes the office hours question', async () => {
              await controller.removeOfficeHoursQuestion(
                testingTown.townID,
                newOfficeHoursArea.id,
                q2.id,
                sessionToken,
              );
              const lastEmittedUpdate = getLastEmittedEvent(
                getBroadcastEmitterForTownID(testingTown.townID),
                'officeHoursQueueUpdate',
              );
              expect(lastEmittedUpdate).toEqual({
                officeHoursID: newOfficeHoursArea.id,
                questionQueue: [q1],
              } as OfficeHoursQueue);
            });
          });
          describe('removeOfficeHoursQuestionForPlayer', () => {
            it('Throws an error if invalid town id', async () => {
              await expect(
                controller.removeOfficeHoursQuestionForPlayer(
                  nanoid(),
                  newOfficeHoursArea.id,
                  sessionToken,
                ),
              ).rejects.toThrow('Invalid town ID');
            });
            it('Throws an error if invalid office hours area id', async () => {
              await expect(
                controller.removeOfficeHoursQuestionForPlayer(
                  testingTown.townID,
                  nanoid(),
                  sessionToken,
                ),
              ).rejects.toThrow();
            });
            it('Throws an error if invalid session token', async () => {
              await expect(
                controller.removeOfficeHoursQuestionForPlayer(
                  testingTown.townID,
                  newOfficeHoursArea.id,
                  nanoid(),
                ),
              ).rejects.toThrow('Invalid session ID');
            });
            it('Properly removes player from the office hours question', async () => {
              await controller.removeOfficeHoursQuestionForPlayer(
                testingTown.townID,
                newOfficeHoursArea.id,
                sessionToken,
              );
              const lastEmittedUpdate = getLastEmittedEvent(
                getBroadcastEmitterForTownID(testingTown.townID),
                'officeHoursQueueUpdate',
              );
              expect(lastEmittedUpdate).toEqual({
                officeHoursID: newOfficeHoursArea.id,
                questionQueue: [q1],
              } as OfficeHoursQueue);
            });
          });
        });
      });
    });
  });
});
