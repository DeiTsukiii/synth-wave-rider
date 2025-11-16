import GameScene from "./src/GameScene.js";
import MenuScene from "./src/MenuScene.js";

export const CONFIG = {
    type: Phaser.AUTO,
    backgroundColor: '#0e0e0e',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920,
        height: 1080,
    },
    pixelArt: false,
    input: {
        activePointers: 3,
    },
    // scene: [MenuScene, GameScene],
    scene: [GameScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true,
        }
    }
};