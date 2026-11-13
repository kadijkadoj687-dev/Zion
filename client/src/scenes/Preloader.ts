import Phaser from 'phaser';

/** Loads Zion's small set of original vector illustrations. */
export class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  create(): void {
    this.load.svg('hero', '/assets/hero.svg');
    this.load.svg('dim-one', '/assets/dim-one.svg');
    this.load.svg('guardian', '/assets/guardian.svg');
    this.load.once('complete', () => this.scene.start('MainMenu'));
    this.load.start();
  }
}
