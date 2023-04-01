import Interactable, { KnownInteractableTypes } from '../Interactable';

export default class OfficeHoursArea extends Interactable {
  getType(): KnownInteractableTypes {
    return 'officeHoursArea';
  }
}
