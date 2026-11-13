import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_STYLE } from '../game/config';
import { unlockNextWorld, type RunData } from '../game/progress';
import { REGULAR_STAGES_PER_WORLD, WORLDS } from '../game/worlds';

interface Enemy {
  sprite: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.Body;
  health: number;
  maxHealth: number;
  boss: boolean;
}

/** A tiny asset-free action prototype; replace geometric actors with art later. */
export class Game extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private enemies: Enemy[] = [];
  private worldId = 0;
  private stage = 1;
  private playerName = 'Traveler';
  private health = 5;
  private score = 0;
  private lastDamageAt = 0;
  private lastAttackAt = 0;
  private statusText!: Phaser.GameObjects.Text;
  private speechText!: Phaser.GameObjects.Text;
  private closed = false;

  constructor() {
    super('Game');
  }

  init(data: RunData): void {
    this.worldId = Phaser.Math.Clamp(data.worldId ?? 0, 0, WORLDS.length - 1);
    this.playerName = data.playerName || 'Traveler';
    this.stage = 1;
    this.health = 5;
    this.score = 0;
    this.enemies = [];
    this.closed = false;
  }

  create(): void {
    const world = WORLDS[this.worldId];
    this.cameras.main.setBackgroundColor(world.background);
    this.physics.world.setBounds(30, 70, GAME_WIDTH - 60, GAME_HEIGHT - 115);
    this.add.rectangle(GAME_WIDTH / 2, 676, GAME_WIDTH, 88, 0x101225).setAlpha(0.78);
    this.add.ellipse(GAME_WIDTH / 2, 635, GAME_WIDTH - 90, 50, world.accent).setAlpha(0.12);
    this.add.text(GAME_WIDTH / 2, 28, `WORLD ${world.id + 1}  •  ${world.name.toUpperCase()}`, {
      ...TEXT_STYLE, fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.player = this.add.rectangle(190, 365, 34, 48, COLORS.mint).setStrokeStyle(3, 0xffffff);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCollideWorldBounds(true);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE,ESC') as Record<string, Phaser.Input.Keyboard.Key>;

    this.statusText = this.add.text(35, 77, '', { ...TEXT_STYLE, fontSize: '18px', lineSpacing: 8 });
    this.speechText = this.add.text(640, 623, '', {
      ...TEXT_STYLE, fontSize: '18px', color: '#d8ffef', align: 'center',
      backgroundColor: '#172039', padding: { x: 14, y: 8 },
    }).setOrigin(0.5);
    this.scene.launch('UIScene', { worldId: this.worldId, playerName: this.playerName });
    this.startStage();
    this.say(`Easy does it, ${this.playerName}. We can do this!`);
    this.cameras.main.fadeIn(300);
  }

  update(time: number): void {
    if (this.closed) return;
    const speed = 250;
    let x = 0;
    let y = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) x -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) x += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) y -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) y += 1;
    const movement = new Phaser.Math.Vector2(x, y).normalize().scale(speed);
    this.playerBody.setVelocity(movement.x, movement.y);

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && time - this.lastAttackAt > 320) {
      this.attack(time);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) this.scene.start('MainMenu');

    for (const enemy of this.enemies) {
      if (!enemy.sprite.active) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
      if (distance > 42) {
        this.physics.moveToObject(enemy.sprite, this.player, enemy.boss ? 65 : 85);
      } else {
        enemy.body.setVelocity(0, 0);
        if (time - this.lastDamageAt > 1000) {
          this.health = Math.max(0, this.health - 1);
          this.lastDamageAt = time;
          this.say(this.health > 1 ? 'Oof! Keep moving!' : 'Careful — one more hit could be trouble!');
          this.refreshStatus();
          if (this.health === 0) this.finishRun(false);
        }
      }
    }
  }

  private startStage(): void {
    if (this.closed) return;
    const world = WORLDS[this.worldId];
    this.enemies = [];
    const isBoss = this.stage > REGULAR_STAGES_PER_WORLD;
    const count = isBoss ? 1 : Math.min(1 + Math.floor((this.stage - 1) / 2), 3);
    for (let index = 0; index < count; index += 1) {
      const boss = isBoss;
      const x = boss ? 980 : 730 + index * 145;
      const y = boss ? 350 : 230 + (index % 2) * 230;
      const sprite = this.add.rectangle(x, y, boss ? 106 : 44, boss ? 106 : 44, boss ? COLORS.danger : world.accent)
        .setStrokeStyle(3, 0xffffff);
      this.physics.add.existing(sprite);
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      body.setCollideWorldBounds(true);
      this.enemies.push({ sprite, body, health: boss ? 14 : 2 + this.stage, maxHealth: boss ? 14 : 2 + this.stage, boss });
    }
    this.refreshStatus();
    this.say(isBoss ? `${world.guardian}! Time to shine!` : 'The dim ones are closing in!');
  }

  private attack(time: number): void {
    this.lastAttackAt = time;
    const target = this.enemies.find((enemy) => enemy.sprite.active &&
      Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y) < (enemy.boss ? 112 : 86));
    if (!target) {
      this.say('A dramatic swing at absolutely nothing. Nice form, though!');
      return;
    }
    target.health -= 1;
    target.sprite.setAlpha(0.45);
    this.time.delayedCall(90, () => target.sprite.active && target.sprite.setAlpha(1));
    if (target.health <= 0) {
      target.sprite.destroy();
      this.score += target.boss ? 250 : 25;
      this.enemies = this.enemies.filter((enemy) => enemy !== target);
      if (this.enemies.length === 0) this.completeStage();
    }
    this.refreshStatus();
  }

  private completeStage(): void {
    const world = WORLDS[this.worldId];
    if (this.stage <= REGULAR_STAGES_PER_WORLD) {
      this.score += 50;
      this.health = Math.min(5, this.health + 1);
      this.stage += 1;
      this.say(`Stage cleared! +50 light and a little healing. You're glowing, ${this.playerName}!`);
      this.refreshStatus();
      this.time.delayedCall(1100, () => this.startStage());
      return;
    }
    this.score += 500;
    unlockNextWorld(this.worldId);
    this.closed = true;
    this.scene.stop('UIScene');
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 760, 330, 0x11152c, 0.96).setStrokeStyle(3, world.accent);
    this.add.text(GAME_WIDTH / 2, 280, 'SHARD RESTORED!', {
      ...TEXT_STYLE, fontSize: '46px', color: '#8fffd0', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 365, `${world.guardian} is defeated.\n${this.worldId < WORLDS.length - 1 ? 'The next world is now unlocked.' : 'The Network of Worlds is safe — for now.'}\nScore: ${this.score}`, {
      ...TEXT_STYLE, fontSize: '23px', align: 'center', lineSpacing: 10,
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 475, 'Click or press Enter to continue', {
      ...TEXT_STYLE, fontSize: '17px', color: '#c4c9e8',
    }).setOrigin(0.5);
    this.input.once('pointerdown', () => this.scene.start('MainMenu'));
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('MainMenu'));
  }

  private finishRun(won: boolean): void {
    if (this.closed) return;
    this.closed = true;
    this.scene.stop('UIScene');
    this.scene.start('MainMenu', { won, score: this.score });
  }

  private refreshStatus(): void {
    const world = WORLDS[this.worldId];
    const encounter = this.stage > REGULAR_STAGES_PER_WORLD ? world.guardian : `Encounter ${this.stage} / ${REGULAR_STAGES_PER_WORLD}`;
    const target = this.enemies.find((enemy) => enemy.sprite.active);
    const targetLine = target ? `Target: ${target.boss ? world.guardian : 'Dim one'}  ${target.health}/${target.maxHealth}` : '';
    this.statusText.setText(`${this.playerName}   ♥ ${this.health}/5\n${encounter}\nLight: ${this.score}${targetLine ? `\n${targetLine}` : ''}`);
  }

  private say(message: string): void {
    this.speechText.setText(message);
    this.time.delayedCall(2600, () => {
      if (this.speechText.active && this.speechText.text === message) this.speechText.setText('');
    });
  }
}
