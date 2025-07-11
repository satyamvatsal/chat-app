const newMsgSound = new Audio("/sounds/new.mp3");
const receiveSound = new Audio("/sounds/received.mp3");
const sendSound = new Audio("/sounds/sent.mp3");

export const playReceiveSound = () => {
  receiveSound.currentTime = 0;
  receiveSound.play().catch(console.warn);
};

export const playMsgSound = () => {
  newMsgSound.currentTime = 0;
  newMsgSound.play().catch(console.warn);
};

export const playSendSound = () => {
  sendSound.currentTime = 0;
  sendSound.play().catch(console.warn);
};
