import assert from 'assert';
import {
  Body,
  Controller,
  Delete,
  Example,
  Get,
  Header,
  Patch,
  Path,
  Post,
  Response,
  Route,
  Tags,
} from 'tsoa';

import { nanoid } from 'nanoid';
import { Town, TownCreateParams, TownCreateResponse } from '../api/Model';
import InvalidParametersError from '../lib/InvalidParametersError';
import CoveyTownsStore from '../lib/TownsStore';
import {
  ConversationArea,
  CoveyTownSocket,
  TownSettingsUpdate,
  ViewingArea,
  PosterSessionArea,
  OfficeHoursArea,
  OfficeHoursQuestion,
  OfficeHoursQueue,
  TAModel,
  XY,
} from '../types/CoveyTownSocket';
import PosterSessionAreaReal from './PosterSessionArea';
import OfficeHoursAreaReal from './OfficeHoursArea';
import BreakoutRoomAreaReal from './BreakoutRoomArea';
import { isBreakoutRoomArea, isOfficeHoursArea, isPosterSessionArea } from '../TestUtils';
import Player from '../lib/Player';
import InvalidTAPasswordError from '../lib/InvalidTAPasswordError';
import TA, { isTA } from '../lib/TA';

/**
 * This is the town route
 */
@Route('towns')
@Tags('towns')
// TSOA (which we use to generate the REST API from this file) does not support default exports, so the controller can't be a default export.
// eslint-disable-next-line import/prefer-default-export
export class TownsController extends Controller {
  private _townsStore: CoveyTownsStore = CoveyTownsStore.getInstance();

  /**
   * List all towns that are set to be publicly available
   *
   * @returns list of towns
   */
  @Get()
  public async listTowns(): Promise<Town[]> {
    return this._townsStore.getTowns();
  }

  /**
   * Create a new town
   *
   * @param request The public-facing information for the new town
   * @example request {"friendlyName": "My testing town public name", "isPubliclyListed": true}
   * @returns The ID of the newly created town, and a secret password that will be needed to update or delete this town.
   */
  @Example<TownCreateResponse>({ townID: 'stringID', townUpdatePassword: 'secretPassword' })
  @Post()
  public async createTown(@Body() request: TownCreateParams): Promise<TownCreateResponse> {
    const { townID, townUpdatePassword } = await this._townsStore.createTown(
      request.friendlyName,
      request.isPubliclyListed,
      request.taPassword,
      request.mapFile,
    );
    return {
      townID,
      townUpdatePassword,
    };
  }

  /**
   * Updates an existing town's settings by ID
   *
   * @param townID  town to update
   * @param townUpdatePassword  town update password, must match the password returned by createTown
   * @param requestBody The updated settings
   */
  @Patch('{townID}')
  @Response<InvalidParametersError>(400, 'Invalid password or update values specified')
  public async updateTown(
    @Path() townID: string,
    @Header('X-CoveyTown-Password') townUpdatePassword: string,
    @Body() requestBody: TownSettingsUpdate,
  ): Promise<void> {
    const success = this._townsStore.updateTown(
      townID,
      townUpdatePassword,
      requestBody.friendlyName,
      requestBody.isPubliclyListed,
    );
    if (!success) {
      throw new InvalidParametersError('Invalid password or update values specified');
    }
  }

  /**
   * Deletes a town
   * @param townID ID of the town to delete
   * @param townUpdatePassword town update password, must match the password returned by createTown
   */
  @Delete('{townID}')
  @Response<InvalidParametersError>(400, 'Invalid password or update values specified')
  public async deleteTown(
    @Path() townID: string,
    @Header('X-CoveyTown-Password') townUpdatePassword: string,
  ): Promise<void> {
    const success = this._townsStore.deleteTown(townID, townUpdatePassword);
    if (!success) {
      throw new InvalidParametersError('Invalid password or update values specified');
    }
  }

