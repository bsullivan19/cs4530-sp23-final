import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { readFileSync } from 'fs';
import {
  Interactable,
  TownEmitter,
  OfficeHoursArea as OfficeHoursModel,
} from '../types/CoveyTownSocket';
import TownsStore from '../lib/TownsStore';
import { getLastEmittedEvent, mockPlayer, MockedPlayer, isOfficeHoursArea } from '../TestUtils';
import { TownsController } from './TownsController';
import OfficeHoursArea from './OfficeHoursArea';
import { request } from 'http';
import Question from '../lib/Question';

type TestTownData = {
  friendlyName: string;
  townID: string;
  isPubliclyListed: boolean;
  townUpdatePassword: string;
};

const broadcastEmitter = jest.fn();
describe('TownsController integration tests', () => {
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
      describe('Interact with existing Poster Session Area', () => {
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
        describe('takeNextOfficeHoursQuestion', () => {
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
        //   it('[OMG3 imageContents] Gets the image contents of a office hours area', async () => {
        //     const officeHoursArea = interactables.find(isOfficeHoursArea) as OfficeHoursArea;
        //     if (!officeHoursArea) {
        //       fail('Expected at least one office hours area to be returned in the initial join data');
        //     } else {
        //       const newOfficeHoursArea = {
        //         id: officeHoursArea.id,
        //         stars: 0,
        //         title: 'Test title',
        //         imageContents: readFileSync('testData/poster.jpg', 'utf-8'),
        //       };
        //       await controller.createOfficeHoursArea(
        //         testingTown.townID,
        //         sessionToken,
        //         newOfficeHoursArea,
        //       );
        //       const imageContents = await controller.getPosterAreaImageContents(
        //         testingTown.townID,
        //         officeHoursArea.id,
        //         sessionToken,
        //       );
        //       expect(imageContents).toEqual(newOfficeHoursArea.imageContents);
        //     }
        //   });
      });
    });
  });
});
