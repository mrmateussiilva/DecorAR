"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  MutableRefObject,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import * as THREE from "three";
import { useEditorStore } from "@/store/useEditorStore";
import { XR_RENDERER_OPTIONS } from "@/lib/xr/config";
import { PanelPlane } from "./PanelPlane";

type ARCanvasProps = {
  transformMode: "translate" | "rotate";
};

type XRSupportState = "checking" | "supported" | "unsupported";
type QuaternionTuple = [number, number, number, number];
type HitPoseSnapshot = {
  position: [number, number, number];
  quaternion: QuaternionTuple;
};

type XRPlacementTrackerProps = {
  session: XRSession | null;
  placementLocked: boolean;
  reticleRef: RefObject<THREE.Group>;
  latestHitPoseRef: MutableRefObject<HitPoseSnapshot | null>;
  onHitAvailabilityChange: (available: boolean) => void;
};

function XRPlacementTracker({
  session,
  placementLocked,
  reticleRef,
  latestHitPoseRef,
  onHitAvailabilityChange
}: XRPlacementTrackerProps) {
  const hitTestSourceRef = useRef<XRHitTestSource | null>(null);
  const viewerReferenceSpaceRef = useRef<XRReferenceSpace | null>(null);
  const hitStateRef = useRef(false);

  useEffect(() => {
    let isDisposed = false;

    const cleanup = () => {
      hitTestSourceRef.current?.cancel();
      hitTestSourceRef.current = null;
      viewerReferenceSpaceRef.current = null;
      latestHitPoseRef.current = null;
      if (reticleRef.current) {
        reticleRef.current.visible = false;
      }
      if (hitStateRef.current) {
        hitStateRef.current = false;
        onHitAvailabilityChange(false);
      }
    };

    if (!session) {
      cleanup();
      return cleanup;
    }

    const setupHitTest = async () => {
      try {
        if (!session.requestHitTestSource) {
          cleanup();
          return;
        }

        const viewerReferenceSpace = await session.requestReferenceSpace("viewer");
        if (isDisposed) return;
        viewerReferenceSpaceRef.current = viewerReferenceSpace;
        hitTestSourceRef.current =
          (await session.requestHitTestSource({
            space: viewerReferenceSpace
          })) ?? null;
      } catch {
        cleanup();
      }
    };

    const handleSessionEnd = () => {
      cleanup();
    };

    session.addEventListener("end", handleSessionEnd);
    void setupHitTest();

    return () => {
      isDisposed = true;
      session.removeEventListener("end", handleSessionEnd);
      cleanup();
    };
  }, [session, latestHitPoseRef, onHitAvailabilityChange, reticleRef]);

  useFrame(({ gl }, _, xrFrame) => {
    if (!session || !xrFrame || !hitTestSourceRef.current) return;

    const xrReferenceSpace = gl.xr.getReferenceSpace();
    if (!xrReferenceSpace) return;

    const hitResults = xrFrame.getHitTestResults(hitTestSourceRef.current);
    const hit = hitResults[0];
    const pose = hit?.getPose(xrReferenceSpace);

    if (!pose) {
      latestHitPoseRef.current = null;
      if (reticleRef.current && !placementLocked) {
        reticleRef.current.visible = false;
      }
      if (hitStateRef.current) {
        hitStateRef.current = false;
        onHitAvailabilityChange(false);
      }
      return;
    }

    const { position, orientation } = pose.transform;
    latestHitPoseRef.current = {
      position: [position.x, position.y, position.z],
      quaternion: [orientation.x, orientation.y, orientation.z, orientation.w]
    };

    if (!hitStateRef.current) {
      hitStateRef.current = true;
      onHitAvailabilityChange(true);
    }

    if (!placementLocked && reticleRef.current) {
      reticleRef.current.visible = true;
      reticleRef.current.position.set(position.x, position.y, position.z);
      reticleRef.current.quaternion.set(
        orientation.x,
        orientation.y,
        orientation.z,
        orientation.w
      );
    }
  });

  return null;
}

function SubtleGrid() {
  const gridRef = useRef<THREE.GridHelper>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
    materials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.18;
      material.depthWrite = false;
    });
  }, []);

  return (
    <gridHelper
      ref={gridRef}
      args={[24, 24, "#334155", "#1e293b"]}
      position={[0, 0.001, 0]}
    />
  );
}

function GroundShadowPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <shadowMaterial transparent opacity={0.12} />
    </mesh>
  );
}

