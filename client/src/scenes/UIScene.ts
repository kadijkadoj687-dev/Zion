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
    this.add.text(1240, 680, `${data.playerName ?? 'Traveler'}  •  ${world.name}`, {
      ...TEXT_STYLE, fontSize: '14px', color: '#aab0d4',
    }).setOrigin(1, 1);
  }
}
