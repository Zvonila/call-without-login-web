import { FC } from "react";
import styles from "./style.module.scss";

export const Header: FC = () => {
    return (
        <header className={styles["header"]}>
            <span className={styles["header-logo"]}>Звонила</span>
        </header>
    )
}