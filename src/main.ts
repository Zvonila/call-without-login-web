import { PageController } from "./pageController";
import { Repository } from "./repository";
import { ZvonilaCore } from "./newwebrtc";
import "./style.css";

// --- DOM ---
const connectToRoomButton = document.querySelector("#connect-to-room") as HTMLButtonElement;
const createRoomButton = document.querySelector("#create-room") as HTMLButtonElement;
const localVideo = document.querySelector("#localVideo") as HTMLVideoElement;
const remoteVideo = document.querySelector("#remoteVideo") as HTMLVideoElement;
const exitFromRoomButton = document.querySelector("#exit-from-room") as HTMLButtonElement;
const copyKeyButton = document.querySelector("#copy-key") as HTMLButtonElement;

// --- Router ---
const pageController = new PageController([
  {
    path: "/",
    id: "hall-page"
  },
  {
    path: "/conference",
    id: "conference-page"
  },
]);

// --- Repository (Firebase) ---
const repo = new Repository()

// --- Zvonila Core ---
const zvonilaCore = new ZvonilaCore({
  repo: repo,
  localVideoElement: localVideo,
  remoteVideoElement: remoteVideo,
});

// --- Listeners ---
connectToRoomButton.addEventListener("click", async () => {
  let inputKey = (document.querySelector("#room-id") as HTMLInputElement).value
  pageController.goTo(`/conference`)

  if (inputKey) {
    await zvonilaCore.connectToRoom(inputKey);
  }
})

createRoomButton.addEventListener("click", async () => {
  await zvonilaCore.createRoom();
  pageController.goTo("/conference")
  console.log(zvonilaCore.currentRoomId)
})

exitFromRoomButton.addEventListener("click", () => {
  zvonilaCore.disconnectFromTheRoom();
  pageController.goTo("/")
})

copyKeyButton.addEventListener("click", () => {
  if (zvonilaCore.currentRoomId) {
    navigator.clipboard.writeText(zvonilaCore.currentRoomId)
  }
})

setInterval(() => {
  console.clear();
  zvonilaCore.logs.map(log => {
    console.log(log)
  });
  (document.querySelector("#status") as HTMLParagraphElement).textContent = zvonilaCore.logs[zvonilaCore.logs.length - 1]
}, 1000)