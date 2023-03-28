import { EventEmitter } from 'events';
import TypedEventEmitter from 'typed-emitter';
import { OfficeHoursArea as OfficeHoursAreaModel } from '../types/CoveyTownSocket';

export type OfficeHoursAreaEvents = {
  officeHoursOpen: () => boolean;
};

export default class OfficeHoursAreaController extends (EventEmitter as new () => TypedEventEmitter<OfficeHoursAreaEvents>) {
  private _model: OfficeHoursAreaModel;

  /**
   * Constructs a new OfficeHoursAreaController, initialized with the state of the
   * provided officeHoursAreaModel.
   *
   * @param officeHoursAreaModel The poster session area model that this controller should represent
   */
  constructor(officeHoursAreaModel: OfficeHoursAreaModel) {
    super();
    this._model = officeHoursAreaModel;
  }

  public get officeHoursOpen() {
    return this._model.questions?.length;
  }
}
