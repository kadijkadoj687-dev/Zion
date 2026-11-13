import Phaser from 'phaser';
import { TEXT_STYLE } from '../game/config';
import { WORLDS } from '../game/worlds';

/** Small independent HUD scene, kept separate so it can grow with the game. */
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create(data: { worldId?: number; playerName?: string }): void {
    const world = WORLDS[data.worldId ?? 0];
    this.add.rectangle(640, 698, 410, 30, 0x11172b, 0.76)
      .setStrokeStyle(1, world.accent, 0.28);
    const controls = this.sys.game.device.input.touch
      ? 'Touch controls: Move  ·  Hit  ·  Dodge  ·  Burst'
      : 'SPACE Strike  ·  SHIFT Dodge  ·  Q Burst';
    this.add.text(640, 698, `${data.playerName ?? 'Traveler'}  •  ${world.name}   |   ${controls}`, {
      ...TEXT_STYLE, fontSize: '13px', color: '#d3d8f2',
    }).setOrigin(0.5);
  }
}
