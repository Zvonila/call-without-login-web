import './style.css'

const textareaForOffer = document.querySelector("#offer") as HTMLTextAreaElement;
const textareaForAnswer = document.querySelector("#answer") as HTMLTextAreaElement;
const createRoomButton = document.querySelector("#create-room") as HTMLButtonElement;
const connectToRoomButton = document.querySelector("#connect-to-room") as HTMLButtonElement;

const localVideo = document.querySelector("#localVideo") as HTMLVideoElement;
const remoteVideo = document.querySelector("#remoteVideo") as HTMLVideoElement;

const peerConnection = new RTCPeerConnection();

const localStream = await navigator.mediaDevices.getUserMedia({ video: true });
localVideo.srcObject = localStream;
localStream.getTracks().forEach(track => {
  peerConnection.addTrack(track, localStream);
});

peerConnection.addEventListener('track', async (event) => {
  const [remoteStream] = event.streams;
  console.log("Получен remote stream:", remoteStream);
  remoteVideo.srcObject = remoteStream;
});

const localCandidates: RTCIceCandidateInit[] = [];
peerConnection.onicecandidate = event => {
  if (event.candidate) {
    localCandidates.push(event.candidate.toJSON());
    console.log("Local ICE candidate:", event.candidate);
  } else {
    // Когда ICE собрались полностью, выводим всё в textarea
    const data = {
      sdp: peerConnection.localDescription,
      ice: localCandidates
    };
    if (peerConnection.localDescription?.type === 'offer') {
      textareaForOffer.value = JSON.stringify(data);
    } else {
      textareaForAnswer.value = JSON.stringify(data);
    }
  }
};

createRoomButton.addEventListener("click", async () => {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
})

connectToRoomButton.addEventListener("click", async () => {
  const data = JSON.parse(textareaForOffer.value);
  const offer = data.sdp as RTCSessionDescriptionInit;
  const iceCandidates = data.ice as RTCIceCandidateInit[];

  await peerConnection.setRemoteDescription(offer);

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  // Добавляем ICE от другого устройства
  iceCandidates.forEach(c => peerConnection.addIceCandidate(new RTCIceCandidate(c)));

  // Выводим Answer и свои ICE
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      localCandidates.push(event.candidate.toJSON());
    } else {
      const data = {
        sdp: peerConnection.localDescription,
        ice: localCandidates
      };
      textareaForAnswer.value = JSON.stringify(data);
    }
  };
});

textareaForAnswer.addEventListener("change", async () => {
  const data = JSON.parse(textareaForAnswer.value);
  const answer = data.sdp as RTCSessionDescriptionInit;
  const iceCandidates = data.ice as RTCIceCandidateInit[];

  await peerConnection.setRemoteDescription(answer);
  iceCandidates.forEach(c => peerConnection.addIceCandidate(new RTCIceCandidate(c)));
});