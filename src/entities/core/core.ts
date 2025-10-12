import { EventEmitter } from "./event-emitter";
import type { Repository } from "./repository";

interface IZvonilaCoreProps {
    repo: Repository;
}

export class ZvonilaCore extends EventEmitter {
    private pc: RTCPeerConnection;
    private repo: Repository;
    public currentRoomId: string | null = null;
    public localStream: MediaStream | null = null;
    public remoteStream: MediaStream | null = null;
    public logs: string[] = [];
    public isCreator: boolean = false;
    private pendingCandidates: RTCIceCandidate[] = [];

    constructor(props: IZvonilaCoreProps) {
        super();
        this.repo = props.repo;
        this.pc = this.createPeerConnection();
        this.setupIceCandidateHandler();
    }

    private createPeerConnection(): RTCPeerConnection {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: import.meta.env.VITE_STUN_URL },
                { urls: "stun:stun4.l.google.com:19302" },
                {
                    urls: import.meta.env.VITE_TURN_URL,
                    username: import.meta.env.VITE_TURN_USERNAME,
                    credential: import.meta.env.VITE_TURN_CREDENTIAL
                }
            ],
        });

        pc.onicegatheringstatechange = () => {
            this.logs.push(`iceGatheringState: ${pc.iceGatheringState}`);
            this.notify();
        };
        pc.oniceconnectionstatechange = () => {
            this.logs.push(`iceConnectionState: ${pc.iceConnectionState}`);
            this.notify();
        };

        return pc
    }

    public async createMediaStream({ video = true, audio = true }: { video?: boolean, audio?: boolean }) {
        try {
            this.localStream?.getTracks().forEach(track => track.stop());
            this.localStream = await navigator.mediaDevices.getUserMedia({ video: video, audio: audio });
            this.localStream.getTracks().forEach(track => {
                this.pc.addTrack(track, this.localStream!);
            });
            this.logs.push("✅ Создание медиапотока успешно")
            this.notify();
        } catch (err) {
            this.logs.push("❗️ Создание медиапотока провалено")
        }
    }

    public onRemoteTrack() {
        this.pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            this.remoteStream = remoteStream;
            this.logs.push("✅ remoteStream получен!");
            this.notify();
        }
    }

    private async createOffer(): Promise<RTCSessionDescriptionInit> {
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        this.logs.push("✅ Создание оффера и поиск кандидатов успешно!")

        return offer;
    }

    // private findCandidate(roomId: string, isCreator: boolean) {
    //     this.logs.push("Поиск ICE кандидатов")
    //     this.pc.onicecandidate = async (event) => {
    //         if (event.candidate) {
    //             try {
    //                 await this.repo.addCandidate(roomId, isCreator, event.candidate);
    //                 this.logs.push("ICE кандидат успешно добавлен");
    //             } catch (error) {
    //                 console.log(`Ошибка при добавлении ICE кандидата: ${error}`);
    //             }
    //         }
    //     }
    // }

    private setupIceCandidateHandler() {
        this.pc.onicecandidate = async (event) => {
            if (!event.candidate) return;
            const candidate = event.candidate;
            // если комнаты ещё нет — буферизуем
            if (!this.currentRoomId) {
                this.pendingCandidates.push(candidate);
                this.logs.push("Буферизация ICE кандидата (комната ещё не создана)");
                this.notify();
                return;
            }
            try {
                await this.repo.addCandidate(this.currentRoomId, this.isCreator, candidate);
                this.logs.push("ICE кандидат успешно добавлен");
                this.notify();
            } catch (error) {
                this.logs.push(`Ошибка при добавлении ICE кандидата: ${error}`);
                this.notify();
            }
        };
    }

    private async flushPendingCandidates(roomId: string, isCreator: boolean) {
        for (const cand of this.pendingCandidates) {
            try {
                await this.repo.addCandidate(roomId, isCreator, cand);
                this.logs.push("Буферный кандидат отправлен в репозиторий");
            } catch (err) {
                this.logs.push("Ошибка при отправке буферного кандидата");
            }
        }
        this.pendingCandidates = [];
        this.notify();
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
        await this.createMediaStream({});
        const offer = await this.createOffer();
        this.isCreator = true;
        // Запись данных в бд
        const roomId = await this.repo.createRoom(offer);
        this.currentRoomId = roomId;

        await this.flushPendingCandidates(roomId, true)
        // this.findCandidate(roomId, true)
        await this.answerListener(roomId);
        this.notify();

        return roomId;
    }

    private async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
        await this.pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.logs.push("✅ Создание ответа и поиск кандидатов успешно!")
        return answer
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
            this.notify();
            return;
        }
        this.onRemoteTrack();
        await this.createMediaStream({});
        this.currentRoomId = id;
        await this.flushPendingCandidates(id, false)
        const answer = await this.createAnswer(room.offer);
        // Запись данных в бд
        await this.repo.updateRoom(id, { answer });
        this.listenCallerCandidates(id);
        this.notify();
    }

    public async disconnectFromTheRoom() {
        try {
            this.localStream?.getTracks().forEach(track => track.stop());
            this.pc.close();
            this.pc = this.createPeerConnection();
            await this.repo.removeRoom(this.currentRoomId!);
            this.logs.push("✅ Звонок завершён корректно")
            this.notify();
        } catch (err) {
            this.logs.push("❗️ Звонок завершён некорректно")
            this.notify();
        }
    }
}