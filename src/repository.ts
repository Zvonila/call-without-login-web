import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { IRoom } from "./type";

export class Repository {

    public async getRoom(id: string): Promise<IRoom | null> {
        const room = await getDoc(doc(collection(db, "rooms"), id));
        // В будущем можно добавить валидацию данных
        if (room.data() === undefined) return null;
        return room.data() as IRoom;
    }

    public async createRoom(offer: RTCSessionDescriptionInit): Promise<string> {
        const roomRef = doc(collection(db, "rooms"));
        await setDoc(roomRef, {
            offer,
            created_at: new Date().toString()
        });
        return roomRef.id;
    }

    public async removeRoom(id: string) {
        await deleteDoc(doc(db, "rooms", id));
    }

    public async updateRoom(id: string, data: any) {
        const roomRef = doc(db, "rooms", id);
        await updateDoc(roomRef, data);
    }

    public listenRoom(id: string, callback: (data: any) => Promise<void>) {
        const roomRef = doc(db, "rooms", id);
        onSnapshot(roomRef, async (snapshot) => {
            const data = snapshot.data() as any;
            callback(data);
        });
    }

    public listenCalleeCandidates(id: string, callback: (candidateInitDict?: RTCLocalIceCandidateInit | undefined) => Promise<void>) {
        const calleeCandidates = collection(db, "rooms", id, "calleeCandidates");
        onSnapshot(calleeCandidates, snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") {
                    callback(change.doc.data())
                }
            });
        });
    }

    public listenCallerCandidates(id: string, callback: (candidateInitDict?: RTCLocalIceCandidateInit | undefined) => Promise<void>) {
        const calleeCandidates = collection(db, "rooms", id, "callerCandidates");
        onSnapshot(calleeCandidates, snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") {
                    callback(change.doc.data())
                }
            });
        });
    }

    public async addCandidate(id: string, isCreator: boolean, candidate: RTCIceCandidate) {
        const candidatesCollection = collection(
            db,
            "rooms",
            id,
            isCreator ? "callerCandidates" : "calleeCandidates"
        );

        await addDoc(candidatesCollection, candidate.toJSON());
    }
}