import BreakoutRoomAreaController from '../../../classes/BreakoutRoomAreaController';
import TownController from '../../../classes/TownController';
import { BoundingBox } from '../../../types/CoveyTownSocket';
import Interactable, { KnownInteractableTypes } from '../Interactable';
import TownGameScene from '../TownGameScene';

export default class BreakoutRoomArea extends Interactable {
  private _topicTextOrUndefined?: Phaser.GameObjects.Text;

  private _infoTextBox?: Phaser.GameObjects.Text;

  private _breakoutRoomArea?: BreakoutRoomAreaController;

  private _townController: TownController;

  private _isInteracting = false;

  constructor(scene: TownGameScene) {
    super(scene);
    this._townController = scene.coveyTownController;
    this.setTintFill();
    this.setAlpha(0.3);
    this._townController.addListener('breakoutRoomAreasChanged', this._updateBreakoutRoomAreas);
  }

  private get _topicText() {
    const ret = this._topicTextOrUndefined;
    if (!ret) {
      throw new Error('Expected topic text to be defined');
    }
    return ret;
  }

  getType(): KnownInteractableTypes {
    return 'breakoutRoomArea';
  }

  removedFromScene(): void {}

  addedToScene(): void {
    super.addedToScene();
    this.scene.add.text(
      this.x - this.displayWidth / 2,
      this.y - this.displayHeight / 2,
      this.name,
      { color: '#FFFFFF', backgroundColor: '#000000' },
    );
    this._topicTextOrUndefined = this.scene.add.text(
      this.x - this.displayWidth / 2,
      this.y + this.displayHeight / 2,
      '(No Topic)',
      { color: '#000000' },
    );
    this._updateBreakoutRoomAreas(this._townController.breakoutRoomAreas);
  }

  private _updateBreakoutRoomAreas(areas: BreakoutRoomAreaController[]) {
    const area = areas.find(eachAreaInController => eachAreaInController.id === this.name);
    if (area !== this._breakoutRoomArea) {
      if (area === undefined) {
        this._breakoutRoomArea = undefined;
        this._topicText.text = '(No topic)';
      } else {
        this._breakoutRoomArea = area;
        if (this.isOverlapping) {
          this._scene.moveOurPlayerTo({ interactableID: this.name });
        }
        const updateListener = (newTopic: string | undefined) => {
          if (newTopic) {
            if (this._infoTextBox && this._infoTextBox.visible) {
              this._infoTextBox.setVisible(false);
            }
            this._topicText.text = newTopic;
          } else {
            this._topicText.text = '(No topic)';
          }
        };
        updateListener(area.topic);
        area.addListener('breakoutRoomTopicChange', updateListener);
      }
    }
  }

  public getBoundingBox(): BoundingBox {
    const { x, y, width, height } = this.getBounds();
    return { x, y, width, height };
  }

  // private _showInfoBox() {
  //   if (!this._infoTextBox) {
  //     this._infoTextBox = this.scene.add
  //       .text(
  //         this.scene.scale.width / 2,
  //         this.scene.scale.height / 2,
  //         "You've found an empty breakout room area!\nThis room is reserved for TA's\nYou can enter a question in the nearby Office Hours Area.",
  //         { color: '#000000', backgroundColor: '#FFFFFF' },
  //       )
  //       .setScrollFactor(0)
  //       .setDepth(30);
  //   }
  //   this._infoTextBox.setVisible(true);
  //   this._infoTextBox.x = this.scene.scale.width / 2 - this._infoTextBox.width / 2;
  // }

  overlap(): void {}

  overlapExit(): void {
    this._infoTextBox?.setVisible(false);
    if (this._isInteracting) {
      this.townController.interactableEmitter.emit('endInteraction', this);
      this._isInteracting = false;
    }
  }

  interact(): void {
    this._isInteracting = true;
  }
}
