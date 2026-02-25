# Arquitetura do módulo AR

Visão geral da estrutura modular do sistema AR (WebXR immersive-ar + hit-test).

## Estrutura de pastas

```
ar/
├── core/                    # Camada de controle (sem UI)
│   ├── types.ts             # ARState, HitPoseSnapshot, XRSupportStatus
│   ├── XRSessionManager.ts  # useXRSessionManager — sessão WebXR
│   ├── XRHitTestManager.ts  # useXRHitTestManager — hit-test e frame loop
│   ├── XRPlacementController.ts  # useXRPlacementController — estado de placement
│   └── index.ts
├── scene/                   # Componentes 3D desacoplados
│   ├── ARSceneRoot.tsx      # Grupo raiz (position/quaternion/visible)
│   ├── ARReticle.tsx        # Reticle visual (atualizado via ref)
│   ├── ARContentRenderer.tsx # Painéis da store (PanelPlane)
│   └── index.ts
├── hooks/                   # Re-export dos hooks do core
│   ├── useXRSession.ts
│   ├── useXRHitTest.ts
│   ├── useXRPlacement.ts
│   └── index.ts
├── context/
│   ├── ARProvider.tsx       # Compõe core + estado unificado (arState, message)
│   └── index.ts
├── ARCHITECTURE.md
└── index.ts
```

## Fluxo de estado (ARState)

```
idle
  ↓ (navegador com WebXR)
checking-support
  ↓ (suporte verificado)
ready-to-start   ← ou idle se não suportado
  ↓ (usuário clica "Enter AR", startSession)
scanning
  ↓ (hit-test encontra superfície)
surface-found
  ↓ (usuário toca na tela, place())
placed
  ↓ (usuário sai ou "Exit AR")
exited / volta a ready-to-start
```

## Como cada parte conversa

### 1. Core (managers)

- **XRSessionManager** (`useXRSessionManager`)
  - Verifica `navigator.xr.isSessionSupported("immersive-ar")` ao montar.
  - Expõe `startSession(renderer, overlayRoot?)` e `endSession()`.
  - Mantém `session` (state) e `sessionRef` (ref estável).
  - Registra `session("select")` → chama `onSelect` (ex.: place).
  - Não conhece hit-test nem placement; apenas sessão.

- **XRHitTestManager** (`useXRHitTestManager`)
  - Só roda quando `session != null`.
  - Cria `requestHitTestSource` uma vez; em cada frame lê `getHitTestResults`, escreve em `latestHitPoseRef`, atualiza `reticleRef` (position/quaternion/visible), chama `onSurfaceFound(true|false)`.
  - Usa `placementLockedRef` para não atualizar reticle nem reportar surface quando já está placed.
  - Cleanup completo ao desmontar ou ao fim da sessão.

- **XRPlacementController** (`useXRPlacementController`)
  - Estado interno: `scanning` | `surface-found` | `placed` (surface-found não é setado pelo controller; fica a cargo do provider).
  - Mantém `sceneRootPosition`, `sceneRootQuaternion` e `placementLockedRef`.
  - `place()`: lê `latestHitPoseRef.current`, atualiza position/quaternion, seta placed.
  - `resetPlacement()`: volta para scanning, zera pose e `latestHitPoseRef`.
  - Não conhece sessão nem hit-test.

### 2. Context (ARProvider)

- Usa os três hooks do core.
- Mantém estado derivado `surfaceFound` (do callback do hit-test) e mensagens de UI.
- Deriva `arState` (idle | checking-support | ready-to-start | scanning | surface-found | placed | exited) a partir de support + session + placement + surfaceFound.
- Expõe um único valor de contexto: `arState`, `message`, `sceneRootPosition/Quaternion`, `isSessionActive`, `isPlacementLocked`, `canStartAR`, `startSession`, `endSession`, `place`, `resetPlacement`, `overlayRootRef`, `reticleRef`, `latestHitPoseRef`.
- `startSession` é um wrapper que chama `placement.resetPlacement()`, `setSurfaceFound(false)` e `session.startSession(renderer, overlayRootRef.current)`.
- Passa `onSelect: placement.place` para o session manager e `onSurfaceFound` / `onError` para o hit-test manager.

### 3. Scene (componentes 3D)

- **ARSceneRoot**: apenas aplica `position`, `quaternion` e `visible` ao grupo; filhos = conteúdo (ex.: ARContentRenderer).
- **ARReticle**: grupo com anel + círculo; recebe `ref`; position/quaternion/visible são atualizados pelo XRHitTestManager no frame loop (nenhuma lógica de sessão no componente).
- **ARContentRenderer**: lê `panels` da `useEditorStore`, renderiza `PanelPlane`; `arActive` desliga transform e seleção em AR.

### 4. ARCanvas (UI que usa o contexto)

- Envolvido por `ARProvider` (em AREditorScreen).
- Usa `useAR()` para estado e ações.
- Atribui `ref={ar.overlayRootRef}` ao `<section>` (dom-overlay).
- No `onCreated` do Canvas: seta `rendererRef` e `gl.xr.enabled` **uma vez**.
- Não chama `requestSession` nem cria hit-test; apenas chama `ar.startSession(renderer)` ao clicar em "Enter AR" (e `selectPanel(null)` antes).
- Renderiza `ARSceneRoot` (com `ARContentRenderer` dentro), `ARReticle` (quando sessão ativa e não placed) e luzes/OrbitControls conforme modo.
- Botões e mensagens vêm de `ar.canStartAR`, `ar.message`, `ar.arState`, `ar.endSession`, `ar.resetPlacement`.

## Regras respeitadas

- Nenhum componente visual cria ou controla sessão XR diretamente; só o manager (via `startSession`/`endSession`).
- Estado da sessão fica no XRSessionManager (e no context para re-render).
- Hit-test só roda com sessão ativa (effect depende de `session`).
- Reticle é independente do conteúdo 3D; atualizado só por refs no frame loop.
- Conteúdo 3D visível apenas quando `!isARActive || isPlacementLocked` (ARSceneRoot visible).
- Lógica no requestAnimationFrame do XR é mínima (leitura de hit, escrita em refs, atualização do reticle).
- Cleanup: cancelAnimationFrame, hitTestSource.cancel(), refs nullados, listeners removidos no fim da sessão.
- `renderer.xr.enabled` configurado uma vez no `onCreated` do Canvas.

## Performance

- Refs estáveis para sessão, hit pose, reticle e placement locked; evita recriar hitTestSource enquanto a sessão for a mesma.
- Callbacks do provider estáveis com useCallback/refs; minimiza re-renders no loop XR.
- Estado de placement e mensagens no React só quando necessário (surface found/lost, place, reset, session start/end).

## Compatibilidade

- WebXR `immersive-ar` com `hit-test` e `local-floor`; dom-overlay opcional (passado em `startSession(renderer, overlayRoot)`).
- Testado para Android Chrome; suporte verificado com `isSessionSupported("immersive-ar")`.
