import { Console } from './console/Console';
import { Toasts } from './console/Toasts';
import { BootScreen } from './screens/BootScreen';
import { LoadingScreen } from './screens/LoadingScreen';
import { SetupScreen } from './screens/SetupScreen';
import { useGame } from './store';
import { WorldView } from './world/WorldView';

export function App() {
  const screen = useGame((s) => s.screen);
  const view = useGame((s) => s.view);
  const error = useGame((s) => s.error);
  const terminalOpen = useGame((s) => s.terminalOpen);
  const worldFailed = useGame((s) => s.worldFailed);
  return (
    <>
      {screen === 'boot' && <BootScreen />}
      {screen === 'setup' && <SetupScreen />}
      {screen === 'loading' && <LoadingScreen />}
      {screen === 'game' && view && (
        <>
          {!worldFailed && <WorldView />}
          {(terminalOpen || worldFailed) && <Console />}
        </>
      )}
      {error && (
        <div className="fatal" role="alert">
          <b>Error de la simulación:</b> {error}
          <button className="btn sm" onClick={() => useGame.setState({ error: null })}>
            Cerrar
          </button>
        </div>
      )}
      <Toasts />
    </>
  );
}
