import { useState } from 'react';
import Board from './Board';
import Controller from './Controller';

function App() {
  const [mode, setMode] = useState(null); // 'board' | 'controller'

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
      </div>
    </div>
  );
}

export default App;
