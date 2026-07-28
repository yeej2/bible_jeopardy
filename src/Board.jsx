import { useEffect, useState, useRef } from 'react';
import socket from './socket';
import { playBuzz, playCorrect, playWrong, playDailyDouble } from './audio';

function formatTime(timerEnd) {
  if (!timerEnd) return null;
  const remaining = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
  return remaining;
}

export default function Board() {
  const [roomCode, setRoomCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [state, setState] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [error, setError] = useState('');
  const prevPhase = useRef(null);

  useEffect(() => {
    const onUpdate = (newState) => setState(newState);
    socket.on('stateUpdate', onUpdate);
    return () => socket.off('stateUpdate', onUpdate);
  }, []);

  useEffect(() => {
    if (localStorage.getItem('bj_sound') !== 'on') return;
    const phase = state?.phase;
    if (phase === 'answering' && prevPhase.current !== 'answering') {
      playBuzz();
    }
    if (phase === 'dailydouble' && prevPhase.current !== 'dailydouble') {
      playDailyDouble();
    }
    prevPhase.current = phase;
  }, [state?.phase]);

  useEffect(() => {
    if (!state?.timerEnd) {
      setTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft(formatTime(state.timerEnd));
    }, 250);
    return () => clearInterval(interval);
  }, [state?.timerEnd]);

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    socket.emit('joinRoom', { code: roomCode.trim(), name: 'TV Board' }, (res) => {
      if (res.success) {
        setJoined(true);
        setError('');
      } else {
        setError(res.error || 'Could not join room');
      }
    });
  };

  if (!joined) {
    return (
      <div className="center column gap" style={{ height: '100%', padding: 24 }}>
        <h1 className="jeopardy-font" style={{ fontSize: '3rem', color: 'var(--jeopardy-gold)' }}>TV BOARD</h1>
        <div className="center column gap-sm" style={{ width: '100%', maxWidth: 320 }}>
          <input
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
          <button className="w-full" onClick={handleJoin}>Watch Room</button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="center" style={{ height: '100%' }}>
        <p>Waiting for game state...</p>
      </div>
    );
  }

  const { phase, board, teams, currentClue, activeTeamId } = state;

  const activeTeam = teams?.find((t) => t.id === activeTeamId);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="jeopardy-font" style={{ fontSize: '2.5rem', color: 'var(--jeopardy-gold)', margin: 0 }}>
          BIBLE JEOPARDY
        </h1>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>ROOM: {state.code}</div>
          {timeLeft !== null && (
            <div style={{ fontSize: '1.5rem', color: timeLeft <= 3 ? '#ff6b6b' : '#fff' }}>
              {timeLeft}s
            </div>
          )}
        </div>
      </header>

      {phase === 'lobby' && (
        <div className="center column gap" style={{ flex: 1 }}>
          <h2 className="jeopardy-font" style={{ fontSize: '2.5rem' }}>LOBBY</h2>
          <p style={{ fontSize: '1.5rem' }}>Waiting for host to start the game...</p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {teams?.map((team) => (
              <div key={team.id} className="card" style={{ minWidth: 160, textAlign: 'center' }}>
                <h3 style={{ color: 'var(--jeopardy-gold)', marginTop: 0 }}>{team.name}</h3>
                <p>{team.members.join(', ') || 'No players'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(phase === 'board' || phase === 'clue') && board && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${board.categories.length}, 1fr)`, gap: 12 }}>
          {board.categories.map((cat) => (
            <div key={cat.name} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                className="jeopardy-font text-center"
                style={{
                  background: 'var(--jeopardy-blue)',
                  padding: '16px 8px',
                  borderRadius: 8,
                  fontSize: '1.4rem',
                  textTransform: 'uppercase',
                  minHeight: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {cat.name}
              </div>
              {cat.clues.map((clue, idx) => (
                <div
                  key={idx}
                  className="jeopardy-font center"
                  style={{
                    flex: 1,
                    background: clue.answered ? '#222' : 'var(--jeopardy-blue)',
                    color: clue.answered ? '#555' : 'var(--jeopardy-gold)',
                    borderRadius: 8,
                    fontSize: '2rem',
                    minHeight: 80,
                  }}
                >
                  {clue.answered ? '' : `$${clue.value}`}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {(phase === 'clue' || phase === 'answering' || phase === 'judging' || phase === 'dailydouble' || phase === 'answer_revealed') && currentClue && (
        <div
          className="center column gap"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 100,
            background: 'var(--jeopardy-blue)',
            padding: 24,
          }}
        >
          {phase === 'clue' && (
            <>
              <div className="jeopardy-font text-center" style={{ fontSize: '1.5rem', color: 'var(--jeopardy-gold)' }}>
                {currentClue.category}
              </div>
              <div
                className="jeopardy-font text-center"
                style={{
                  fontSize: '2.8rem',
                  maxWidth: 900,
                  lineHeight: 1.3,
                  textShadow: '2px 2px 0 #000',
                }}
              >
                {currentClue.question}
              </div>
              <div style={{ fontSize: '1.5rem', color: '#2ecc71' }}>
                BUZZ OPEN!
              </div>
            </>
          )}
          {phase === 'answering' && activeTeam && (
            <div className="center column gap" style={{ color: 'var(--jeopardy-gold)' }}>
              <div className="jeopardy-font" style={{ fontSize: '3rem' }}>
                {activeTeam.name}
              </div>
              <div style={{ fontSize: '1.8rem' }}>is answering</div>
              {timeLeft !== null && <div style={{ fontSize: '2.5rem' }}>{timeLeft}s</div>}
            </div>
          )}
          {phase === 'judging' && (
            <div className="center column gap" style={{ color: 'var(--jeopardy-gold)' }}>
              <div className="jeopardy-font" style={{ fontSize: '2.5rem' }}>Host is judging</div>
              <div style={{ fontSize: '1.5rem' }}>The answer is hidden from the board</div>
            </div>
          )}
          {phase === 'answer_revealed' && (
            <div className="center column gap" style={{ color: 'var(--jeopardy-gold)' }}>
              <div className="jeopardy-font" style={{ fontSize: '2.5rem' }}>The Answer</div>
              <div className="jeopardy-font text-center" style={{ fontSize: '2.2rem', maxWidth: 900, lineHeight: 1.3 }}>
                {currentClue.answer}
              </div>
            </div>
          )}
          {phase === 'dailydouble' && (
            <>
              <div className="jeopardy-font text-center" style={{ fontSize: '2.5rem', color: '#fff' }}>DAILY DOUBLE</div>
              <div className="jeopardy-font text-center" style={{ fontSize: '1.5rem', color: 'var(--jeopardy-gold)' }}>
                {currentClue.category}
              </div>
              <div
                className="jeopardy-font text-center"
                style={{
                  fontSize: '2.8rem',
                  maxWidth: 900,
                  lineHeight: 1.3,
                }}
              >
                {currentClue.question}
              </div>
            </>
          )}
        </div>
      )}

      {(phase === 'final_wager' || phase === 'final_question' || phase === 'final_judging') && currentClue && (
        <div
          className="center column gap"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 100,
            background: 'var(--jeopardy-blue)',
            padding: 24,
          }}
        >
          <h2 className="jeopardy-font" style={{ fontSize: '2.5rem', color: 'var(--jeopardy-gold)' }}>
            FINAL JEOPARDY
          </h2>
          <div className="jeopardy-font text-center" style={{ fontSize: '1.5rem' }}>{currentClue.category}</div>
          {(phase === 'final_question' || phase === 'final_judging') && (
            <div className="jeopardy-font text-center" style={{ fontSize: '2.5rem', maxWidth: 900, lineHeight: 1.3 }}>
              {currentClue.question}
            </div>
          )}
          {phase === 'final_wager' && (
            <div style={{ fontSize: '1.5rem' }}>Teams are submitting wagers...</div>
          )}
          {phase === 'final_question' && (
            <div style={{ fontSize: '1.5rem' }}>Teams are writing answers...</div>
          )}
          {phase === 'final_judging' && currentClue.answer && (
            <div className="center column gap">
              <div style={{ fontSize: '1.3rem' }}>Correct answer:</div>
              <div className="jeopardy-font text-center" style={{ fontSize: '2.2rem', maxWidth: 900, lineHeight: 1.3 }}>
                {currentClue.answer}
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'gameover' && (
        <div className="center column gap" style={{ flex: 1 }}>
          <h2 className="jeopardy-font" style={{ fontSize: '3rem', color: 'var(--jeopardy-gold)' }}>FINAL RESULTS</h2>
          {(() => {
            const sorted = teams?.sort((a, b) => b.score - a.score);
            const winner = sorted[0];
            return winner ? (
              <div className="center column gap" style={{ marginBottom: 24 }}>
                <div className="jeopardy-font" style={{ fontSize: '3.5rem', color: '#2ecc71' }}>
                  {winner.name} wins!
                </div>
                <div style={{ fontSize: '1.5rem' }}>with ${winner.score}</div>
              </div>
            ) : null;
          })()}
          <h3 className="jeopardy-font" style={{ color: 'var(--jeopardy-gold)' }}>Standings</h3>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {teams?.sort((a, b) => b.score - a.score).map((team, idx) => (
              <div key={team.id} className="card text-center" style={{ minWidth: 180 }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>#{idx + 1} {team.name}</div>
                <div className="jeopardy-font" style={{ fontSize: '2rem', color: 'var(--jeopardy-gold)' }}>
                  ${team.score}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer style={{ marginTop: 'auto', paddingTop: 16 }}>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {teams?.map((team) => (
            <div key={team.id} className="card text-center" style={{ minWidth: 140 }}>
              <div style={{ fontWeight: 700, color: team.id === activeTeamId ? 'var(--jeopardy-gold)' : '#fff' }}>
                {team.name}
              </div>
              <div className="jeopardy-font" style={{ fontSize: '1.5rem' }}>${team.score}</div>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
