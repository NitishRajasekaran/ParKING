import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "./socket";

/** Refresh admin data when live events arrive. */
export function useAdminLive() {
  const qc = useQueryClient();
  useEffect(() => {
    const s = getSocket();
    const refresh = () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    };
    const evs = ["lot:availability", "ticket:entry", "ticket:exit", "lot:created", "reservation:created", "connect"];
    evs.forEach((e) => s.on(e, refresh));
    return () => { evs.forEach((e) => s.off(e, refresh)); };
  }, [qc]);
}
