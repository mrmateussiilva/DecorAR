"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WebGLRenderer } from "three";
import type { XRSupportStatus } from "./types";

export type XRSessionManagerOptions = {
  /** Callback quando a sessão termina (ex.: usuário sai). */
  onSessionEnd?: () => void;
  /** Callback no evento select da sessão (ex.: toque para posicionar). */
  onSelect?: () => void;
};

export type XRSessionManagerResult = {
  /** Sessão WebXR ativa ou null. */
  session: XRSession | null;
  /** Suporte a immersive-ar: checking | supported | unsupported. */
  supportStatus: XRSupportStatus;
  /** Mensagem de status para UI. */
  message: string;
  /** Inicia sessão immersive-ar. overlayRoot opcional para dom-overlay. */
  startSession: (renderer: WebGLRenderer, overlayRoot?: Element | null) => Promise<void>;
  /** Encerra a sessão e faz cleanup. */
  endSession: () => Promise<void>;
  /** Ref estável da sessão atual (para uso em callbacks/effects). */
  sessionRef: React.MutableRefObject<XRSession | null>;
};

function getXRNavigator(): XRSystem | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { xr?: XRSystem }).xr;
}

/**
 * Gerencia ciclo de vida da sessão WebXR (immersive-ar).
 * - Verifica suporte ao montar.
 * - startSession: requestSession + setSession no renderer; onSessionEnd no teardown.
 * - Nenhum componente visual deve chamar requestSession diretamente; usar startSession deste hook.
 */
export function useXRSessionManager(
  options: XRSessionManagerOptions = {}
): XRSessionManagerResult {
  const { onSessionEnd, onSelect } = options;
  const sessionRef = useRef<XRSession | null>(null);
  const [session, setSession] = useState<XRSession | null>(null);
  const [supportStatus, setSupportStatus] = useState<XRSupportStatus>("checking");
  const [message, setMessage] = useState<string>("Verificando suporte a AR...");
  const onSessionEndRef = useRef(onSessionEnd);
  const onSelectRef = useRef(onSelect);
  onSessionEndRef.current = onSessionEnd;
  onSelectRef.current = onSelect;

  useEffect(() => {
    let isMounted = true;
    const xr = getXRNavigator();

    if (!xr) {
      setSupportStatus("unsupported");
      setMessage("AR não suportado neste dispositivo/navegador. Use Chrome no Android.");
      return () => {
        isMounted = false;
      };
    }

    xr.isSessionSupported("immersive-ar").then(
      (supported) => {
        if (!isMounted) return;
        setSupportStatus(supported ? "supported" : "unsupported");
        setMessage(
          supported
            ? 'Pronto para AR. Toque em "Enter AR Mode" em um dispositivo compatível.'
            : "AR não suportado neste dispositivo/navegador. Use Chrome no Android."
        );
      },
      () => {
        if (!isMounted) return;
        setSupportStatus("unsupported");
        setMessage("Não foi possível verificar suporte a AR neste dispositivo.");
      }
    );

    return () => {
      isMounted = false;
    };
  }, []);

  const startSession = useCallback(async (
    renderer: WebGLRenderer,
    overlayRoot?: Element | null
  ) => {
    const xr = getXRNavigator();
    if (!xr) {
      setMessage("WebXR indisponível neste navegador.");
      return;
    }

    setMessage("Iniciando sessão AR...");

    const sessionInit: XRSessionInit & { domOverlay?: { root: Element } } = {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["local-floor", "dom-overlay"]
    };
    if (overlayRoot) {
      sessionInit.domOverlay = { root: overlayRoot };
    }

    try {
      const newSession = await xr.requestSession("immersive-ar", sessionInit);
      sessionRef.current = newSession;
      setSession(newSession);

      const handleEnd = () => {
        sessionRef.current = null;
        setSession(null);
        setMessage("Sessão AR encerrada.");
        newSession.removeEventListener("end", handleEnd);
        newSession.removeEventListener("select", handleSelect);
        onSessionEndRef.current?.();
      };

      const handleSelect = () => {
        onSelectRef.current?.();
      };

      newSession.addEventListener("end", handleEnd);
      newSession.addEventListener("select", handleSelect);

      renderer.xr.setReferenceSpaceType("local-floor");
      await renderer.xr.setSession(newSession);
    } catch (err) {
      sessionRef.current = null;
      setSession(null);
      const text = err instanceof Error ? err.message : "Não foi possível iniciar o modo AR.";
      setMessage(`Falha ao iniciar AR: ${text}`);
    }
  }, []);

  const endSession = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    try {
      await current.end();
    } catch {
      setMessage("Falha ao encerrar sessão AR.");
    }
  }, []);

  return {
    session,
    supportStatus,
    message,
    startSession,
    endSession,
    sessionRef
  };
}
