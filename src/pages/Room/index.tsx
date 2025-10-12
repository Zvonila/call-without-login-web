import { FC, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./style.module.scss";
import { Button } from "@shared/ui";
import { useZvonilaCore, useZvonilaState } from "@entities/core/context";
// import Video from "@shared/assets/video.svg?react";
// import VideoSlash from "@shared/assets/video-slash.svg?react";
// import Micro from "@shared/assets/microphone.svg?react";
// import MicroSlash from "@shared/assets/microphone-slash.svg?react";

export const RoomPage: FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const core = useZvonilaCore();
    const coreState = useZvonilaState();
    // const [videoIsEnable, setVideoIsEnable] = useState(true);
    // const [microIsEnable, setMicroIsEnable] = useState(true);

    const localVideoElementRef = useRef<HTMLVideoElement>(null);
    const remoteVideoElementRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (remoteVideoElementRef.current && coreState.remoteStream) {
            remoteVideoElementRef.current.srcObject = coreState.remoteStream;
        }
    }, [coreState.remoteStream]);


    useEffect(() => {
        if (localVideoElementRef.current && coreState.localStream) {
            localVideoElementRef.current.srcObject = coreState.localStream;
        }
    }, [coreState.localStream]);

    useEffect(() => {
        if (coreState.isCreator || !id) return;
        const connect = async () => {
            await core.connectToRoom(id);
        }

        connect();
    }, [])

    return (
        <div className={styles["room"]}>
            <div className={styles["room-id"]}>Комната: {id}</div>
            <div className={styles["room-remote-container"]}>
                <video
                    ref={remoteVideoElementRef}
                    onClick={() => null}
                    autoPlay
                    playsInline
                ></video>
            </div>

            <div className={styles["room-local-container"]}>
                <video
                    ref={localVideoElementRef}
                    onClick={() => null}
                    autoPlay
                    muted
                    playsInline
                ></video>
            </div>

            <div className={styles["room-controls"]}>
                <Button onClick={async () => {
                    await core.disconnectFromTheRoom()
                    navigate("/")
                }}>
                    Выйти
                </Button>

                {/* <Button onClick={() => {
                    core.createMediaStream({ video: !videoIsEnable })
                    setVideoIsEnable(prev => !prev)
                }}>
                    {videoIsEnable ? <Video /> : <VideoSlash />}
                </Button>

                <Button onClick={() => {
                    core.createMediaStream({ audio: !microIsEnable })
                    setMicroIsEnable(prev => !prev)
                }}>
                    {microIsEnable ? <Micro /> : <MicroSlash />}
                </Button> */}
            </div>
        </div>
    )
}