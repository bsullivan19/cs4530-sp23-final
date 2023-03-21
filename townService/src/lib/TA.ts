import { Player as PlayerModel, PlayerLocation, TownEmitter } from '../types/CoveyTownSocket';
import Player from './Player';

export type Question = string;

export default class TA extends Player {
  // The current question this TA is answering
  private _currrentQuestion?: Question;

  // If this TA's office hours are open or not
  private _officeHoursOpen: boolean;

  set currentQuestion(currentQuestion: string | undefined) {
    this._currrentQuestion = currentQuestion;
  }

  get currentQuestion(): string | undefined {
    return this._currrentQuestion;
  }

  set officeHoursOpen(officeHoursOpen: boolean) {
    this._officeHoursOpen = officeHoursOpen;
  }

  get officeHoursOpen() {
    return this._officeHoursOpen;
  }

  constructor(userName: string, townEmitter: TownEmitter) {
    super(userName, townEmitter);
    this._officeHoursOpen = false;
  }
}
