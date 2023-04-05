import Interactable, { KnownInteractableTypes } from '../Interactable';

export default class BreakoutRoomArea extends Interactable {
  getType(): KnownInteractableTypes {
    return 'breakoutRoomArea';
  }

  addedToScene(): void {
    super.addedToScene();
    this.setTintFill();
    this.setAlpha(0.3);
  }
}