  /**
   * Creates a conversation area in a given town
   * @param townID ID of the town in which to create the new conversation area
   * @param sessionToken session token of the player making the request, must match the session token returned when the player joined the town
   * @param requestBody The new conversation area to create
   */
  @Post('{townID}/conversationArea')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async createConversationArea(
    @Path() townID: string,
    @Header('X-Session-Token') sessionToken: string,
    @Body() requestBody: ConversationArea,
  ): Promise<void> {
    const town = this._townsStore.getTownByID(townID);
    if (!town?.getPlayerBySessionToken(sessionToken)) {
      throw new InvalidParametersError('Invalid values specified');
    }
    const success = town.addConversationArea(requestBody);
    if (!success) {
      throw new InvalidParametersError('Invalid values specified');
    }
  }

  /**
   * Creates a viewing area in a given town
   *
   * @param townID ID of the town in which to create the new viewing area
   * @param sessionToken session token of the player making the request, must
   *        match the session token returned when the player joined the town
   * @param requestBody The new viewing area to create
   *
   * @throws InvalidParametersError if the session token is not valid, or if the
   *          viewing area could not be created
   */
  @Post('{townID}/viewingArea')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async createViewingArea(
    @Path() townID: string,
    @Header('X-Session-Token') sessionToken: string,
    @Body() requestBody: ViewingArea,
  ): Promise<void> {
    const town = this._townsStore.getTownByID(townID);
    if (!town) {
      throw new InvalidParametersError('Invalid values specified');
    }
    if (!town?.getPlayerBySessionToken(sessionToken)) {
      throw new InvalidParametersError('Invalid values specified');
    }
    const success = town.addViewingArea(requestBody);
    if (!success) {
      throw new InvalidParametersError('Invalid values specified');
    }
  }

  /**
   * Creates a poster session area in a given town
   *
   * @param townID ID of the town in which to create the new poster session area
   * @param sessionToken session token of the player making the request, must
   *        match the session token returned when the player joined the town
   * @param requestBody The new poster session area to create
   *
   * @throws InvalidParametersError if the session token is not valid, or if the
   *          poster session area could not be created
   */
  @Post('{townID}/posterSessionArea')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async createPosterSessionArea(
    @Path() townID: string,
    @Header('X-Session-Token') sessionToken: string,
    @Body() requestBody: PosterSessionArea,
  ): Promise<void> {
    // download file here TODO
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    if (!curTown.getPlayerBySessionToken(sessionToken)) {
      throw new InvalidParametersError('Invalid session ID');
    }
    // add viewing area to the town, throw error if it fails
    if (!curTown.addPosterSessionArea(requestBody)) {
      throw new InvalidParametersError('Invalid poster session area');
    }
  }

