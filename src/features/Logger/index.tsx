import { useZvonilaState } from "@entities/core/context";
import { FC } from "react";
import styles from "./styles.module.scss";

export const Logger: FC = () => {
    const coreState = useZvonilaState();

    return (
        <div className={styles["logger"]}>
            <p>logger:</p>
            <p>{coreState.logs[coreState.logs.length - 1]}</p>
        </div>
    )
}