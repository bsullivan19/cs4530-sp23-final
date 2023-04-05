import {
  Player as PlayerModel,
  PlayerLocation,
  TAModel,
  TownEmitter,
} from '../types/CoveyTownSocket';
import Player from './Player';
import Question from './Question';

// Returns true if player is a TA and false if not
export function isTA(player: Player): player is TA {
  return 'currentQuestion' in player;
}

export default class TA extends Player {
  // The current question this TA is answering
  private _currrentQuestion?: Question;

  // Location of this TAs breakout room
  private _breakoutRoomID?: string;

  // ID of the office hours interactable this TA is apart of
  private _officeHoursID?: string;

  set currentQuestion(currentQuestion: Question | undefined) {
    this._currrentQuestion = currentQuestion;
  }

  get currentQuestion(): Question | undefined {
    return this._currrentQuestion;
  }

  set breakoutRoomID(breakoutRoomID: string | undefined) {
    this._breakoutRoomID = breakoutRoomID;
  }

  get breakoutRoomID(): string | undefined {
    return this._breakoutRoomID;
  }

  set officeHoursID(breakoutRoomLoc: string | undefined) {
    this._officeHoursID = breakoutRoomLoc;
  }

  get officeHoursID(): string | undefined {
    return this._officeHoursID;
  }

  constructor(userName: string, townEmitter: TownEmitter) {
    super(userName, townEmitter);
    this._breakoutRoomID = undefined;
  }

  toModel(): TAModel {
    return {
      id: this._id,
      location: this.location,
      userName: this.userName,
      question: this._currrentQuestion?.toModel(),
      breakoutRoomID: this._breakoutRoomID,
    };
  }
}
