import type { Repository } from "./repository";

interface IZvonilaCoreProps {
    repo: Repository;
    localVideoElement: HTMLVideoElement;
    remoteVideoElement: HTMLVideoElement;
}

interface IZvonilaCreateOffer {
    candidates: RTCIceCandidate[];
    offer: RTCSessionDescriptionInit;
}

interface IZvonilaCreateAnswer {
    candidates: RTCIceCandidate[];
    answer: RTCSessionDescriptionInit;
}

export class ZvonilaCore {
    private pc: RTCPeerConnection;
    private repo: Repository;
    public currentRoomId: string | null = null;
    private localStream: MediaStream | null = null;

    localVideoElement: HTMLVideoElement;
    remoteVideoElement: HTMLVideoElement;

    constructor(props: IZvonilaCoreProps) {
        this.repo = props.repo;
        this.localVideoElement = props.localVideoElement;
        this.remoteVideoElement = props.remoteVideoElement;
        this.pc = this.createPeerConnection();
    }

    private createPeerConnection(): RTCPeerConnection {
        return new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                {
                    urls: "turn:relay.metered.ca:80",
                    username: "webrtc",
                    credential: "webrtc"
                }
            ]
        });
    }

    private async createMediaStream() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            this.localVideoElement.srcObject = this.localStream;
            this.localStream.getTracks().forEach(track => {
                this.pc.addTrack(track, this.localStream!);
            });
            console.log("✅ Создание медиапотока успешно")
        } catch (err) {
            console.log("❗️ Создание медиапотока провалено")
        }
    }

    private onRemoteTrack() {
        this.pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            this.remoteVideoElement.srcObject = remoteStream;
            console.log("✅ remoteStream получен!");
        }
    }

    private async createOffer(): Promise<IZvonilaCreateOffer> {
        return new Promise(async (resolve, reject) => {
            const candidates: RTCIceCandidate[] = [];
            let offer: RTCSessionDescriptionInit;

            this.pc.onicecandidate = event => {
                if (event.candidate) {
                    candidates.push(event.candidate);
                } else {
                    console.log("✅ Создание оффера и поиск кандидатов успешно!")
                    resolve({ candidates, offer })
                }
            }

            try {
                offer = await this.pc.createOffer();
                await this.pc.setLocalDescription(offer);
            } catch (err) {
                console.log("❗️ Создание оффера и поиск кандидатов провалено!")
                reject(err)
            }
        })
    }

    private async answerListener(roomId: string) {
        // Слушаем ответ answer
        this.repo.listenRoom(roomId, async (data) => {
            if (!this.pc.currentRemoteDescription && data?.answer) {
                try {
                    await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                    console.log("✅ Удалённый ответ получен и установлен!")
                } catch (err) {
                    console.log("❗️ Удалённый ответ получен, но не установлен!")
                }
            }
        })

        // Слушаем ICE candidates второго клиента (НЕ ПРОВЕРЕННОЕ МЕСТО)
        this.repo.listenCalleeCandidates(roomId, async (candidateData) => {
            try {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidateData));
                console.log("✅ Удалённый кандидат добавлен!")
            } catch (err) {
                console.log("❗️ Удалённый кандидат не добавлен!")
            }
        })
    }

    public async createRoom() {
        this.onRemoteTrack();
        await this.createMediaStream();
        const { offer, candidates } = await this.createOffer();
        // Запись данных в бд
        const roomId = await this.repo.createRoom(offer);
        this.currentRoomId = roomId;
        candidates.forEach(async candidate => {
            await this.repo.addCandidate(roomId, true, candidate)
        })
        await this.answerListener(roomId);
    }

    private async createAnswer(offer: RTCSessionDescriptionInit): Promise<IZvonilaCreateAnswer> {
        return new Promise(async (resolve, reject) => {
            const candidates: RTCIceCandidate[] = [];
            let answer: RTCSessionDescriptionInit;

            this.pc.onicecandidate = event => {
                if (event.candidate) {
                    candidates.push(event.candidate);
                } else {
                    console.log("✅ Создание ответа и поиск кандидатов успешно!")
                    resolve({ candidates, answer })
                }
            }

            try {
                await this.pc.setRemoteDescription(new RTCSessionDescription(offer))
                answer = await this.pc.createAnswer();
                await this.pc.setLocalDescription(answer);
            } catch (err) {
                console.log("❗️ Создание ответа и поиск кандидатов провалено!")
                reject(err)
            }
        })
    }

    private async listenCallerCandidates(roomId: string) {
        // Слушаем ICE candidates первого клиента (НЕ ПРОВЕРЕННОЕ МЕСТО)
        this.repo.listenCallerCandidates(roomId, async (candidateData) => {
            try {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidateData));
                console.log("✅ Удалённый кандидат добавлен!")
            } catch (err) {
                console.log("❗️ Удалённый кандидат не добавлен!")
            }
        })
    }

    public async connectToRoom(id: string) {
        const room = await this.repo.getRoom(id);
        if (!room) {
            console.log("❗️ Комната не найдена!")
            return;
        }
        this.onRemoteTrack();
        await this.createMediaStream();
        this.currentRoomId = id;
        const { candidates, answer } = await this.createAnswer(room.offer);
        // Запись данных в бд
        await this.repo.updateRoom(id, { answer });
        candidates.forEach(async candidate => {
            await this.repo.addCandidate(id, false, candidate)
        })
        this.listenCallerCandidates(id);
    }

    public async disconnectFromTheRoom() {
        try {
            this.localStream?.getTracks().forEach(track => track.stop());
            this.pc.close();
            this.pc = this.createPeerConnection();
            if (this.localVideoElement) this.localVideoElement.srcObject = null;
            if (this.remoteVideoElement) this.remoteVideoElement.srcObject = null;
            await this.repo.removeRoom(this.currentRoomId!);
            console.log("✅ Звонок завершён корректно")
        } catch (err) {
            console.log("❗️ Звонок завершён некорректно")
        }
    }
}