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
  private _breakoutRoomLoc?: PlayerLocation;

  // ID of the office hours interactable this TA is apart of
  private _officeHoursID?: string;

  set currentQuestion(currentQuestion: Question | undefined) {
    this._currrentQuestion = currentQuestion;
  }

  get currentQuestion(): Question | undefined {
    return this._currrentQuestion;
  }

  set breakoutRoomLoc(breakoutRoomLoc: PlayerLocation | undefined) {
    this._breakoutRoomLoc = breakoutRoomLoc;
  }

  get breakoutRoomLoc(): PlayerLocation | undefined {
    return this._breakoutRoomLoc;
  }

  set officeHoursID(breakoutRoomLoc: string | undefined) {
    this._officeHoursID = breakoutRoomLoc;
  }

  get officeHoursID(): string | undefined {
    return this._officeHoursID;
  }

  constructor(userName: string, townEmitter: TownEmitter) {
    super(userName, townEmitter);
    this._breakoutRoomLoc = undefined;
  }

  toModel(): TAModel {
    return {
      id: this._id,
      location: this.location,
      userName: this._userName,
      question: this._currrentQuestion?.toModel(),
    };
  }
}
