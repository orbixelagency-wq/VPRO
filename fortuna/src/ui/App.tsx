import { Console } from './console/Console';
import { Toasts } from './console/Toasts';
import { BootScreen } from './screens/BootScreen';
import { LoadingScreen } from './screens/LoadingScreen';
import { SetupScreen } from './screens/SetupScreen';
import { useGame } from './store';

export function App() {
  const screen = useGame((s) => s.screen);
  const view = useGame((s) => s.view);
  const error = useGame((s) => s.error);
  return (
    <>
      {screen === 'boot' && <BootScreen />}
      {screen === 'setup' && <SetupScreen />}
      {screen === 'loading' && <LoadingScreen />}
      {screen === 'console' && view && <Console />}
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
