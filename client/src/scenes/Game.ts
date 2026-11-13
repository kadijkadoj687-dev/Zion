import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, TEXT_STYLE } from '../game/config';
import { CUSTOMIZATION_OPTIONS, DEFAULT_CUSTOMIZATION, sanitizeCustomization, type Customization } from '../game/customization';
import { getSave, saveGame, unlockNextWorld, type RunData } from '../game/progress';
import { cloudSaveConfigured, saveCloudSave } from '../game/saveSync';
import { REGULAR_STAGES_PER_WORLD, WORLDS } from '../game/worlds';

interface Enemy {
  sprite: Phaser.GameObjects.Image;
  body: Phaser.Physics.Arcade.Body;
  health: number;
  maxHealth: number;
  boss: boolean;
  healthBar: Phaser.GameObjects.Graphics;
  nextAttackAt: number;
  attackAt: number;
  telegraphing: boolean;
}

/** A fast, readable arena loop with directional combos, dodge timing, and a light burst. */
export class Game extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private playerHair!: Phaser.GameObjects.Ellipse;
  private playerAccessory!: Phaser.GameObjects.Arc;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private enemies: Enemy[] = [];
  private worldId = 0;
  private stage = 1;
  private playerName = 'Traveler';
  private customization: Customization = { ...DEFAULT_CUSTOMIZATION };
  private health = 6;
  private score = 0;
  private energy = 0;
  private combo = 0;
  private lastComboAt = 0;
  private lastDamageAt = 0;
  private lastAttackAt = 0;
  private dashUntil = 0;
  private dashInvulnerableUntil = 0;
  private dashReadyAt = 0;
  private facing = new Phaser.Math.Vector2(1, 0);
  private touchMove = new Phaser.Math.Vector2();
  private joystickPointerId: number | null = null;
  private joystickNub!: Phaser.GameObjects.Arc;
  private touchControlsEnabled = false;
  private playerBaseScale = 1;
  private statusText!: Phaser.GameObjects.Text;
  private speechText!: Phaser.GameObjects.Text;
  private closed = false;

  constructor() {
    super('Game');
  }

  init(data: RunData): void {
    this.worldId = Phaser.Math.Clamp(data.worldId ?? 0, 0, WORLDS.length - 1);
    this.playerName = data.playerName || 'Traveler';
    this.customization = sanitizeCustomization(data.customization);
    this.stage = 1;
    this.health = 6;
    this.score = 0;
    this.energy = 0;
    this.combo = 0;
    this.lastComboAt = 0;
    this.lastDamageAt = 0;
    this.lastAttackAt = 0;
    this.dashUntil = 0;
    this.dashInvulnerableUntil = 0;
    this.dashReadyAt = 0;
    this.facing = new Phaser.Math.Vector2(1, 0);
    this.touchMove.set(0, 0);
    this.joystickPointerId = null;
    this.enemies = [];
    this.closed = false;
  }

  create(): void {
    const world = WORLDS[this.worldId];
    this.cameras.main.setBackgroundColor(world.background);
    this.physics.world.setBounds(30, 70, GAME_WIDTH - 60, GAME_HEIGHT - 115);
    this.createArena(world.accent);
    this.add.text(GAME_WIDTH / 2, 28, `WORLD ${world.id + 1}  •  ${world.name.toUpperCase()}`, {
      ...TEXT_STYLE, fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
      shadow: { offsetX: 0, offsetY: 0, color: '#ffffff', blur: 14, fill: true },
    }).setOrigin(0.5);

    this.playerShadow = this.add.ellipse(190, 389, 54, 18, 0x020611, 0.55);
    const outfit = CUSTOMIZATION_OPTIONS.outfit[this.customization.outfit];
    const hair = CUSTOMIZATION_OPTIONS.hairstyle[this.customization.hairstyle];
    const accessory = CUSTOMIZATION_OPTIONS.accessory[this.customization.accessory];
    this.player = this.add.image(190, 365, 'hero').setDisplaySize(58, 68).setTint(outfit.color).setDepth(3);
    this.playerBaseScale = this.player.scaleX;
    this.playerHair = this.add.ellipse(190, 345, 32, 18, hair.color).setStrokeStyle(2, 0xffffff, 0.85).setDepth(4);
    this.playerAccessory = this.add.circle(205, 341, this.customization.accessory === 'halo' ? 8 : 5, accessory.color)
      .setStrokeStyle(2, 0xffffff, 0.85).setDepth(5);
    if (this.customization.accessory === 'none') this.playerAccessory.setVisible(false);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setSize(42, 54, true).setCollideWorldBounds(true);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE,ESC,SHIFT,Q') as Record<string, Phaser.Input.Keyboard.Key>;
    this.touchControlsEnabled = this.sys.game.device.input.touch;
    if (this.touchControlsEnabled) {
      this.input.addPointer(2);
      this.createTouchControls();
    }

    this.statusText = this.add.text(35, 77, '', {
      ...TEXT_STYLE, fontSize: '17px', lineSpacing: 7,
      backgroundColor: '#11172acc', padding: { x: 14, y: 11 },
    }).setDepth(10);
    this.speechText = this.add.text(640, 623, '', {
      ...TEXT_STYLE, fontSize: '18px', color: '#d8ffef', align: 'center',
      backgroundColor: '#172039', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(10);
    this.scene.launch('UIScene', { worldId: this.worldId, playerName: this.playerName });
    this.startStage();
    this.say(`Easy does it, ${this.playerName}. We can do this!`);
    this.cameras.main.fadeIn(350);
  }

  update(time: number): void {
    if (this.closed) return;
    let x = 0;
    let y = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) x -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) x += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) y -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) y += 1;
    x += this.touchMove.x;
    y += this.touchMove.y;
    const movement = new Phaser.Math.Vector2(x, y);
    if (movement.lengthSq() > 1) movement.normalize();
    if (movement.lengthSq() > 0) this.facing.copy(movement.normalize());

    if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT) && time >= this.dashReadyAt) this.dash(time, movement);
    if (time >= this.dashUntil) {
      const velocity = movement.lengthSq() > 0 ? movement.normalize().scale(245) : new Phaser.Math.Vector2();
      this.playerBody.setVelocity(velocity.x, velocity.y);
    }
    this.player.rotation = Phaser.Math.Angle.Between(0, 0, this.facing.x, this.facing.y) * 0.08;
    this.syncPlayerDetails();

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && time - this.lastAttackAt >= this.weapon.cooldown) {
      this.attack(time);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.Q)) this.lightBurst();
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) this.finishRun(false);

    for (const enemy of this.enemies) this.updateEnemy(enemy, time);
    this.refreshStatus();
  }

  private get weapon() {
    return CUSTOMIZATION_OPTIONS.weapon[this.customization.weapon];
  }

  private createArena(accent: number): void {
    const floor = this.add.rectangle(GAME_WIDTH / 2, 393, GAME_WIDTH - 70, 515, 0x10182b, 0.62)
      .setStrokeStyle(2, accent, 0.26);
    floor.setDepth(-2);
    this.add.ellipse(GAME_WIDTH / 2, 625, GAME_WIDTH - 180, 90, accent, 0.08).setDepth(-1);
    for (let index = 0; index < 38; index += 1) {
      const mote = this.add.circle(
        Phaser.Math.Between(55, GAME_WIDTH - 55),
        Phaser.Math.Between(105, 630),
        Phaser.Math.Between(1, 3),
        accent,
        Phaser.Math.FloatBetween(0.18, 0.48),
      ).setDepth(-1);
      this.tweens.add({
        targets: mote,
        y: mote.y - Phaser.Math.Between(18, 55),
        alpha: 0.08,
        duration: Phaser.Math.Between(1400, 3600),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1400),
      });
    }
  }

  private createTouchControls(): void {
    const joystickX = 145;
    const joystickY = 555;
    this.add.circle(joystickX, joystickY, 82, 0x11172b, 0.7)
      .setStrokeStyle(3, 0xffffff, 0.38).setDepth(11);
    this.add.circle(joystickX, joystickY, 52, 0xffffff, 0.035)
      .setStrokeStyle(2, 0xffffff, 0.12).setDepth(11);
    this.joystickNub = this.add.circle(joystickX, joystickY, 29, 0x8fffd0, 0.7)
      .setStrokeStyle(3, 0xffffff, 0.85).setDepth(12);
    const joystickZone = this.add.zone(joystickX, joystickY, 190, 190)
      .setInteractive(new Phaser.Geom.Circle(95, 95, 95), Phaser.Geom.Circle.Contains)
      .setDepth(13);
    joystickZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointerId !== null) return;
      this.joystickPointerId = pointer.id;
      this.updateJoystick(pointer, joystickX, joystickY);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) this.updateJoystick(pointer, joystickX, joystickY);
    });
    const releaseJoystick = (pointer: Phaser.Input.Pointer): void => {
      if (pointer.id !== this.joystickPointerId) return;
      this.joystickPointerId = null;
      this.touchMove.set(0, 0);
      this.joystickNub.setPosition(joystickX, joystickY);
    };
    this.input.on('pointerup', releaseJoystick);
    this.input.on('pointerupoutside', releaseJoystick);

    this.createActionButton(1070, 564, 48, 'HIT', 0x8fffd0, () => this.attack(this.time.now));
    this.createActionButton(1170, 482, 42, 'DODGE', 0xc3a7ff, () => {
      if (this.time.now >= this.dashReadyAt) this.dash(this.time.now, this.touchMove);
    });
    this.createActionButton(1170, 590, 42, 'BURST', 0xffe69a, () => this.lightBurst());
    this.add.text(145, 657, 'MOVE', {
      ...TEXT_STYLE, fontSize: '13px', color: '#d3d8f2', fontStyle: 'bold',
      backgroundColor: '#11172b99', padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setDepth(12);
  }

  private updateJoystick(pointer: Phaser.Input.Pointer, centerX: number, centerY: number): void {
    const delta = new Phaser.Math.Vector2(pointer.x - centerX, pointer.y - centerY);
    const radius = 52;
    if (delta.length() > radius) delta.setLength(radius);
    this.touchMove.copy(delta).scale(1 / radius);
    this.joystickNub.setPosition(centerX + delta.x, centerY + delta.y);
  }

  private createActionButton(
    x: number,
    y: number,
    radius: number,
    label: string,
    color: number,
    action: () => void,
  ): void {
    const button = this.add.circle(x, y, radius, 0x11172b, 0.82)
      .setStrokeStyle(4, color, 0.95)
      .setDepth(12)
      .setInteractive(new Phaser.Geom.Circle(radius, radius, radius), Phaser.Geom.Circle.Contains);
    const text = this.add.text(x, y, label, {
      ...TEXT_STYLE, fontSize: radius > 45 ? '13px' : '10px', color: '#ffffff', fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(13);
    button.on('pointerdown', () => {
      button.setScale(0.9);
      text.setScale(0.95);
      action();
    });
    const release = (): void => {
      button.setScale(1);
      text.setScale(1);
    };
    button.on('pointerup', release);
    button.on('pointerout', release);
  }

  private syncPlayerDetails(): void {
    this.playerShadow.setPosition(this.player.x, this.player.y + 25);
    this.playerHair.setPosition(this.player.x - this.facing.x * 2, this.player.y - 20);
    this.playerAccessory.setPosition(this.player.x + this.facing.x * 11, this.player.y - 24);
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
      const radius = boss ? 54 : 26;
      const sprite = this.add.image(x, y, boss ? 'guardian' : 'dim-one')
        .setDisplaySize(radius * 2, radius * 2)
        .setTint(boss ? COLORS.danger : world.accent)
        .setDepth(2);
      this.tweens.add({ targets: sprite, scale: boss ? 1.05 : 1.1, duration: 850, yoyo: true, repeat: -1 });
      this.physics.add.existing(sprite);
      const body = sprite.body as Phaser.Physics.Arcade.Body;
      body.setSize(radius * 1.35, radius * 1.35, true).setCollideWorldBounds(true);
      const health = boss ? 42 : 3 + this.stage;
      const healthBar = this.add.graphics().setDepth(6);
      const enemy: Enemy = {
        sprite, body, health, maxHealth: health, boss, healthBar,
        nextAttackAt: this.time.now + Phaser.Math.Between(650, 1250),
        attackAt: 0,
        telegraphing: false,
      };
      this.enemies.push(enemy);
      this.drawEnemyHealth(enemy);
    }
    this.refreshStatus();
    this.say(isBoss ? `${world.guardian}! Watch the warning glow, then dodge!` : 'The dim ones are closing in!');
  }

  private updateEnemy(enemy: Enemy, time: number): void {
    if (!enemy.sprite.active) return;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
    const attackRange = enemy.boss ? 178 : 125;
    if (distance > attackRange * 0.72) {
      this.physics.moveToObject(enemy.sprite, this.player, enemy.boss ? 58 : 78);
    } else {
      enemy.body.setVelocity(0, 0);
    }

    if (!enemy.telegraphing && time >= enemy.nextAttackAt && distance <= attackRange) {
      enemy.telegraphing = true;
      enemy.attackAt = time + (enemy.boss ? 850 : 620);
      enemy.sprite.setTint(0xff7185);
      this.tweens.add({ targets: enemy.sprite, alpha: 0.45, yoyo: true, duration: 170, repeat: 2 });
      this.say(enemy.boss ? 'Big move coming — step out of the glow!' : 'That glow means a hit is coming!');
    } else if (enemy.telegraphing && time >= enemy.attackAt) {
      const currentDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
      if (currentDistance <= attackRange && time >= this.dashInvulnerableUntil) {
        this.takeDamage(time);
      } else if (time < this.dashInvulnerableUntil) {
        this.energy = Math.min(100, this.energy + (enemy.boss ? 24 : 12));
        this.say('Perfect dodge! Light energy gained!');
      }
      enemy.telegraphing = false;
      enemy.nextAttackAt = time + (enemy.boss ? 1650 : 1850);
      enemy.sprite.setTint(enemy.boss ? COLORS.danger : WORLDS[this.worldId].accent).setAlpha(1);
    }
    this.drawEnemyHealth(enemy);
  }

  private dash(time: number, movement: Phaser.Math.Vector2): void {
    const direction = movement.lengthSq() > 0 ? movement.normalize() : this.facing;
    this.facing.copy(direction);
    this.playerBody.setVelocity(direction.x * 600, direction.y * 600);
    this.dashUntil = time + 180;
    this.dashInvulnerableUntil = time + 330;
    this.dashReadyAt = time + 1050;
    this.tweens.add({
      targets: this.player,
      alpha: 0.38,
      yoyo: true,
      duration: 90,
      repeat: 2,
      onComplete: () => this.player.active && this.player.setAlpha(1),
    });
  }

  private attack(time: number): void {
    this.lastAttackAt = time;
    this.combo = time - this.lastComboAt <= 950 ? this.combo % 3 + 1 : 1;
    this.lastComboAt = time;
    const target = this.enemies
      .filter((enemy) => enemy.sprite.active)
      .map((enemy) => ({
        enemy,
        distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y),
        direction: new Phaser.Math.Vector2(enemy.sprite.x - this.player.x, enemy.sprite.y - this.player.y).normalize(),
      }))
      .filter(({ enemy, distance, direction }) =>
        distance < this.weapon.range + (enemy.boss ? 18 : 0) && direction.dot(this.facing) > -0.2)
      .sort((left, right) => left.distance - right.distance)[0]?.enemy;

    this.drawSlash();
    this.player.setScale(this.playerBaseScale * 1.08);
    this.tweens.add({
      targets: this.player,
      scaleX: this.playerBaseScale,
      scaleY: this.playerBaseScale,
      duration: 140,
      ease: 'Back.Out',
    });
    if (!target) {
      this.say('A clean swing! Try facing the glow before the next one.');
      return;
    }

    const damage = this.weapon.damage + (this.combo === 3 ? 1 : 0);
    target.health -= damage;
    target.sprite.setTint(0xffffff);
    this.time.delayedCall(100, () => {
      if (target.sprite.active) target.sprite.setTint(target.boss ? COLORS.danger : WORLDS[this.worldId].accent);
    });
    this.cameras.main.shake(90, 0.0025);
    this.energy = Math.min(100, this.energy + (target.boss ? 13 : 18));
    this.score += damage * (target.boss ? 7 : 3);
    this.drawEnemyHealth(target);
    this.floatText(target.sprite.x, target.sprite.y - 35, `-${damage}`, this.weapon.color);
    if (target.health <= 0) {
      target.sprite.destroy();
      target.healthBar.destroy();
      this.score += target.boss ? 250 : 25;
      this.enemies = this.enemies.filter((enemy) => enemy !== target);
      if (this.enemies.length === 0) this.completeStage();
    }
    this.refreshStatus();
  }

  private drawSlash(): void {
    const slash = this.add.ellipse(
      this.player.x + this.facing.x * 48,
      this.player.y + this.facing.y * 48,
      this.customization.weapon === 'sunstaff' ? 112 : 78,
      this.customization.weapon === 'sunstaff' ? 42 : 32,
      this.weapon.color,
      0.55,
    ).setRotation(this.facing.angle()).setDepth(5);
    this.tweens.add({
      targets: slash,
      scaleX: 1.5,
      scaleY: 1.35,
      alpha: 0,
      duration: 180,
      onComplete: () => slash.destroy(),
    });
  }

  private lightBurst(): void {
    if (this.energy < 40) {
      this.say('Gather 40 light energy first. Landing hits builds it!');
      return;
    }
    this.energy -= 40;
    const pulse = this.add.circle(this.player.x, this.player.y, 52, this.weapon.color, 0.32)
      .setStrokeStyle(5, 0xffffff, 0.9).setDepth(5);
    this.tweens.add({
      targets: pulse,
      scale: 3.5,
      alpha: 0,
      duration: 440,
      onComplete: () => pulse.destroy(),
    });
    this.cameras.main.flash(130, 180, 255, 224);
    for (const enemy of [...this.enemies]) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y) <= 235) {
        enemy.health -= 8;
        this.score += 18;
        this.drawEnemyHealth(enemy);
        this.floatText(enemy.sprite.x, enemy.sprite.y - 35, '-8', '#ffffff');
        if (enemy.health <= 0) {
          enemy.sprite.destroy();
          enemy.healthBar.destroy();
          this.score += enemy.boss ? 250 : 25;
          this.enemies = this.enemies.filter((remaining) => remaining !== enemy);
        }
      }
    }
    if (this.enemies.length === 0) this.completeStage();
    this.say('Light burst! The whole arena felt that one.');
    this.refreshStatus();
  }

  private takeDamage(time: number): void {
    if (time - this.lastDamageAt < 650) return;
    this.health = Math.max(0, this.health - 1);
    this.lastDamageAt = time;
    this.cameras.main.shake(150, 0.006);
    this.player.setTint(COLORS.danger);
    this.time.delayedCall(170, () => {
      if (this.player.active) this.player.setTint(CUSTOMIZATION_OPTIONS.outfit[this.customization.outfit].color);
    });
    this.say(this.health > 1 ? 'Oof! Breathe, then dodge through the next warning.' : 'One heart left — you can still turn this around!');
    if (this.health === 0) this.finishRun(false);
  }

  private drawEnemyHealth(enemy: Enemy): void {
    if (!enemy.sprite.active) return;
    enemy.healthBar.clear();
    const width = enemy.boss ? 110 : 58;
    const x = enemy.sprite.x - width / 2;
    const y = enemy.sprite.y - (enemy.boss ? 73 : 40);
    enemy.healthBar.fillStyle(0x111225, 0.9).fillRoundedRect(x, y, width, 7, 4);
    enemy.healthBar.fillStyle(enemy.boss ? 0xff7185 : 0x8fffd0, 1)
      .fillRoundedRect(x, y, width * Math.max(0, enemy.health / enemy.maxHealth), 7, 4);
  }

  private floatText(x: number, y: number, text: string, color: string | number): void {
    const textColor = typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : color;
    const floating = this.add.text(x, y, text, { ...TEXT_STYLE, fontSize: '18px', color: textColor, fontStyle: 'bold' })
      .setOrigin(0.5).setDepth(8);
    this.tweens.add({
      targets: floating, y: y - 35, alpha: 0, duration: 560,
      onComplete: () => floating.destroy(),
    });
  }

  private completeStage(): void {
    const world = WORLDS[this.worldId];
    if (this.stage <= REGULAR_STAGES_PER_WORLD) {
      this.score += 50;
      this.health = Math.min(6, this.health + 1);
      this.energy = Math.min(100, this.energy + 20);
      this.stage += 1;
      this.say(`Stage cleared! +50 light, a heart, and energy. You're glowing, ${this.playerName}!`);
      this.refreshStatus();
      this.time.delayedCall(1050, () => this.startStage());
      return;
    }
    this.score += 500;
    const save = unlockNextWorld(this.worldId, this.score);
    this.closed = true;
    this.scene.stop('UIScene');
    if (cloudSaveConfigured) {
      void saveCloudSave(save).catch((error: unknown) => console.error('Could not sync guardian progress:', error));
    }
    this.cameras.main.flash(450, 143, 255, 208);
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 760, 350, 0x11152c, 0.97)
      .setStrokeStyle(3, world.accent);
    panel.setScale(0.8);
    this.tweens.add({ targets: panel, scale: 1, duration: 330, ease: 'Back.Out' });
    this.add.text(GAME_WIDTH / 2, 260, 'SHARD RESTORED!', {
      ...TEXT_STYLE, fontSize: '46px', color: '#8fffd0', fontStyle: 'bold',
      shadow: { offsetX: 0, offsetY: 0, color: '#8fffd0', blur: 18, fill: true },
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 355, `${world.guardian} is defeated.\n${this.worldId < WORLDS.length - 1 ? 'The next world is now unlocked.' : 'The Network of Worlds is safe — for now.'}\nScore: ${this.score}`, {
      ...TEXT_STYLE, fontSize: '23px', align: 'center', lineSpacing: 10,
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 485, 'Click or press Enter to continue', {
      ...TEXT_STYLE, fontSize: '17px', color: '#c4c9e8',
    }).setOrigin(0.5);
    this.input.once('pointerdown', () => this.scene.start('MainMenu'));
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('MainMenu'));
  }

  private finishRun(won: boolean): void {
    if (this.closed) return;
    this.closed = true;
    const save = getSave();
    save.bestScore = Math.max(save.bestScore, this.score);
    saveGame(save);
    if (cloudSaveConfigured) {
      void saveCloudSave(save).catch((error: unknown) => console.error('Could not sync run progress:', error));
    }
    this.scene.stop('UIScene');
    this.scene.start('MainMenu', { won, score: this.score });
  }

  private refreshStatus(): void {
    const world = WORLDS[this.worldId];
    const encounter = this.stage > REGULAR_STAGES_PER_WORLD ? world.guardian : `Encounter ${this.stage} / ${REGULAR_STAGES_PER_WORLD}`;
    const target = this.enemies.find((enemy) => enemy.sprite.active);
    const targetLine = target ? `Target: ${target.boss ? world.guardian : 'Dim one'}  ${target.health}/${target.maxHealth}` : '';
    const hearts = '♥'.repeat(this.health) + '♡'.repeat(6 - this.health);
    this.statusText.setText(
      `${this.playerName}   ${hearts}\n${encounter}   •   ${this.weapon.label}   •   Combo x${this.combo || 0}\nLight ${this.score}   •   Burst ${this.energy}% (40 to cast)${targetLine ? `\n${targetLine}` : ''}`,
    );
  }

  private say(message: string): void {
    this.speechText.setText(message);
    this.time.delayedCall(2500, () => {
      if (this.speechText.active && this.speechText.text === message) this.speechText.setText('');
    });
  }
}
