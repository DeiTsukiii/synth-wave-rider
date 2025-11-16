import { ALL_LEVELS } from "./data/levels.js";

export default class GameScene extends Phaser.Scene {
    levelData = null;
    wavePath = null;
    beatMarkers = null;
    rider = null;
    riderProgress = 0;
    graphics = null;
    restartTimer = null;
    isGameOver = false;
    gameOverText = null;
    pressSinceLastBeat = 0;
    selectedLevelId = 1;
    hitTolerance = 0; 
    perfectTolerance = 0;

    isPointerDown = false;     
    activeHoldNote = null;   
    holdPathGraphics = null; 
    holdProgressGraphics = null; 
    holdCompletedGraphics = null;
    gameStarted = false;
    countdownText = null;

    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.selectedLevelId = data.level || 1;
    }

    preload() {
        this.load.audio(`level${this.selectedLevelId}`, `./assets/music/level${this.selectedLevelId}.mp3`);
    }

    create() {
        this.pressSinceLastBeat = 0;
        this.graphics = this.add.graphics().setDepth(0);
        this.holdPathGraphics = this.add.graphics().setDepth(0);
        this.holdProgressGraphics = this.add.graphics().setDepth(1);
        this.holdCompletedGraphics = this.add.graphics().setDepth(1);

        this.levelData = ALL_LEVELS[this.selectedLevelId] || ALL_LEVELS[1];
        this.hitTolerance = 0.07 * this.levelData.gameSpeed;
        this.perfectTolerance = 0.03 * this.levelData.gameSpeed;

        this.cameras.main.setBounds(0, 0, this.levelData.pathLength + 200, 1080);

        this.createWavePath();
        this.createBeats();
        this.createRider();

        this.input.keyboard.on('keydown', () => this.handlePress(), this);
        this.input.on('pointerdown', () => this.handlePress(), this);
        this.input.keyboard.on('keyup', () => this.handleRelease(), this);
        this.input.on('pointerup', () => this.handleRelease(), this);

        const helpText = this.add.text(this.scale.width / 2, 50, 'Appuyez, Tenez, et Relâchez en rythme !', {
            font: '32px Inter', fill: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0);

        this.gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'GAME OVER', {
            font: '64px Inter', fill: '#ff0000', stroke: '#ffffff', strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setVisible(false).setDepth(100);

        this.isGameOver = false;
        this.isPointerDown = false;
        this.activeHoldNote = null;
        this.gameStarted = false;

        this.startCountdown();
    }

    createWavePath() {
        this.graphics.lineStyle(20, 0x00ffff, 0.2);
        
        const segments = this.levelData.pathLength / 100;   
        const startX = 100;    
        const length = this.levelData.pathLength;
        
        const wavePoints = [];
        
        let totalPhase = 0; 
        const deltaT = 1 / segments; 

        for (let i = 0; i <= segments; i++) {
            const t = i / segments; 
            const x = startX + t * length;
            
            const currentAmplitude = this.getAmplitudeAt(t);
            const currentPeriod = this.getPeriodAt(t);
            
            if (currentPeriod > 0) {
                const currentFrequency = 1 / currentPeriod;
                const deltaPhase = currentFrequency * deltaT * (Math.PI * 2);
                totalPhase += deltaPhase;
            }
            
            const y = this.scale.height / 2 - Math.sin(totalPhase) * currentAmplitude;
            wavePoints.push(new Phaser.Math.Vector2(x, y));
        }

        this.wavePath = new Phaser.Curves.Spline(wavePoints);
        this.wavePath.draw(this.graphics, length / 10);

        this.graphics.lineStyle(6, 0xffffff, 1);
        this.wavePath.draw(this.graphics, length / 10);
    }

    createBeats() {
        this.beatMarkers = this.add.group();

        this.levelData.beatMap.forEach(beat => {
            const t = beat.t;
            const pos = this.wavePath.getPoint(t);
            
            let marker;
            if (t === 1.0) {
                marker = this.add.circle(pos.x, pos.y, 22, 0xffd700, 1); 
                marker.setStrokeStyle(4, 0xffffff, 1);
            } else {
                marker = this.add.circle(pos.x, pos.y, 14, 0xff00ff, 1); 
                marker.setStrokeStyle(3, 0xffffff, 1);
            }

            marker.setDepth(2); 

            marker.setData('t', t); 
            marker.setData('hit', false);
            marker.setData('type', beat.endT ? 'hold' : 'tap');

            if (marker.getData('type') === 'hold') {
                marker.setData('endT', beat.endT);

                this.holdPathGraphics.lineStyle(20, 0xff00ff, 0.2);
                const holdPath = new Phaser.Curves.Path();
                holdPath.moveTo(pos.x, pos.y);

                const holdLength = (beat.endT - t) * this.levelData.pathLength;
                const holdSegments = Math.max(2, Math.floor(holdLength / 10)); 

                for (let i = 1; i <= holdSegments; i++) {
                    const segmentT = t + (beat.endT - t) * (i / holdSegments);
                    const segmentPos = this.wavePath.getPoint(segmentT);
                    holdPath.lineTo(segmentPos.x, segmentPos.y);
                }
                holdPath.draw(this.holdPathGraphics);
                this.holdPathGraphics.lineStyle(6, 0xffffff, 1); 
                holdPath.draw(this.holdPathGraphics);
                const endPos = this.wavePath.getPoint(beat.endT);
                const endMarker = this.add.circle(endPos.x, endPos.y, 10, 0x6a006a, 1); 
                endMarker.setStrokeStyle(2, 0xffffff, 0.5);
                endMarker.setDepth(2); 
            }

            this.beatMarkers.add(marker);
        });
    }

    createRider() {
        this.rider = this.add.graphics().setDepth(10);
        this.riderProgress = 0;
        this.drawRiderGlow(this.rider);

        const startPos = this.wavePath.getPoint(0);
        this.rider.setPosition(startPos.x, startPos.y);

        this.cameras.main.startFollow(this.rider, true);
        this.cameras.main.setLerp(0.1, 0.05); 
        const offsetX = - (this.scale.width / 4);
        this.cameras.main.setFollowOffset(offsetX, 0);
    }

    drawRiderGlow(graphics) {
        graphics.clear();
        graphics.fillStyle(0x00ffff, 0.1);
        graphics.fillCircle(0, 0, 30); 
        graphics.fillStyle(0x00ffff, 0.3);
        graphics.fillCircle(0, 0, 18); 
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(0, 0, 8); 
    }

    handlePress() {
        if (this.isGameOver || !this.gameStarted) return;
        this.isPointerDown = true;

        let closestMarker = null;
        let minDiff = Infinity;
        let closestSignedDiff = 0; 

        this.beatMarkers.getChildren().forEach(marker => {
            if (marker.getData('hit')) return; 
            const beatT = marker.getData('t');
            const signedDiff = this.riderProgress - beatT;
            const diff = Math.abs(signedDiff);

            if (diff < minDiff) {
                minDiff = diff;
                closestMarker = marker;
                closestSignedDiff = signedDiff;
            }
        });

        const tolerance = this.hitTolerance;
        const perfectTolerance = this.perfectTolerance;

        if (closestMarker && minDiff <= tolerance) {
            closestMarker.setData('hit', true);
            this.pressSinceLastBeat = 0;
            const type = closestMarker.getData('type');

            if (type === 'hold') {
                this.activeHoldNote = closestMarker; 
            }

            let feedbackText = '';
            let feedbackColor = '#ffffff';

            if (minDiff <= perfectTolerance) {
                feedbackText = 'PERFECT!';
                feedbackColor = '#00ff00';
                closestMarker.setFillStyle(0x00ff00, 1); 
            } else {
                if (closestSignedDiff < 0) {
                    feedbackText = 'EARLY';
                    feedbackColor = '#ffff00';
                    closestMarker.setFillStyle(0xffff00, 1);
                } else {
                    feedbackText = 'LATE';
                    feedbackColor = '#ffa500';
                    closestMarker.setFillStyle(0xffa500, 1);
                }
            }
            this.showFeedbackText(closestMarker.x, closestMarker.y, feedbackText, feedbackColor);
            
        } else {
            this.pressSinceLastBeat += 1;
            if (this.pressSinceLastBeat >= 3) this.triggerGameOver("OVERLOAD!");
        }
    }

    handleRelease() {
        if (this.isGameOver || !this.gameStarted) return;
        this.isPointerDown = false;

        if (this.activeHoldNote) {
            const note = this.activeHoldNote;
            this.activeHoldNote = null; 
            
            const endT = note.getData('endT');
            const tolerance = this.hitTolerance;
            const perfectTolerance = this.perfectTolerance;

            const signedDiff = this.riderProgress - endT;
            const diff = Math.abs(signedDiff);

            const endPos = this.wavePath.getPoint(endT);
            let feedbackText = '';
            let feedbackColor = '#ffffff';
            let completionColor = 0x00ff00;

            if (diff <= perfectTolerance) {
                feedbackText = 'PERFECT!';
                feedbackColor = '#00ff00';
                completionColor = 0x00ff00;
            } else if (diff <= tolerance) {
                if (signedDiff < 0) {
                    feedbackText = 'EARLY';
                    feedbackColor = '#ffff00';
                    completionColor = 0xffff00;
                } else {
                    feedbackText = 'LATE';
                    feedbackColor = '#ffa500';
                    completionColor = 0xffa500;
                }
            } else {
                this.triggerGameOver("RELEASED WRONG!"); 
                return; 
            }

            this.showFeedbackText(endPos.x, endPos.y, feedbackText, feedbackColor);
            this.drawCompletedHold(note.getData('t'), endT, completionColor);
        }
    }


    showFeedbackText(x, y, message, color) {
        const startY = y - 30; 
        const endY = y - 80;   

        const feedbackText = this.add.text(x, startY, message, {
            font: 'bold 28px Inter', 
            fill: color,
            stroke: '#000000', 
            strokeThickness: 3
        }).setOrigin(0.5, 0.5).setDepth(50); 

        this.tweens.add({
            targets: feedbackText,
            y: endY,       
            alpha: 0,      
            duration: 800, 
            ease: 'Power1.easeOut',
            onComplete: () => {
                feedbackText.destroy(); 
            }
        });
    }

    getAmplitudeAt(t) {
        const map = this.levelData.amplitudeMap;
        if (t <= map[0].t) return map[0].amp;
        if (t >= map[map.length - 1].t) return map[map.length - 1].amp;

        let prevPoint = map[0];
        let nextPoint = map[map.length - 1];

        for (let i = 0; i < map.length - 1; i++) {
            if (t >= map[i].t && t < map[i+1].t) {
                prevPoint = map[i];
                nextPoint = map[i+1];
                break;
            }
        }

        const rangeT = nextPoint.t - prevPoint.t;
        if (rangeT === 0) return prevPoint.amp;
        const progressT = t - prevPoint.t;
        const normalizedT = progressT / rangeT;
        return Phaser.Math.Linear(prevPoint.amp, nextPoint.amp, normalizedT);
    }

    getPeriodAt(t) {
        const map = this.levelData.periodMap;
        if (!map || map.length === 0) {
            return 1;
        }

        if (t <= map[0].t) return map[0].period;
        if (t >= map[map.length - 1].t) return map[map.length - 1].period;

        let prevPoint = map[0];
        let nextPoint = map[map.length - 1];

        for (let i = 0; i < map.length - 1; i++) {
            if (t >= map[i].t && t < map[i+1].t) {
                prevPoint = map[i];
                nextPoint = map[i+1];
                break;
            }
        }

        const rangeT = nextPoint.t - prevPoint.t;
        if (rangeT === 0) return prevPoint.period;
        const progressT = t - prevPoint.t;
        const normalizedT = progressT / rangeT;
        return Phaser.Math.Linear(prevPoint.period, nextPoint.period, normalizedT);
    }
    
    drawCompletedHold(startT, endT, color = 0x00ff00) {
        this.holdCompletedGraphics.lineStyle(20, color, 0.2);
        const holdPath = new Phaser.Curves.Path();
        
        const startPos = this.wavePath.getPoint(startT);
        holdPath.moveTo(startPos.x, startPos.y);

        const holdLength = (endT - startT) * this.levelData.pathLength;
        const holdSegments = Math.max(2, Math.floor(holdLength / 10)); 

        for (let i = 1; i <= holdSegments; i++) {
            const segmentT = startT + (endT - startT) * (i / holdSegments);
            const segmentPos = this.wavePath.getPoint(segmentT);
            holdPath.lineTo(segmentPos.x, segmentPos.y);
        }
        holdPath.draw(this.holdCompletedGraphics);
        this.holdCompletedGraphics.lineStyle(6, 0xffffff, 1);
        holdPath.draw(this.holdCompletedGraphics);
    }

    startCountdown() {
        this.gameStarted = false;
        let countdown = 3; 

        this.countdownText = this.add.text(this.scale.width / 2, this.scale.height / 2, String(countdown), {
            font: '128px Inter',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

        const countdownEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                countdown--;
                
                if (countdown > 0) {
                    this.countdownText.setText(String(countdown));
                    this.tweens.add({ targets: this.countdownText, scale: 1.2, duration: 100, yoyo: true, ease: 'Quad.easeOut' });
                } else {
                    this.gameStarted = true;
                    this.countdownText.setText("GO!").setFontSize('100px');
                    this.tweens.add({
                        targets: this.countdownText,
                        alpha: 0, 
                        scale: 1.3, 
                        duration: 800, 
                        ease: 'Power1.easeIn',
                        onComplete: () => this.countdownText.destroy()
                    });
                    this.startMusic();
                    countdownEvent.remove(); 
                }
            },
            callbackScope: this,
            repeat: 3
        });
    }

    startMusic() {
        this.music = this.sound.add(`level${this.selectedLevelId}`);
        if (this.music) {
            this.music.play({ loop: false });
        } else {
            console.error(`Musique "level${this.selectedLevelId}" non trouvée ou chargée.`);
        }
    }

    triggerWin() {
        if (this.isGameOver) return; 
        
        this.isGameOver = true; 

        this.riderProgress = 1.0;
        const riderPos = this.wavePath.getPoint(1);
        this.rider.setPosition(riderPos.x, riderPos.y);

        this.activeHoldNote = null;
        this.isPointerDown = false;
        this.holdProgressGraphics.clear();

        this.gameOverText.setText("LEVEL COMPLETE!")
            .setFill('#00ff00')
            .setVisible(true);

        if (this.music) this.music.stop();
        this.cameras.main.flash(500, 255, 255, 255); 

        if (this.restartTimer) this.restartTimer.remove();

        const a = () => {
            if (this.music) this.music.destroy();
            this.scene.start('MenuScene');
        }
        this.time.delayedCall(300, () => {
            this.input.keyboard.once('keydown', a);
            this.input.once('pointerdown', a);
        });
    }

    triggerGameOver(reason = "MISSED!") {
        if (this.isGameOver) return; 

        this.isGameOver = true;
        this.activeHoldNote = null; 
        this.isPointerDown = false;
        this.holdProgressGraphics.clear(); 

        if (this.music) this.music.stop();
        this.gameOverText.setText(reason).setVisible(true);
        this.cameras.main.shake(250, 0.01);

        if (this.restartTimer) this.restartTimer.remove();

        const a = () => {
            if (this.music) this.music.destroy();
            this.scene.restart();
        }
        this.time.delayedCall(300, () => {
            this.input.keyboard.once('keydown', a);
            this.input.once('pointerdown', a);
        });
    }

    update(time, delta) {
        if (!this.gameStarted) return;
        if (this.isGameOver) return;

        this.beatMarkers.getChildren().forEach(marker => {
            if (marker.getData('hit')) return; 
            const beatT = marker.getData('t');
            
            if (this.riderProgress >= beatT + this.hitTolerance) {
                marker.setFillStyle(0xff0000, 1); 
                this.triggerGameOver("MISSED!");
            }
        });

        if (this.isGameOver) return; 

        if (this.activeHoldNote) {
            const note = this.activeHoldNote;
            const endT = note.getData('endT');
            const tolerance = this.hitTolerance;

            this.holdProgressGraphics.clear();
            this.holdProgressGraphics.lineStyle(20, 0xffffff, 0.2);

            const progressPath = new Phaser.Curves.Path();
            const startT = note.getData('t');
            const currentT = this.riderProgress;
            
            if (currentT > startT) {
                const startPos = this.wavePath.getPoint(startT);
                progressPath.moveTo(startPos.x, startPos.y);

                const progressLength = (currentT - startT) * this.levelData.pathLength;
                const segments = Math.max(2, Math.floor(progressLength / 10)); 

                for (let i = 1; i <= segments; i++) {
                    const t = i / segments;
                    const segmentT = startT + (currentT - startT) * t;
                    if (segmentT > endT) break; 
                    
                    const segmentPos = this.wavePath.getPoint(segmentT);
                    progressPath.lineTo(segmentPos.x, segmentPos.y);
                }
                progressPath.draw(this.holdProgressGraphics);
                this.holdProgressGraphics.lineStyle(6, 0xffffff, 1);
                progressPath.draw(this.holdProgressGraphics);
            }

            
            if (this.riderProgress < endT - tolerance) {
                if (!this.isPointerDown) {
                    this.activeHoldNote = null; 
                    this.holdProgressGraphics.clear();
                    this.triggerGameOver("RELEASED TOO EARLY!");
                }
            } 
            else if (this.riderProgress > endT + tolerance) {
                if (this.isPointerDown) {
                    this.activeHoldNote = null; 
                    this.holdProgressGraphics.clear();
                    this.triggerGameOver("RELEASED TOO LATE!");
                }
                else {
                    this.activeHoldNote = null;
                }
            }
            
        } else {
             this.holdProgressGraphics.clear();
        }


        if (this.isGameOver) return;

        if (this.riderProgress >= 1.0) {
            this.riderProgress = 1.0;
            this.triggerWin();
        } else {
            this.riderProgress += (this.levelData.gameSpeed * delta) / 1000;
            if (this.riderProgress > 1.0) this.riderProgress = 1.0; 
        }

        const riderPos = this.wavePath.getPoint(this.riderProgress);
        this.rider.setPosition(riderPos.x, riderPos.y);
    }
}