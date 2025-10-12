import { FC } from "react";
import styles from "./style.module.scss";

interface IGifSequenceProps {
    urls: string[]
}

export const GifSequence: FC<IGifSequenceProps> = ({ urls }) => {
    return (
        <div className={styles["gifs"]}>
            <img src={urls[1]} />
        </div>
    )
}