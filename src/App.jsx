import { useState } from 'react';
import Board from './Board';
import Controller from './Controller';
import { startMusic, stopMusic } from './audio';

function App() {
  const [mode, setMode] = useState(null); // 'board' | 'controller'
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('bj_sound') === 'on');

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem('bj_sound', next ? 'on' : 'off');
    if (next) {
      startMusic();
    } else {
      stopMusic();
    }
  };

  if (mode === 'board') {
    return <Board />;
  }

  if (mode === 'controller') {
    return <Controller />;
  }

  return (
    <div className="center column gap-lg" style={{ height: '100%', padding: 24 }}>
      <h1 className="jeopardy-font text-center" style={{ fontSize: '3rem', color: 'var(--jeopardy-gold)' }}>
        BIBLE JEOPARDY
      </h1>
      <p className="text-center" style={{ maxWidth: 400, color: '#ccc' }}>
        Cast the TV board for everyone to see, then use your phone to buzz in and control the game.
      </p>
      <div className="center column gap" style={{ width: '100%', maxWidth: 320 }}>
        <button style={{ width: '100%', fontSize: '1.25rem' }} onClick={() => setMode('board')}>
          Open TV Board
        </button>
        <button style={{ width: '100%', fontSize: '1.25rem' }} onClick={() => setMode('controller')}>
          Phone Controller
        </button>
        <button style={{ width: '100%', background: soundOn ? '#2ecc71' : '#333', color: '#fff' }} onClick={toggleSound}>
          Sound & Music: {soundOn ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}

export default App;
