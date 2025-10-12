import { useZvonilaCore } from "@entities/core/context";
import { Button } from "@shared/ui";
import { GifSequence } from "@widgets";
import { FC, useState } from "react";
import { useNavigate } from "react-router-dom";
import Gif1 from "@shared/assets/gifs/call1.gif";
import Gif2 from "@shared/assets/gifs/call2.gif";
import styles from "./style.module.scss";
import PlusIcon from "@shared/assets/plus.svg?react";

export const HomePage: FC = () => {
    const navigate = useNavigate();
    const core = useZvonilaCore();

    const [loading, setLoading] = useState<boolean>(false);

    async function createRoomHandler() {
        setLoading(true)
        const roomId = await core.createRoom();
        if (roomId) navigate(`/room/${roomId}`)
        setLoading(false)
    }

    return (
        <div className="container">
            <div className={styles["home"]}>
                <div className={styles["home-content"]}>
                    <div className={styles["home-gif-container"]}>
                        <GifSequence
                            urls={[
                                Gif1,
                                Gif2
                            ]}
                        />
                    </div>

                    <div className={styles["home-info"]}>
                        <h1 className={styles["home-title"]}>Мгновенные звонки.<br/> Без регистрации.</h1>
                        <p className={styles["home-description"]}>
                            Звонила это открытое решение для видео звонков по IP.
                            Для начала звонка вам нужно нажать на кнопку "Создать комнату", а после перехода
                            в комнату скопировать ссылку и поделиться ей с вторым пользователем. 
                            {loading && "загрузка..."}
                        </p>
                        <Button 
                            className={styles["home-button"]} 
                            onClick={createRoomHandler}
                        >
                            <PlusIcon />
                            Создать комнату
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}