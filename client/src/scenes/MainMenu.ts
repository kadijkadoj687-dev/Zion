import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_STYLE } from '../game/config';
import { getUnlockedWorld, PLAYER_NAME_KEY, type RunData } from '../game/progress';
import { WORLDS } from '../game/worlds';

/** Name entry, unlocked-world selection, and the player's first conversation. */
export class MainMenu extends Phaser.Scene {
  private selectedWorld = 0;
  private worldText!: Phaser.GameObjects.Text;

  constructor() {
    super('MainMenu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.ink);
    this.add.circle(GAME_WIDTH / 2, 170, 105, 0x253052).setAlpha(0.65);
    this.add.star(GAME_WIDTH / 2, 170, 8, 24, 58, COLORS.mint).setAlpha(0.9);
    this.add.text(GAME_WIDTH / 2, 285, 'Z I O N', {
      ...TEXT_STYLE, fontSize: '64px', color: '#8fffd0', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 340, 'A light is waiting between worlds.', {
      ...TEXT_STYLE, fontSize: '23px', color: '#c4c9e8',
    }).setOrigin(0.5);

    this.selectedWorld = getUnlockedWorld();
    this.worldText = this.add.text(GAME_WIDTH / 2, 425, '', {
      ...TEXT_STYLE, fontSize: '25px', color: '#ffe69a', align: 'center',
    }).setOrigin(0.5);
    this.refreshWorldLabel();

    const savedName = localStorage.getItem(PLAYER_NAME_KEY) ?? '';
    this.add.text(GAME_WIDTH / 2, 474, 'Choose a name, then enter the network', {
      ...TEXT_STYLE, fontSize: '17px', color: '#c4c9e8',
    }).setOrigin(0.5);
    const form = this.add.dom(GAME_WIDTH / 2, 530).createFromHTML(`
      <form class="zion-name-form">
        <input name="playerName" maxlength="18" minlength="1" required
          aria-label="Character name" placeholder="Your character's name" value="${this.escapeHtml(savedName)}" />
        <button type="submit">Start adventure</button>
      </form>
    `);
    form.addListener('submit');
    form.on('submit', (event: Event) => {
      event.preventDefault();
      const input = form.getChildByName('playerName') as HTMLInputElement | null;
      const playerName = input?.value.trim().slice(0, 18);
      if (!playerName) {
        input?.focus();
        return;
      }
      localStorage.setItem(PLAYER_NAME_KEY, playerName);
      const data: RunData = { playerName, worldId: this.selectedWorld };
      this.scene.start('Game', data);
    });

    this.add.text(GAME_WIDTH / 2, 635, '← / → choose a world  •  Move: WASD or arrows  •  Attack: Space', {
      ...TEXT_STYLE, fontSize: '16px', color: '#aab0d4',
    }).setOrigin(0.5);
    this.input.keyboard?.on('keydown-LEFT', () => this.changeWorld(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.changeWorld(1));
    this.cameras.main.fadeIn(350, 16, 18, 37);
  }

  private changeWorld(direction: number): void {
    this.selectedWorld = Phaser.Math.Clamp(this.selectedWorld + direction, 0, getUnlockedWorld());
    this.refreshWorldLabel();
  }

  private refreshWorldLabel(): void {
    const world = WORLDS[this.selectedWorld];
    this.worldText.setText(`‹   WORLD ${world.id + 1}: ${world.name.toUpperCase()}   ›\n${world.subtitle}`);
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character] ?? character);
  }
}
