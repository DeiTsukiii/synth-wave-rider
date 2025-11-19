import { CONFIG } from "./config.js";

const game = new Phaser.Game(CONFIG);

// mettre le site en grand écran
// if (document.documentElement.requestFullscreen) {
//     document.documentElement.requestFullscreen();
// } else if (document.documentElement.mozRequestFullScreen) { /* Firefox */
//     document.documentElement.mozRequestFullScreen();
// } else if (document.documentElement.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
//     document.documentElement.webkitRequestFullscreen();
// } else if (document.documentElement.msRequestFullscreen) { /* IE/Edge */
//     document.documentElement.msRequestFullscreen();
// }

export default game;