import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Repository } from "./repository";
import { ZvonilaCore } from "./core";

const CoreContext = createContext<ZvonilaCore | null>(null)

export function ZvonilaCoreProvider({ children }: { children: ReactNode }) {
  const core = useMemo(() => {
    const repoInstance = new Repository();
    return new ZvonilaCore({ repo: repoInstance });
  }, [])

  return (
    <CoreContext.Provider value={core}>
      {children}
    </CoreContext.Provider>
  );
}

export function useZvonilaCore() {
  const core = useContext(CoreContext);
  if (!core) {
    throw new Error('useZvonilaCore должен использоваться внутри ZvonilaCoreProvider');
  }
  return core;
}

export function useZvonilaState() {
    const core = useZvonilaCore();
    
    const [, setForceUpdate] = useState(0);

    useEffect(() => {
        const listener = () => {
            setForceUpdate(prev => prev + 1);
        };

        core.addListener(listener);
        return () => {
            core.removeListener(listener);
        };
    }, [core]); 

    return {
        localStream: core.localStream,
        remoteStream: core.remoteStream,
        logs: core.logs,
        currentRoomId: core.currentRoomId,
        isCreator: core.isCreator,
    };
}