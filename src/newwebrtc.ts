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
    public logs: string[] = [];

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
                    urls: import.meta.env.VITE_TURN_URL,
                    username: import.meta.env.VITE_TURN_USERNAME,
                    credential: import.meta.env.VITE_TURN_CREDENTIAL
                }
            ],
        });
    }

    private async createMediaStream() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            this.localVideoElement.srcObject = this.localStream;
            this.localStream.getTracks().forEach(track => {
                this.pc.addTrack(track, this.localStream!);
            });
            this.logs.push("✅ Создание медиапотока успешно")
        } catch (err) {
            this.logs.push("❗️ Создание медиапотока провалено")
        }
    }

    private onRemoteTrack() {
        this.pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            this.remoteVideoElement.srcObject = remoteStream;
            this.logs.push("✅ remoteStream получен!");
        }
    }

    private async createOffer(): Promise<IZvonilaCreateOffer> {
        return new Promise(async (resolve, reject) => {
            const candidates: RTCIceCandidate[] = [];
            let offer: RTCSessionDescriptionInit;

            const iceTimeout = setTimeout(() => {
                this.logs.push("⚠️ ICE таймаут, резолвим собранные кандидаты")
                resolve({ candidates, offer })
            }, 10000);

            this.pc.onicecandidate = event => {
                if (event.candidate) {
                    candidates.push(event.candidate);
                } else {
                    clearTimeout(iceTimeout);
                    this.logs.push("✅ Создание оффера и поиск кандидатов успешно!")
                    resolve({ candidates, offer })
                }
            }

            try {
                offer = await this.pc.createOffer();
                await this.pc.setLocalDescription(offer);
            } catch (err) {
                this.logs.push("❗️ Создание оффера и поиск кандидатов провалено!")
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
                    this.logs.push("✅ Удалённый ответ получен и установлен!")
                } catch (err) {
                    this.logs.push("❗️ Удалённый ответ получен, но не установлен!")
                }
            }
        })

        // Слушаем ICE candidates второго клиента (НЕ ПРОВЕРЕННОЕ МЕСТО)
        this.repo.listenCalleeCandidates(roomId, async (candidateData) => {
            try {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidateData));
                this.logs.push("✅ Удалённый кандидат добавлен!")
            } catch (err) {
                this.logs.push("❗️ Удалённый кандидат не добавлен!")
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
                    this.logs.push("✅ Создание ответа и поиск кандидатов успешно!")
                    resolve({ candidates, answer })
                }
            }

            try {
                await this.pc.setRemoteDescription(new RTCSessionDescription(offer))
                answer = await this.pc.createAnswer();
                await this.pc.setLocalDescription(answer);
            } catch (err) {
                this.logs.push("❗️ Создание ответа и поиск кандидатов провалено!")
                reject(err)
            }
        })
    }

    private async listenCallerCandidates(roomId: string) {
        // Слушаем ICE candidates первого клиента (НЕ ПРОВЕРЕННОЕ МЕСТО)
        this.repo.listenCallerCandidates(roomId, async (candidateData) => {
            try {
                await this.pc.addIceCandidate(new RTCIceCandidate(candidateData));
                this.logs.push("✅ Удалённый кандидат добавлен!")
            } catch (err) {
                this.logs.push("❗️ Удалённый кандидат не добавлен!")
            }
        })
    }

    public async connectToRoom(id: string) {
        const room = await this.repo.getRoom(id);
        if (!room) {
            this.logs.push("❗️ Комната не найдена!")
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
            this.logs.push("✅ Звонок завершён корректно")
        } catch (err) {
            this.logs.push("❗️ Звонок завершён некорректно")
        }
    }
}