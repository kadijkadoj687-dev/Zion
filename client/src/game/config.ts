import Phaser from 'phaser';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const COLORS = {
  ink: 0x101225,
  panel: 0x1b2040,
  mint: 0x8fffd0,
  gold: 0xffe69a,
  danger: 0xff7185,
  white: 0xf4f5ff,
};

export const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Trebuchet MS, Arial, sans-serif',
  color: '#f4f5ff',
};