export function ARCanvas({ transformMode }: ARCanvasProps) {
  const panels = useEditorStore((state) => state.panels);
  const selectedId = useEditorStore((state) => state.selectedId);
  const selectPanel = useEditorStore((state) => state.selectPanel);
  const sectionRef = useRef<HTMLElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const xrSessionRef = useRef<XRSession | null>(null);
  const reticleRef = useRef<THREE.Group>(null);
  const latestHitPoseRef = useRef<HitPoseSnapshot | null>(null);
  const placementLockedRef = useRef(false);
  const [xrSupportState, setXrSupportState] = useState<XRSupportState>("checking");
  const [xrMessage, setXrMessage] = useState<string>("Verificando suporte a AR...");
  const [xrSession, setXrSession] = useState<XRSession | null>(null);
  const [isPlacementLocked, setIsPlacementLocked] = useState(false);
  const [hitAvailable, setHitAvailable] = useState(false);
  const [sceneRootPosition, setSceneRootPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [sceneRootQuaternion, setSceneRootQuaternion] = useState<QuaternionTuple>([0, 0, 0, 1]);

  const isARActive = xrSession !== null;

  useEffect(() => {
    placementLockedRef.current = isPlacementLocked;
  }, [isPlacementLocked]);

  useEffect(() => {
    let isMounted = true;

    const checkSupport = async () => {
      if (typeof navigator === "undefined") return;

      const xrNavigator = (navigator as Navigator & { xr?: XRSystem }).xr;
      if (!xrNavigator) {
        if (!isMounted) return;
        setXrSupportState("unsupported");
        setXrMessage("AR não suportado neste dispositivo/navegador. Use Chrome no Android.");
        return;
      }

      try {
        const supported = await xrNavigator.isSessionSupported("immersive-ar");
        if (!isMounted) return;
        setXrSupportState(supported ? "supported" : "unsupported");
        setXrMessage(
          supported
            ? "Pronto para AR. Toque em \"Enter AR Mode\" em um dispositivo compatível."
            : "AR não suportado neste dispositivo/navegador. Use Chrome no Android."
        );
      } catch {
        if (!isMounted) return;
        setXrSupportState("unsupported");
        setXrMessage("Não foi possível verificar suporte a AR neste dispositivo.");
      }
    };

    void checkSupport();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateXrInstructionMessage = useCallback(
    (options?: { active?: boolean; hitAvailable?: boolean; placed?: boolean }) => {
      const active = options?.active ?? isARActive;
      const available = options?.hitAvailable ?? hitAvailable;
      const placed = options?.placed ?? isPlacementLocked;

      if (!active) return;
      if (placed) {
        setXrMessage("AR ativo. Cena posicionada no ambiente real.");
        return;
      }
      if (available) {
        setXrMessage("Superfície detectada. Toque na tela para posicionar a cena.");
        return;
      }
      setXrMessage("Mova o dispositivo para detectar uma superfície.");
    },
    [hitAvailable, isARActive, isPlacementLocked]
  );

  const handleHitAvailabilityChange = useCallback(
    (available: boolean) => {
      setHitAvailable(available);
      if (xrSessionRef.current) {
        updateXrInstructionMessage({ active: true, hitAvailable: available });
      }
    },
    [updateXrInstructionMessage]
  );

  const exitARSession = useCallback(async () => {
    const currentSession = xrSessionRef.current;
    if (!currentSession) return;

    try {
      await currentSession.end();
    } catch {
      setXrMessage("Falha ao encerrar sessão AR.");
    }
  }, []);

  const enterARSession = useCallback(async () => {
    if (xrSupportState !== "supported") return;

    const renderer = rendererRef.current;
    if (!renderer) {
      setXrMessage("Renderer ainda não está pronto para iniciar AR.");
      return;
    }

    const xrNavigator = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xrNavigator) {
      setXrMessage("WebXR indisponível neste navegador.");
      return;
    }

    try {
      setXrMessage("Iniciando sessão AR...");
      setIsPlacementLocked(false);
      placementLockedRef.current = false;
      setHitAvailable(false);
      setSceneRootPosition([0, 0, 0]);
      setSceneRootQuaternion([0, 0, 0, 1]);
      latestHitPoseRef.current = null;
      selectPanel(null);

      const sessionInit: XRSessionInit & { domOverlay?: { root: Element } } = {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["local-floor", "dom-overlay"]
      };

      if (sectionRef.current) {
        sessionInit.domOverlay = { root: sectionRef.current };
      }

      const session = await xrNavigator.requestSession("immersive-ar", sessionInit);
      xrSessionRef.current = session;

      const handleSessionEnd = () => {
        xrSessionRef.current = null;
        setXrSession(null);
        setIsPlacementLocked(false);
        placementLockedRef.current = false;
        setHitAvailable(false);
        setSceneRootPosition([0, 0, 0]);
        setSceneRootQuaternion([0, 0, 0, 1]);
        if (reticleRef.current) {
          reticleRef.current.visible = false;
        }
        setXrMessage("Sessão AR encerrada.");
        session.removeEventListener("end", handleSessionEnd);
        session.removeEventListener("select", handleSelect);
      };

      const handleSelect = () => {
        if (placementLockedRef.current) return;

        const hitPose = latestHitPoseRef.current;
        if (!hitPose) return;

        setSceneRootPosition(hitPose.position);
        setSceneRootQuaternion(hitPose.quaternion);
        setIsPlacementLocked(true);
        placementLockedRef.current = true;
        setXrMessage("Cena posicionada. AR ativo.");

        if (reticleRef.current) {
          reticleRef.current.visible = false;
        }
      };

      session.addEventListener("end", handleSessionEnd);
      session.addEventListener("select", handleSelect);

      renderer.xr.setReferenceSpaceType("local");
      await renderer.xr.setSession(session);

      setXrSession(session);
      updateXrInstructionMessage({ active: true, hitAvailable: false, placed: false });
    } catch (error) {
      xrSessionRef.current = null;
      const errorMessage =
        error instanceof Error ? error.message : "Não foi possível iniciar o modo AR.";
      setXrMessage(`Falha ao iniciar AR: ${errorMessage}`);
    }
  }, [selectPanel, updateXrInstructionMessage, xrSupportState]);

  const arOverlayStatusText = useMemo(() => {
    if (isARActive && !isPlacementLocked) {
      return hitAvailable
        ? "Toque para posicionar a cena"
        : "Procurando superfície para posicionamento";
    }

    return xrMessage;
  }, [hitAvailable, isARActive, isPlacementLocked, xrMessage]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[480px] overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl shadow-black/20"
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [4.5, 3.2, 6.5], fov: 46, near: 0.1, far: 100 }}
        onCreated={({ gl }) => {
          rendererRef.current = gl;
          gl.xr.enabled = XR_RENDERER_OPTIONS.enabled;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
        onPointerMissed={() => selectPanel(null)}
      >
        {!isARActive ? <color attach="background" args={["#020617"]} /> : null}

        {isARActive ? (
          <>
            <ambientLight intensity={0.7} />
            <directionalLight position={[2, 4, 3]} intensity={0.45} />
          </>
        ) : (
          <>
            <ambientLight intensity={0.45} />
            <directionalLight
              castShadow
              position={[5, 8, 4]}
              intensity={1.15}
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-bias={-0.0001}
              shadow-normalBias={0.02}
              shadow-camera-near={1}
              shadow-camera-far={30}
              shadow-camera-left={-12}
              shadow-camera-right={12}
              shadow-camera-top={12}
              shadow-camera-bottom={-12}
            />
            <directionalLight position={[-6, 4, -5]} intensity={0.35} />
            <directionalLight position={[0, 3, -8]} intensity={0.15} />
            <GroundShadowPlane />
            <SubtleGrid />
          </>
        )}

        {isARActive ? (
          <XRPlacementTracker
            session={xrSession}
            placementLocked={isPlacementLocked}
            reticleRef={reticleRef}
            latestHitPoseRef={latestHitPoseRef}
            onHitAvailabilityChange={handleHitAvailabilityChange}
          />
        ) : null}

        <group
          visible={!isARActive || isPlacementLocked}
          position={sceneRootPosition}
          quaternion={sceneRootQuaternion}
        >
          {panels.map((panel) => (
            <PanelPlane
              key={panel.id}
              panel={panel}
              isSelected={panel.id === selectedId}
              transformMode={transformMode}
              transformEnabled={!isARActive}
              selectionEnabled={!isARActive}
            />
          ))}
        </group>

        {isARActive && !isPlacementLocked ? (
          <group ref={reticleRef} visible={false}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.08, 0.1, 40]} />
              <meshBasicMaterial color="#7dd3fc" transparent opacity={0.9} side={THREE.DoubleSide} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
              <circleGeometry args={[0.04, 32]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.2} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ) : null}

        {!isARActive ? (
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            minDistance={2}
            maxDistance={20}
            minPolarAngle={0.2}
            maxPolarAngle={Math.PI / 2 - 0.05}
            rotateSpeed={0.8}
            zoomSpeed={0.9}
            target={[0, 1, 0]}
            screenSpacePanning={false}
          />
        ) : null}
      </Canvas>

      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-between gap-3">
        <div className="pointer-events-auto max-w-[min(100%,26rem)] rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 backdrop-blur">
          <p className="font-medium text-slate-100">{isARActive ? "AR Mode" : "WebXR AR"}</p>
          <p className="mt-1 text-slate-300">{arOverlayStatusText}</p>
        </div>

        <div className="pointer-events-auto flex shrink-0 items-start gap-2">
          {isARActive ? (
            <button
              type="button"
              onClick={() => void exitARSession()}
              className="rounded-lg border border-white/15 bg-slate-950/85 px-3 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-slate-900"
            >
              Exit AR Mode
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void enterARSession()}
              disabled={xrSupportState !== "supported"}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                xrSupportState === "supported"
                  ? "bg-sky-400 text-slate-950 hover:bg-sky-300"
                  : "cursor-not-allowed border border-white/10 bg-white/5 text-slate-400"
              }`}
            >
              Enter AR Mode
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
