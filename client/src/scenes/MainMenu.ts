import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_STYLE } from '../game/config';
import { CUSTOMIZATION_OPTIONS, sanitizeCustomization } from '../game/customization';
import { getSave, saveGame, sanitizeName, type GameSave, type RunData } from '../game/progress';
import { cloudSaveConfigured, loadCloudSave, saveCloudSave } from '../game/saveSync';
import { WORLDS } from '../game/worlds';

/** Name entry, unlocked-world selection, customization, and save synchronization. */
export class MainMenu extends Phaser.Scene {
  private selectedWorld = 0;
  private worldText!: Phaser.GameObjects.Text;
  private previousWorldButton!: Phaser.GameObjects.Text;
  private nextWorldButton!: Phaser.GameObjects.Text;
  private saveStatus!: Phaser.GameObjects.Text;
  private form!: Phaser.GameObjects.DOMElement;
  private save!: GameSave;

  constructor() {
    super('MainMenu');
  }

  create(): void {
    this.save = getSave();
    this.cameras.main.setBackgroundColor(COLORS.ink);
    this.selectedWorld = this.save.unlockedWorld;
    this.add.circle(GAME_WIDTH / 2, 130, 120, 0x253052).setAlpha(0.5);
    const sigil = this.add.star(GAME_WIDTH / 2, 130, 8, 24, 58, COLORS.mint).setAlpha(0.9);
    this.tweens.add({ targets: sigil, angle: 360, duration: 26000, repeat: -1 });
    this.tweens.add({ targets: sigil, scale: 1.12, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.createLightMotes();
    this.add.text(GAME_WIDTH / 2, 260, 'Z I O N', {
      ...TEXT_STYLE, fontSize: '64px', color: '#8fffd0', fontStyle: 'bold',
      shadow: { offsetX: 0, offsetY: 0, color: '#8fffd0', blur: 24, fill: true },
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 310, 'A light is waiting between worlds.', {
      ...TEXT_STYLE, fontSize: '23px', color: '#c4c9e8',
    }).setOrigin(0.5);

    this.saveStatus = this.add.text(GAME_WIDTH / 2, 352, '', {
      ...TEXT_STYLE, fontSize: '14px', color: '#aab0d4',
    }).setOrigin(0.5);
    this.selectedWorld = this.save.unlockedWorld;
    this.worldText = this.add.text(GAME_WIDTH / 2, 397, '', {
      ...TEXT_STYLE, fontSize: '22px', color: '#ffe69a', align: 'center',
    }).setOrigin(0.5);
    this.previousWorldButton = this.add.text(350, 397, '‹', {
      ...TEXT_STYLE, fontSize: '48px', color: '#ffffff', fontStyle: 'bold',
      backgroundColor: '#1b2040', padding: { x: 14, y: 1 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.nextWorldButton = this.add.text(930, 397, '›', {
      ...TEXT_STYLE, fontSize: '48px', color: '#ffffff', fontStyle: 'bold',
      backgroundColor: '#1b2040', padding: { x: 14, y: 1 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.previousWorldButton.on('pointerdown', () => this.changeWorld(-1));
    this.nextWorldButton.on('pointerdown', () => this.changeWorld(1));
    this.refreshWorldLabel();

    const savedName = this.save.playerName;
    const select = <K extends keyof typeof CUSTOMIZATION_OPTIONS>(key: K, label: string): string => {
      const options = Object.entries(CUSTOMIZATION_OPTIONS[key])
        .map(([value, option]) => `<option value="${value}">${option.label}</option>`)
        .join('');
      return `<label class="zion-choice">${label}<select name="${key}">${options}</select></label>`;
    };
    this.form = this.add.dom(GAME_WIDTH / 2, 540).createFromHTML(`
      <form class="zion-studio-form">
        <label class="zion-name-field">Hero name
          <input name="playerName" maxlength="18" minlength="1" required
            aria-label="Character name" placeholder="Your character's name" value="${this.escapeHtml(savedName)}" />
        </label>
        <div class="zion-customization-grid">
          ${select('weapon', 'Weapon')}
          ${select('outfit', 'Outfit')}
          ${select('hairstyle', 'Hair')}
          ${select('accessory', 'Accessory')}
        </div>
        <button type="submit">Begin adventure</button>
      </form>
    `);
    for (const [field, value] of Object.entries(this.save.customization)) {
      const input = this.form.getChildByName(field) as HTMLSelectElement | null;
      if (input) input.value = value;
    }
    const startButton = this.form.node.querySelector('button');
    if (cloudSaveConfigured && startButton) startButton.disabled = true;
    this.form.addListener('submit');
    this.form.on('submit', (event: Event) => {
      event.preventDefault();
      const nameInput = this.form.getChildByName('playerName') as HTMLInputElement | null;
      const playerName = sanitizeName(nameInput?.value);
      if (!playerName) {
        nameInput?.focus();
        return;
      }
      const customization = sanitizeCustomization({
        weapon: (this.form.getChildByName('weapon') as HTMLSelectElement | null)?.value,
        outfit: (this.form.getChildByName('outfit') as HTMLSelectElement | null)?.value,
        hairstyle: (this.form.getChildByName('hairstyle') as HTMLSelectElement | null)?.value,
        accessory: (this.form.getChildByName('accessory') as HTMLSelectElement | null)?.value,
      });
      this.save = { ...this.save, playerName, customization };
      saveGame(this.save);
      this.syncSave();
      const data: RunData = { playerName, worldId: this.selectedWorld, customization };
      this.scene.start('Game', data);
    });

    this.add.text(GAME_WIDTH / 2, 681, this.sys.game.device.input.touch
      ? 'Tap ‹ / › to choose a world  •  In the arena: use the touch controls'
      : '← / → world   •   Move: WASD / arrows   •   Attack: Space   •   Dodge: Shift   •   Light burst: Q', {
      ...TEXT_STYLE, fontSize: '14px', color: '#aab0d4',
    }).setOrigin(0.5);
    this.input.keyboard?.on('keydown-LEFT', () => this.changeWorld(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.changeWorld(1));
    this.refreshSaveStatus(cloudSaveConfigured ? 'Connecting your cloud save…' : 'Local save active · Add Supabase settings to sync across devices');
    if (cloudSaveConfigured) void this.restoreCloudSave();
    this.cameras.main.fadeIn(350, 16, 18, 37);
  }

  private async restoreCloudSave(): Promise<void> {
    try {
      const cloudSave = await loadCloudSave();
      if (cloudSave) {
        this.save = {
          ...cloudSave,
          unlockedWorld: Math.max(cloudSave.unlockedWorld, this.save.unlockedWorld),
          bestScore: Math.max(cloudSave.bestScore, this.save.bestScore),
        };
        this.selectedWorld = this.save.unlockedWorld;
        this.refreshWorldLabel();
        const nameInput = this.form.getChildByName('playerName') as HTMLInputElement | null;
        if (nameInput) nameInput.value = this.save.playerName;
        for (const [field, value] of Object.entries(this.save.customization)) {
          const input = this.form.getChildByName(field) as HTMLSelectElement | null;
          if (input) input.value = value;
        }
        saveGame(this.save);
        await saveCloudSave(this.save);
      } else {
        await saveCloudSave(this.save);
      }
      this.refreshSaveStatus(`Cloud save synced · Best light score ${this.save.bestScore}`);
    } catch (error) {
      console.error('Could not restore the Zion cloud save:', error);
      this.refreshSaveStatus('Cloud sync unavailable · Your local save is safe');
    } finally {
      const startButton = this.form.node.querySelector('button');
      if (startButton) startButton.disabled = false;
    }
  }

  private syncSave(): void {
    if (!cloudSaveConfigured) return;
    void saveCloudSave(this.save).then(() => {
      this.refreshSaveStatus('Cloud save synced');
    }).catch((error: unknown) => {
      console.error('Could not sync the Zion save:', error);
      this.refreshSaveStatus('Cloud sync unavailable · Your local save is safe');
    });
  }

  private refreshSaveStatus(message: string): void {
    if (this.saveStatus?.active) this.saveStatus.setText(message);
  }

  private createLightMotes(): void {
    for (let index = 0; index < 24; index += 1) {
      const mote = this.add.circle(
        Phaser.Math.Between(50, GAME_WIDTH - 50),
        Phaser.Math.Between(70, GAME_HEIGHT - 50),
        Phaser.Math.Between(1, 3),
        index % 2 ? COLORS.mint : 0xc3a7ff,
        Phaser.Math.FloatBetween(0.2, 0.65),
      );
      this.tweens.add({
        targets: mote,
        y: mote.y - Phaser.Math.Between(30, 100),
        alpha: 0.08,
        duration: Phaser.Math.Between(1800, 4200),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1800),
      });
    }
  }

  private changeWorld(direction: number): void {
    this.selectedWorld = Phaser.Math.Clamp(this.selectedWorld + direction, 0, this.save.unlockedWorld);
    this.refreshWorldLabel();
  }

  private refreshWorldLabel(): void {
    const world = WORLDS[this.selectedWorld];
    this.worldText.setText(`‹   WORLD ${world.id + 1}: ${world.name.toUpperCase()}   ›\n${world.subtitle}`);
    this.previousWorldButton?.setAlpha(this.selectedWorld === 0 ? 0.4 : 1);
    this.nextWorldButton?.setAlpha(this.selectedWorld === this.save.unlockedWorld ? 0.4 : 1);
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character] ?? character);
  }
}
