export default class MenuScene extends Phaser.Scene {

    mainMenuGroup;
    levelSelectGroup;
    graphics;

    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        this.drawBackground();

        this.mainMenuGroup = this.add.container(0, 0);
        this.levelSelectGroup = this.add.container(this.scale.width, 0);

        const title = this.add.text(centerX, centerY - 150, 'SYNTH WAVE RIDER', {
            font: '100px Inter',
            fill: '#ffffff',
            stroke: '#ff00ff',
            strokeThickness: 3,
            shadow: { offsetX: 0, offsetY: 0, color: '#ff00ff', blur: 30, fill: true }
        }).setOrigin(0.5);

        const playButton = this.createMenuButton(centerX, centerY + 100, 'JOUER', '#00ffff', () => {
            this.showLevelSelect();
        });

        const infoText = this.add.text(centerX, this.scale.height - 50, 'Fait pour la Game Off 2025', {
            font: '20px Inter',
            fill: '#444444'
        }).setOrigin(0.5);

        this.mainMenuGroup.add([title, playButton, infoText]);

        const levelTitle = this.add.text(centerX, centerY - 250, 'CHOIX DU NIVEAU', {
            font: '80px Inter',
            fill: '#ffffff',
            stroke: '#00ffff',
            strokeThickness: 2,
            shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 20, fill: true }
        }).setOrigin(0.5);

        const backButton = this.createMenuButton(centerX - 800, 100, '< RETOUR', '#ff00ff', () => {
            this.showMainMenu();
        });

        this.levelSelectGroup.add([levelTitle, backButton]);

        const gridStartX = centerX - 300;
        const gridStartY = centerY - 50;
        const colWidth = 300;
        const rowHeight = 150;
        let levelCounter = 1;

        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 3; col++) {
                const x = gridStartX + col * colWidth;
                const y = gridStartY + row * rowHeight;
                const levelId = levelCounter;
                
                const levelButton = this.createMenuButton(x, y, `NIVEAU ${levelId}`, '#ffffff', () => {
                    this.selectLevel(levelId);
                });

                this.levelSelectGroup.add(levelButton);
                levelCounter++;
            }
        }
    }

    drawBackground() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const horizonY = centerY + 100;

        const sky = this.add.graphics();
        sky.fillStyle(0x0a0a2a, 1);
        sky.fillRect(0, 0, this.scale.width, this.scale.height);
        const sun = this.add.graphics();
        sun.fillStyle(0xff00ff, 0.5);
        sun.fillCircle(centerX, horizonY - 50, 150);
        sun.fillStyle(0xffffff, 0.8);
        sun.fillCircle(centerX, horizonY - 50, 100);

        const grid = this.add.graphics();
        grid.lineStyle(2, 0x00ffff, 0.3);

        for (let i = 0; i < 10; i++) {
            const y = horizonY + (i * i * 5);
            if (y > this.scale.height) break;
            grid.lineBetween(0, y, this.scale.width, y);
        }

        const lines = 10;
        for (let i = 0; i <= lines; i++) {
            const x = centerX + (i - lines / 2) * (this.scale.width / lines);
            const t = Math.abs(i - lines / 2) / (lines / 2);
            const endX = centerX + (i - lines / 2) * (this.scale.width * t * t);
            grid.lineBetween(x, horizonY, endX, this.scale.height);
        }
    }

    createMenuButton(x, y, text, color, onClickCallback) {
        const buttonWidth = 280;
        const buttonHeight = 70;
        
        const colorHex = Phaser.Display.Color.ValueToColor(color).color;
        
        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x0e0e0e, 0.5);
        bg.lineStyle(3, colorHex, 1);
        bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
        bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);

        const buttonText = this.add.text(0, 0, text.toUpperCase(), {
            font: '32px Inter',
            fill: '#ffffff',
            stroke: color,
            strokeThickness: 0.5,
        }).setOrigin(0.5);

        buttonText.setShadow(0, 0, color, 10, true, true);

        container.add([bg, buttonText]);
        
        container.setSize(buttonWidth, buttonHeight);
        container.setInteractive({ useHandCursor: true });

        this.tweens.add({
            targets: container,
            scale: 1.05,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        container.on('pointerover', () => {
            bg.clear().fillStyle(colorHex, 0.2).lineStyle(4, colorHex, 1);
            bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
            bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
            buttonText.setFill(color);
        });

        container.on('pointerout', () => {
            bg.clear().fillStyle(0x0e0e0e, 0.5).lineStyle(3, colorHex, 1);
            bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
            bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
            buttonText.setFill('#ffffff');
        });

        container.on('pointerdown', () => {
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: 50,
                yoyo: true,
                ease: 'Quad.easeOut'
            });
            onClickCallback();
        });

        return container;
    }

    showLevelSelect() {
        this.tweens.add({
            targets: this.mainMenuGroup,
            x: -this.scale.width,
            duration: 500,
            ease: 'Cubic.easeInOut'
        });

        this.tweens.add({
            targets: this.levelSelectGroup,
            x: 0,
            duration: 500,
            ease: 'Cubic.easeInOut'
        });
    }

    showMainMenu() {
        this.tweens.add({
            targets: this.mainMenuGroup,
            x: 0,
            duration: 500,
            ease: 'Cubic.easeInOut'
        });

        this.tweens.add({
            targets: this.levelSelectGroup,
            x: this.scale.width,
            duration: 500,
            ease: 'Cubic.easeInOut'
        });
    }

    selectLevel(levelId) {
        console.log(`Lancement du niveau ${levelId}`);
        this.cameras.main.fadeOut(500, 14, 14, 14);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, (cam, effect) => {
            this.scene.start('GameScene', { level: levelId });
        });
    }
}