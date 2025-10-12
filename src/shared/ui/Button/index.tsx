import { forwardRef } from "react";
import { IButtonProps } from "./type";
import styles from "./style.module.scss";
import clsx from "clsx";

export const Button = forwardRef<HTMLButtonElement, IButtonProps>(({
    children,
    className,
    ...props
}, ref) => {
    return (
        <button 
            ref={ref} 
            className={clsx(
                styles["button"],
                className,
            )}
            {...props}
        >
            {children}
        </button>
    )
})