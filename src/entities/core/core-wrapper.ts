import { useEffect, useState } from "react";
import { ZvonilaCore } from "./core";

export const useEventEmitter = (instance: ZvonilaCore) => {
    const [, forceUpdate] = useState<number>(0);

    useEffect(() => {
        const newListener = () => {
            forceUpdate(prev => prev + 1);
        };

        instance.addListener(newListener);  
        return () => {
            instance.removeListener(newListener);
        };
    }, [instance])

    return instance;
}