  /**
   * Gets the image contents of a given poster session area in a given town
   *
   * @param townID ID of the town in which to get the poster session area image contents
   * @param posterSessionId interactable ID of the poster session
   * @param sessionToken session token of the player making the request, must
   *        match the session token returned when the player joined the town
   *
   * @throws InvalidParametersError if the session token is not valid, or if the
   *          poster session specified does not exist
   */
  @Patch('{townID}/{posterSessionId}/imageContents')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async getPosterAreaImageContents(
    @Path() townID: string,
    @Path() posterSessionId: string,
    @Header('X-Session-Token') sessionToken: string,
  ): Promise<string | undefined> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    if (!curTown.getPlayerBySessionToken(sessionToken)) {
      throw new InvalidParametersError('Invalid session ID');
    }
    const posterSessionArea = curTown.getInteractable(posterSessionId);
    if (!posterSessionArea || !isPosterSessionArea(posterSessionArea)) {
      throw new InvalidParametersError('Invalid poster session ID');
    }
    return posterSessionArea.imageContents;
  }

  /**
   * Increment the stars of a given poster session area in a given town, as long as there is
   * a poster image. Returns the new number of stars.
   *
   * @param townID ID of the town in which to get the poster session area image contents
   * @param posterSessionId interactable ID of the poster session
   * @param sessionToken session token of the player making the request, must
   *        match the session token returned when the player joined the town
   *
   * @throws InvalidParametersError if the session token is not valid, or if the
   *          poster session specified does not exist, or if the poster session specified
   *          does not have an image
   */
  @Patch('{townID}/{posterSessionId}/incStars')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async incrementPosterAreaStars(
    @Path() townID: string,
    @Path() posterSessionId: string,
    @Header('X-Session-Token') sessionToken: string,
  ): Promise<number> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    if (!curTown.getPlayerBySessionToken(sessionToken)) {
      throw new InvalidParametersError('Invalid session ID');
    }
    const posterSessionArea = curTown.getInteractable(posterSessionId);
    if (!posterSessionArea || !isPosterSessionArea(posterSessionArea)) {
      throw new InvalidParametersError('Invalid poster session ID');
    }
    if (!posterSessionArea.imageContents) {
      throw new InvalidParametersError('Cant star a poster with no image');
    }
    const newStars = posterSessionArea.stars + 1;
    const updatedPosterSessionArea = {
      id: posterSessionArea.id,
      imageContents: posterSessionArea.imageContents,
      title: posterSessionArea.title,
      stars: newStars, // increment stars
    };
    (<PosterSessionAreaReal>posterSessionArea).updateModel(updatedPosterSessionArea);
    return newStars;
  }

  /**
   * Creates an Office Hours Area in a given town.
   *
   * @param townID ID of the town in which to create the new poster session area
   * @param sessionToken session token of the player making the request, must
   *        match the session token returned when the player joined the town
   * @param requestBody The new office hours area to create
   *
   * @throws InvalidParametersError if the session token is not valid, or if the
   *          office hours area could not be created, or if the player is not a TA
   */
  @Post('{townID}/officeHoursArea')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async createOfficeHoursArea(
    @Path() townID: string,
    @Header('X-Session-Token') sessionToken: string,
    @Body() requestBody: OfficeHoursArea,
  ): Promise<void> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    const player = curTown.getPlayerBySessionToken(sessionToken);
    if (!player || !isTA(player)) {
      throw new InvalidParametersError('Invalid session ID');
    }
    // add viewing area to the town, throw error if it fails
    if (!curTown.addOfficeHoursArea(requestBody)) {
      throw new InvalidParametersError('Invalid office hours area ID');
    }
  }

  /**
   * Adds a question to an existing, active OfficeHoursArea in a given town.
   *
   * @param townID ID of the town in which to add or update a question
   * @param officeHoursAreaId ID of the OfficeHoursArea the question belongs to
   * @param sessionToken session token of the player making the request, must
   *        match the session token returned when the player joined the town
   * @param requestBody The question to add or modify
   *
   * @throws InvalidParametersError if the session token is not valid or if the OH Area is not active
   */
  @Patch('{townID}/{officeHoursAreaId}/addQuestion')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async addOfficeHoursQuestion(
    @Path() townID: string,
    @Path() officeHoursAreaId: string,
    @Header('X-Session-Token') sessionToken: string,
    @Body()
    requestBody: {
      questionContent: string;
      groupQuestion: boolean;
      questionType: string;
    },
  ): Promise<OfficeHoursQuestion> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    const curPlayer = curTown.getPlayerBySessionToken(sessionToken);
    if (!curPlayer) {
      throw new InvalidParametersError('Invalid session ID');
    }
    const officeHoursArea = curTown.getInteractable(officeHoursAreaId);
    if (!officeHoursArea || !isOfficeHoursArea(officeHoursArea)) {
      throw new InvalidParametersError('Invalid office hours area ID');
    }
    if (curTown.isStudentsInBreakOutRooms([curPlayer.id])) {
      throw new InvalidParametersError('Student cannot add question when he is in breakout roomt');
    }
    // if (!officeHoursArea.officeHoursActive) {
    //   throw new InvalidParametersError('Cant add a question when no TAs online');
    // }
    // TODO: Check how many questions this student has asked. Limit to 1 for now.
    const newQuestion: OfficeHoursQuestion = {
      id: nanoid(),
      officeHoursID: officeHoursAreaId,
      questionContent: requestBody.questionContent,
      students: [curPlayer.id],
      timeAsked: Date.now(),
      questionType: requestBody.questionType,
      groupQuestion: requestBody.groupQuestion,
    };
    (<OfficeHoursAreaReal>officeHoursArea).addUpdateQuestion(newQuestion);
    return newQuestion;
  }

  /**
   * Joins an existing group question
   * @param townID ID of the town in which to join a question
   * @param officeHoursAreaId ID of the OfficeHoursArea the question belongs to
   * @param sessionToken
   * @param requestBody
   */
  @Patch('{townID}/{officeHoursAreaId}/{questionID}/joinQuestion')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async joinOfficeHoursQuestion(
    @Path() townID: string,
    @Path() officeHoursAreaId: string,
    @Path() questionID: string,
    @Header('X-Session-Token') sessionToken: string,
  ): Promise<OfficeHoursQuestion> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    const player = curTown.getPlayerBySessionToken(sessionToken);
    if (!player) {
      throw new InvalidParametersError('Invalid session ID');
    }
    const officeHoursArea = curTown.getInteractable(officeHoursAreaId);
    if (!officeHoursArea || !isOfficeHoursArea(officeHoursArea)) {
      throw new InvalidParametersError('Invalid office hours area ID');
    }
    if (!officeHoursArea.isActive) {
      throw new InvalidParametersError('Cant join a question when no TAs online');
    }
    const question = (<OfficeHoursAreaReal>officeHoursArea).questionQueue.find(
      q => q.id === questionID,
    );
    if (!question) {
      throw new InvalidParametersError('Invalid office hours question ID');
    }
    question.addStudent(player);
    (<OfficeHoursAreaReal>officeHoursArea).addUpdateQuestion(question.toModel());
    return question.toModel();
  }

  /**
   * Joins an existing group question
   * @param townID ID of the town in which to join a question
   * @param officeHoursAreaId ID of the OfficeHoursArea the question belongs to
   * @param sessionToken
   * @param requestBody
   */
  @Patch('{townID}/{officeHoursAreaId}/leaveQuestion')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async leaveOfficeHoursQuestion(
    @Path() townID: string,
    @Path() officeHoursAreaId: string,
    @Header('X-Session-Token') sessionToken: string,
    @Body() officeHoursQuestionId: string,
  ): Promise<OfficeHoursQuestion> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    const player = curTown.getPlayerBySessionToken(sessionToken);
    if (!player) {
      throw new InvalidParametersError('Invalid session ID');
    }
    const officeHoursArea = curTown.getInteractable(officeHoursAreaId);
    if (!officeHoursArea || !isOfficeHoursArea(officeHoursArea)) {
      throw new InvalidParametersError('Invalid office hours area ID');
    }
    if (!officeHoursArea.isActive) {
      throw new InvalidParametersError('Cant join a question when no TAs online');
    }
    const question = (<OfficeHoursAreaReal>officeHoursArea).questionQueue.find(
      q => q.id === officeHoursQuestionId,
    );
    if (!question) {
      throw new InvalidParametersError('Invalid office hours question ID');
    }
    question.removeStudent(player);
    (<OfficeHoursAreaReal>officeHoursArea).addUpdateQuestion(question.toModel());
    return question.toModel();
  }

  @Patch('{townID}/{officeHoursAreaId}/queue')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async getOfficeHoursQueue(
    @Path() townID: string,
    @Path() officeHoursAreaId: string,
    @Header('X-Session-Token') sessionToken: string,
  ): Promise<OfficeHoursQueue> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    const player = curTown.getPlayerBySessionToken(sessionToken);
    if (!player) {
      throw new InvalidParametersError('Invalid session ID');
    }
    const officeHoursArea = curTown.getInteractable(officeHoursAreaId);
    if (!officeHoursArea || !isOfficeHoursArea(officeHoursArea)) {
      throw new InvalidParametersError('Invalid office hours area ID');
    }
    const officeHoursAreaReal = <OfficeHoursAreaReal>officeHoursArea;
    return officeHoursAreaReal.toQueueModel();
  }

  // @Patch('{townID}/{officeHoursAreaId}/{questionId}/takeQuestion')
  // @Response<InvalidParametersError>(400, 'Invalid values specified')
  // public async takeNextOfficeHoursQuestionWithQuestionID(
  //   @Path() townID: string,
  //   @Path() officeHoursAreaId: string,
  //   @Path() questionId: string,
  //   @Header('X-Session-Token') sessionToken: string,
  // ): Promise<TAModel> {
  //   const curTown = this._townsStore.getTownByID(townID);
  //   if (!curTown) {
  //     throw new InvalidParametersError('Invalid town ID');
  //   }
  //   const curPlayer = curTown.getPlayerBySessionToken(sessionToken);
  //   if (!curPlayer) {
  //     throw new InvalidParametersError('Invalid session ID');
  //   } else if (!isTA(curPlayer)) {
  //     throw new InvalidParametersError('This player is not a TA');
  //   }
  //   const officeHoursArea = curTown.getInteractable(officeHoursAreaId);
  //   if (!officeHoursArea || !isOfficeHoursArea(officeHoursArea)) {
  //     throw new InvalidParametersError('Invalid office hours area ID');
  //   }
  //   if (!(<OfficeHoursAreaReal>officeHoursArea).takeQuestion(curPlayer, questionId)) {
  //     throw new InvalidParametersError('Queue is empty or there are no available breakout rooms');
  //   }
  //   if (!curPlayer.currentQuestions || !curPlayer.breakoutRoomID) {
  //     throw new InvalidParametersError('Queue is empty or there are no available breakout rooms');
  //   }

  //   /* Set TA's location to center of breakout room, used by players for teleporting */
  //   const breakoutRoom = curTown.getInteractable(curPlayer.breakoutRoomID);
  //   const location = (<BreakoutRoomAreaReal>breakoutRoom).areasCenter();
  //   curPlayer.location.x = location.x;
  //   curPlayer.location.y = location.y;
  //   curPlayer.location.interactableID = curPlayer.breakoutRoomID;

  //   // TODO: does addConvo area work for breakout rooms?
  //   const questions = curPlayer.currentQuestions;
  //   let questionType = '';
  //   let studentIDs: string[] = [];
  //   if (questions) {
  //     questionType = questions[0].questionType;
  //     questions.forEach(q => {
  //       studentIDs = studentIDs.concat(q.studentsByID);
  //     });
  //   }
  //   const success = curTown.addConversationArea({
  //     id: curPlayer.breakoutRoomID,
  //     topic: questionType,
  //     occupantsByID: studentIDs.concat(curPlayer.id),
  //   });
  //   if (!success) {
  //     throw new Error('Could not update breakout room');
  //   }

  //   (<OfficeHoursAreaReal>officeHoursArea).roomEmitter.emit(
  //     'officeHoursQuestionTaken',
  //     curPlayer.toModel(),
  //   );
  //   return curPlayer.toModel();
  // }

  @Patch('{townID}/{officeHoursAreaId}/takeQuestions')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async takeNextOfficeHoursQuestionWithQuestionIDs(
    @Path() townID: string,
    @Path() officeHoursAreaId: string,
    @Body() requestBody: { questionIDs: string[]; timeLimit: number | undefined },
    @Header('X-Session-Token') sessionToken: string,
  ): Promise<TAModel> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    const curPlayer = curTown.getPlayerBySessionToken(sessionToken);
    if (!curPlayer) {
      throw new InvalidParametersError('Invalid session ID');
    } else if (!isTA(curPlayer)) {
      throw new InvalidParametersError('This player is not a TA');
    }
    const officeHoursArea = curTown.getInteractable(officeHoursAreaId);
    if (!officeHoursArea || !isOfficeHoursArea(officeHoursArea)) {
      throw new InvalidParametersError('Invalid office hours area ID');
    }
    if (!(<OfficeHoursAreaReal>officeHoursArea).takeQuestions(curPlayer, requestBody.questionIDs)) {
      throw new InvalidParametersError('Queue is empty or there are no available breakout rooms');
    }
    if (!curPlayer.currentQuestions || !curPlayer.breakoutRoomID) {
      throw new InvalidParametersError('Queue is empty or there are no available breakout rooms');
    }

    /* Set TA's location to center of breakout room, used by players for teleporting */
    const breakoutRoom = curTown.getInteractable(curPlayer.breakoutRoomID);
    const location = (<BreakoutRoomAreaReal>breakoutRoom).areasCenter();
    curTown.teleportPlayer(curPlayer, location);
    curPlayer.location.interactableID = curPlayer.breakoutRoomID;

    // TODO: does addConvo area work for breakout rooms?
    const questions = curPlayer.currentQuestions;
    let questionType = '';
    let studentIDs: string[] = [];
    if (questions) {
      questionType = questions[0].questionType;
      questions.forEach(q => {
        studentIDs = studentIDs.concat(q.studentsByID);
      });
    }
    curTown.addStudentsToBreakOutRooms(studentIDs);
    const success = curTown.addBreakoutRoomArea({
      id: curPlayer.breakoutRoomID,
      topic: questionType,
      teachingAssistantID: curPlayer.id,
      studentsByID: studentIDs,
      linkedOfficeHoursID: officeHoursAreaId,
      timeLeft: requestBody.timeLimit, // actually used
    });
    if (!success) {
      throw new Error('Could not update breakout room');
    }

    (<OfficeHoursAreaReal>officeHoursArea).roomEmitter.emit(
      'officeHoursQuestionTaken',
      curPlayer.toModel(),
    );
    return curPlayer.toModel();
  }

  @Patch('{townID}/{officeHoursAreaId}/updateModel')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async getUpdatedOfficeHoursModel(
    @Path() townID: string,
    @Path() officeHoursAreaId: string,
    @Header('X-Session-Token') sessionToken: string,
    @Body() requestBody: OfficeHoursArea,
  ): Promise<OfficeHoursArea> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    const curPlayer = curTown.getPlayerBySessionToken(sessionToken);
    if (!curPlayer) {
      throw new InvalidParametersError('Invalid session ID');
    } else if (!isTA(curPlayer)) {
      throw new InvalidParametersError('This player is not a TA');
    }
    const officeHoursArea = curTown.getInteractable(officeHoursAreaId);
    if (!officeHoursArea || !isOfficeHoursArea(officeHoursArea)) {
      throw new InvalidParametersError('Invalid office hours area ID');
    }
    (<OfficeHoursAreaReal>officeHoursArea).updateModel(requestBody);
    return (<OfficeHoursAreaReal>officeHoursArea).toModel();
  }

  @Patch('{townID}/{breakoutRoomAreaId}/finishQuestion')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async closeBreakoutRoomArea(
    @Path() townID: string,
    @Path() breakoutRoomAreaId: string,
    @Header('X-Session-Token') sessionToken: string,
  ): Promise<void> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    const curPlayer = curTown.getPlayerBySessionToken(sessionToken);
    if (!curPlayer) {
      throw new InvalidParametersError('Invalid session ID');
    } else if (!isTA(curPlayer)) {
      throw new InvalidParametersError('This player is not a TA');
    }
    const breakoutRoomArea = curTown.getInteractable(breakoutRoomAreaId);
    if (!breakoutRoomArea || !isBreakoutRoomArea(breakoutRoomArea)) {
      throw new InvalidParametersError('Invalid breakout room area ID');
    }
    // const breakOutRoomAreaReal = <OfficeHoursAreaReal>breakoutRoomArea;

    const officeHoursID = (<BreakoutRoomAreaReal>(<unknown>breakoutRoomArea)).linkedOfficeHoursID;
    const officeHoursArea = curTown.getInteractable(officeHoursID);
    if (!officeHoursArea || !isOfficeHoursArea(officeHoursArea)) {
      throw new Error('Could not find associated Office Hours Area');
    }
    curTown.removeStudentsFromBreakOutRooms(breakoutRoomArea.studentsByID);
    /* Moves the TA back to the office hours area, used by students for teleporting */
    const officeHoursAreaReal = <OfficeHoursAreaReal>officeHoursArea;

    officeHoursAreaReal.roomEmitter.emit('officeHoursQuestionTaken', curPlayer.toModel());

    const location = officeHoursAreaReal.areasCenter();
    curTown.teleportPlayer(curPlayer, location);
    // TODO: move this out of REST api!!!!
    officeHoursAreaReal.stopOfficeHours(curPlayer);
    curTown.closeBreakOutRoom(breakoutRoomAreaId);
    // curTown.removeBreakOutRoomArea(breakoutRoomAreaId);
  }

  @Patch('{townID}/{officeHoursAreaId}/{questionID}/removeQuestion')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async removeOfficeHoursQuestion(
    @Path() townID: string,
    @Path() officeHoursAreaId: string,
    @Path() questionID: string,
    @Header('X-Session-Token') sessionToken: string,
  ): Promise<OfficeHoursArea> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    const curPlayer = curTown.getPlayerBySessionToken(sessionToken);
    if (!curPlayer) {
      throw new InvalidParametersError('Invalid session ID');
    } else if (!isTA(curPlayer)) {
      throw new InvalidParametersError('This player is not a TA');
    }
    const officeHoursArea = curTown.getInteractable(officeHoursAreaId);
    if (!officeHoursArea || !isOfficeHoursArea(officeHoursArea)) {
      throw new InvalidParametersError('Invalid office hours area ID');
    }
    (<OfficeHoursAreaReal>officeHoursArea).removeQuestion(curPlayer, questionID);
    return (<OfficeHoursAreaReal>officeHoursArea).toModel();
  }

  @Patch('{townID}/{officeHoursAreaId}/removeQuestionForPlayer')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async removeOfficeHoursQuestionForPlayer(
    @Path() townID: string,
    @Path() officeHoursAreaId: string,
    @Header('X-Session-Token') sessionToken: string,
  ): Promise<OfficeHoursArea> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    const curPlayer = curTown.getPlayerBySessionToken(sessionToken);
    if (!curPlayer) {
      throw new InvalidParametersError('Invalid session ID');
    }
    const officeHoursArea = curTown.getInteractable(officeHoursAreaId);
    if (!officeHoursArea || !isOfficeHoursArea(officeHoursArea)) {
      throw new InvalidParametersError('Invalid office hours area ID');
    }
    (<OfficeHoursAreaReal>officeHoursArea).removeQuestionForPlayer(curPlayer);
    return (<OfficeHoursAreaReal>officeHoursArea).toModel();
  }

  /**
   * Connects a client's socket to the requested town, or disconnects the socket if no such town exists
   *
   * @param socket A new socket connection, with the userName and townID parameters of the socket's
   * auth object configured with the desired townID to join and username to use
   *
   */
  public async joinTown(socket: CoveyTownSocket) {
    // Parse the client's requested username from the connection
    const { userName, townID, taPassword } = socket.handshake.auth as {
      userName: string;
      townID: string;
      // TODO implement password enter on the frontend
      taPassword: string;
    };

    const town = this._townsStore.getTownByID(townID);
    if (!town) {
      socket.disconnect(true);
      return;
    }

    // Connect the client to the socket.io broadcast room for this town
    socket.join(town.townID);

    // add players with the entered ta passward or undefined if none
    let newPlayer: Player;
    try {
      newPlayer = await town.addPlayer(userName, socket, taPassword);
    } catch (e) {
      if (e instanceof InvalidTAPasswordError) {
        // TODO Toast that ta password is invalid
      } else {
        // TODO Toast that a BAD error occurrd
      }
      // return if error
      return;
    }
    assert(newPlayer.videoToken);
    socket.emit('initialize', {
      userID: newPlayer.id,
      sessionToken: newPlayer.sessionToken,
      providerVideoToken: newPlayer.videoToken,
      currentPlayers: town.players.map(eachPlayer => eachPlayer.toPlayerModel()),
      friendlyName: town.friendlyName,
      isPubliclyListed: town.isPubliclyListed,
      interactables: town.interactables.map(eachInteractable => eachInteractable.toModel()),
    });
  }
}
