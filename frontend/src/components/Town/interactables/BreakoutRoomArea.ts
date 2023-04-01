import Interactable, { KnownInteractableTypes } from '../Interactable';

export default class BreakoutRoomArea extends Interactable {
  getType(): KnownInteractableTypes {
    return 'breakoutRoomArea';
  }
}
