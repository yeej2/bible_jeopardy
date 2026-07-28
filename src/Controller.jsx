import { useEffect, useState } from 'react';
import socket from './socket';
import { playBuzz, playCorrect, playWrong, playDailyDouble } from './audio';

function formatTime(timerEnd, now) {
  if (!timerEnd) return 0;
  return Math.max(0, Math.ceil((timerEnd - now) / 1000));
}

export default function Controller() {
  const [step, setStep] = useState('menu'); // menu | create | join | lobby | game
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [answer, setAnswer] = useState('');
  const [wager, setWager] = useState('');
  const [now, setNow] = useState(Date.now());
  const [showTeamPanel, setShowTeamPanel] = useState(false);
  const [showHostControls, setShowHostControls] = useState(false);
  const [scoreTeamId, setScoreTeamId] = useState('');
  const [scoreAmount, setScoreAmount] = useState('');

  useEffect(() => {
    const onUpdate = (newState) => setState(newState);
    socket.on('stateUpdate', onUpdate);
    return () => socket.off('stateUpdate', onUpdate);
  }, []);

  useEffect(() => {
    if (!state?.timerEnd) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [state?.timerEnd]);

  useEffect(() => {
    if (localStorage.getItem('bj_sound') !== 'on') return;
    if (state?.phase === 'dailydouble' && state?.currentClue?.isDailyDouble) {
      playDailyDouble();
    }
  }, [state?.phase, state?.currentClue?.isDailyDouble]);

  const createRoom = () => {
    if (!name.trim()) return;
    socket.emit('createRoom', { name: name.trim() }, (res) => {
      if (res.success) {
        setIsHost(true);
        setPlayerId(res.playerId);
        setRoomCode(res.code);
        setStep('lobby');
        setError('');
      } else {
        setError(res.error || 'Could not create room');
      }
    });
  };

  const joinRoom = () => {
    if (!name.trim() || !roomCode.trim()) return;
    socket.emit('joinRoom', { code: roomCode.trim(), name: name.trim() }, (res) => {
      if (res.success) {
        setPlayerId(res.playerId);
        setStep('lobby');
        setError('');
        const savedTeamId = localStorage.getItem('bj_teamId');
        if (savedTeamId) {
          socket.emit('joinTeam', { roomCode, teamId: savedTeamId });
        }
      } else {
        setError(res.error || 'Could not join room');
      }
    });
  };

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) return;
    socket.emit('createTeam', { roomCode, name: newTeamName.trim() });
    setNewTeamName('');
  };

  const handleJoinTeam = (teamId) => {
    localStorage.setItem('bj_teamId', teamId);
    socket.emit('joinTeam', { roomCode, teamId });
  };

  const startGame = () => {
    socket.emit('startGame', { roomCode });
  };

  const selectClue = (categoryIndex, clueIndex) => {
    socket.emit('selectClue', { roomCode, categoryIndex, clueIndex });
  };

  const buzz = () => {
    if (localStorage.getItem('bj_sound') === 'on') playBuzz();
    socket.emit('buzz', { roomCode });
  };

  const submitAnswer = () => {
    if (!answer.trim()) return;
    socket.emit('submitAnswer', { roomCode, answer: answer.trim() });
    setAnswer('');
  };

  const judge = (correct) => {
    if (localStorage.getItem('bj_sound') === 'on') {
      correct ? playCorrect() : playWrong();
    }
    socket.emit('judgeAnswer', { roomCode, correct });
  };

  const timeout = () => {
    socket.emit('timeoutAnswer', { roomCode });
  };

  const markHostCorrect = () => {
    socket.emit('hostMarkCorrect', { roomCode });
  };

  const nextQuestion = () => {
    socket.emit('nextQuestion', { roomCode });
  };

  const releaseFinalQuestion = () => {
    socket.emit('releaseFinalQuestion', { roomCode });
  };

  const submitWager = () => {
    const amount = parseInt(wager, 10);
    if (Number.isNaN(amount) || amount < 0) return;
    socket.emit('submitWager', { roomCode, amount });
    setWager('');
  };

  const startDailyDoubleAnswer = () => {
    socket.emit('startDailyDoubleAnswer', { roomCode });
  };

  const startFinalJeopardy = () => {
    socket.emit('startFinalJeopardy', { roomCode });
  };

  const revealFinalAnswer = () => {
    socket.emit('revealFinalAnswer', { roomCode });
  };

  const judgeFinal = (teamId, correct) => {
    socket.emit('judgeFinalAnswer', { roomCode, teamId, correct });
  };

  const endGame = () => {
    socket.emit('endGame', { roomCode });
  };

  const adjustTeamScore = (delta) => {
    const amount = parseInt(scoreAmount, 10);
    if (!scoreTeamId || Number.isNaN(amount) || amount <= 0) return;
    socket.emit('adjustScore', { roomCode, teamId: scoreTeamId, delta: delta * amount });
  };

  const hostReturnToBoard = () => {
    socket.emit('returnToBoard', { roomCode });
  };

  const hostResetCurrentClue = () => {
    socket.emit('resetCurrentClue', { roomCode });
  };

  if (step === 'menu') {
    return (
      <div className="center column gap" style={{ height: '100%', padding: 24 }}>
        <h1 className="jeopardy-font" style={{ fontSize: '2.5rem', color: 'var(--jeopardy-gold)' }}>PHONE CONTROLLER</h1>
        <div className="center column gap" style={{ width: '100%', maxWidth: 320 }}>
          <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
          {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
          <button className="w-full" onClick={() => setStep('create')}>Create Room (Host)</button>
          <button className="w-full" onClick={() => setStep('join')}>Join Room</button>
        </div>
      </div>
    );
  }

  if (step === 'create') {
    return (
      <div className="center column gap" style={{ height: '100%', padding: 24 }}>
        <h2 className="jeopardy-font" style={{ fontSize: '2rem', color: 'var(--jeopardy-gold)' }}>Create Room</h2>
        <div className="center column gap-sm" style={{ width: '100%', maxWidth: 320 }}>
          <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="w-full" onClick={createRoom} disabled={!name.trim()}>Create</button>
          <button className="w-full" style={{ background: '#333', color: '#fff' }} onClick={() => setStep('menu')}>Back</button>
        </div>
      </div>
    );
  }

  if (step === 'join') {
    return (
      <div className="center column gap" style={{ height: '100%', padding: 24 }}>
        <h2 className="jeopardy-font" style={{ fontSize: '2rem', color: 'var(--jeopardy-gold)' }}>Join Room</h2>
        <div className="center column gap-sm" style={{ width: '100%', maxWidth: 320 }}>
          <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Room code" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} maxLength={6} />
          <button className="w-full" onClick={joinRoom} disabled={!name.trim() || !roomCode.trim()}>Join</button>
          {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
          <button className="w-full" style={{ background: '#333', color: '#fff' }} onClick={() => setStep('menu')}>Back</button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="center" style={{ height: '100%' }}>
        <p>Loading game...</p>
      </div>
    );
  }

  const myPlayer = state.players.find((p) => p.id === playerId);
  const myTeam = state.teams.find((t) => t.id === myPlayer?.teamId);

  const renderHostControls = () => {
    if (!isHost) return null;
    const inClue = ['clue', 'answering', 'judging', 'dailydouble', 'answer_revealed'].includes(state.phase);
    return (
      <div className="card" style={{ width: '100%', maxWidth: 360, marginTop: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ color: 'var(--jeopardy-gold)', margin: 0 }}>Host Controls</h3>
          <button style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#333', color: '#fff' }} onClick={() => setShowHostControls(!showHostControls)}>
            {showHostControls ? 'Hide' : 'Show'}
          </button>
        </div>
        {showHostControls && (
          <div className="center column gap-sm">
            <select value={scoreTeamId} onChange={(e) => setScoreTeamId(e.target.value)} style={{ width: '100%', padding: 8 }}>
              <option value="">Select team...</option>
              {state.teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
            <input type="number" placeholder="Amount" value={scoreAmount} onChange={(e) => setScoreAmount(e.target.value)} style={{ width: '100%', padding: 8 }} />
            <div className="center gap-sm" style={{ width: '100%' }}>
              <button className="w-full" style={{ background: '#2ecc71' }} onClick={() => adjustTeamScore(1)} disabled={!scoreTeamId || !scoreAmount}>+ Add</button>
              <button className="w-full" style={{ background: '#e74c3c' }} onClick={() => adjustTeamScore(-1)} disabled={!scoreTeamId || !scoreAmount}>- Subtract</button>
            </div>
            <div className="center gap-sm" style={{ width: '100%' }}>
              <button className="w-full" style={{ background: '#555' }} onClick={hostReturnToBoard} disabled={!inClue}>Back to Board</button>
              <button className="w-full" style={{ background: '#555' }} onClick={hostResetCurrentClue} disabled={!inClue}>Reset Question</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (state.phase === 'lobby') {
    return (
      <div className="center column gap" style={{ height: '100%', padding: 24 }}>
        <h2 className="jeopardy-font" style={{ fontSize: '2rem', color: 'var(--jeopardy-gold)' }}>
          ROOM: {state.code}
        </h2>
        <p className="text-center">Create or join a team below. Once everyone is ready, the host can start the game.</p>
        <div className="center column gap-sm" style={{ width: '100%', maxWidth: 360 }}>
          <input placeholder="New team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
          <button className="w-full" onClick={handleCreateTeam} disabled={!newTeamName.trim()}>Create Team</button>
        </div>
        <div className="w-full" style={{ maxWidth: 360 }}>
          <h3 style={{ color: 'var(--jeopardy-gold)' }}>Teams</h3>
          {state.teams.map((team) => (
            <div key={team.id} className="card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{team.name}</strong>
                <div style={{ fontSize: '0.9rem', color: '#aaa' }}>{team.members.join(', ') || 'Empty'}</div>
              </div>
              <button
                style={{ background: myTeam?.id === team.id ? '#555' : 'var(--jeopardy-gold)' }}
                onClick={() => handleJoinTeam(team.id)}
                disabled={myTeam?.id === team.id}
              >
                {myTeam?.id === team.id ? 'Joined' : 'Join'}
              </button>
            </div>
          ))}
        </div>
        {isHost && (
          <button className="w-full" style={{ maxWidth: 360, marginTop: 8 }} onClick={startGame} disabled={state.teams.length < 1}>
            Start Game
          </button>
        )}
      </div>
    );
  }

  if (state.phase === 'board') {
    return (
      <div className="center column gap" style={{ height: '100%', padding: 24 }}>
        <h2 className="jeopardy-font" style={{ color: 'var(--jeopardy-gold)' }}>ROOM: {state.code}</h2>
        {isHost ? (
          <>
            <p className="text-center">Pick a clue for the active team: {state.teams.find((t) => t.id === state.activeTeamId)?.name}</p>
            <div className="w-full" style={{ maxWidth: 600 }}>
              {state.board?.categories.map((cat, cIdx) => (
                <div key={cat.name} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: 'var(--jeopardy-gold)', marginBottom: 4 }}>{cat.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                    {cat.clues.map((clue, rIdx) => (
                      <button
                        key={rIdx}
                        style={{ padding: 8, fontSize: '0.9rem', background: clue.answered ? '#222' : 'var(--jeopardy-blue)', color: clue.answered ? '#555' : 'var(--jeopardy-gold)' }}
                        onClick={() => selectClue(cIdx, rIdx)}
                        disabled={clue.answered}
                      >
                        {clue.answered ? '' : `$${clue.value}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full" style={{ maxWidth: 360, background: '#d69f4e' }} onClick={startFinalJeopardy}>Start Final Jeopardy</button>
          </>
        ) : (
          <p className="text-center">Waiting for the host to pick a clue...</p>
        )}
        <div className="w-full" style={{ maxWidth: 360, marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: 'var(--jeopardy-gold)' }}>Scores</h3>
            {!isHost && (
              <button style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#333', color: '#fff' }} onClick={() => setShowTeamPanel(!showTeamPanel)}>
                {showTeamPanel ? 'Hide Teams' : 'Change Team'}
              </button>
            )}
          </div>
          {showTeamPanel && !isHost && (
            <div className="center column gap-sm" style={{ marginBottom: 12 }}>
              <input placeholder="New team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
              <button className="w-full" style={{ padding: '8px 12px', fontSize: '0.9rem' }} onClick={handleCreateTeam}>Create Team</button>
              {state.teams.map((team) => (
                <div key={team.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8 }}>
                  <span>{team.name} {team.id === myTeam?.id && '(You)'}</span>
                  <button
                    style={{ padding: '6px 12px', fontSize: '0.85rem', background: team.id === myTeam?.id ? '#555' : 'var(--jeopardy-gold)' }}
                    onClick={() => handleJoinTeam(team.id)}
                    disabled={team.id === myTeam?.id}
                  >
                    {team.id === myTeam?.id ? 'Joined' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          )}
          {state.teams.map((team) => (
            <div key={team.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>{team.name} {team.id === myTeam?.id && '(You)'}</span>
              <span className="jeopardy-font" style={{ color: 'var(--jeopardy-gold)' }}>${team.score}</span>
            </div>
          ))}
        </div>
        {renderHostControls()}
      </div>
    );
  }

  if (state.phase === 'clue' && state.currentClue) {
    const canBuzz = myTeam && !state.currentClue.answered && !state.buzzOrder?.includes(myTeam.id);
    const buzzLabel = state.buzzOrder?.includes(myTeam?.id) ? 'Already buzzed' : 'BUZZ!';
    return (
      <div className="center column gap" style={{ height: '100%', padding: 24 }}>
        <div className="jeopardy-font" style={{ color: 'var(--jeopardy-gold)', fontSize: '1.3rem' }}>{state.currentClue.category}</div>
        <p className="text-center" style={{ fontSize: '1.2rem', maxWidth: 600 }}>{state.currentClue.question}</p>
        {!isHost && (
          <button
            style={{ width: '100%', maxWidth: 360, height: 120, fontSize: '2rem' }}
            onClick={buzz}
            disabled={!canBuzz}
          >
            {buzzLabel}
          </button>
        )}
        {isHost && (
          <div className="center column gap-sm" style={{ width: '100%', maxWidth: 420, marginTop: 8 }}>
            <p className="text-center" style={{ color: '#2ecc71' }}>
              Buzzing is open!
            </p>
            <div className="card" style={{ width: '100%' }}>
              <strong>Answer:</strong> {state.currentClue.answer}
            </div>
          </div>
        )}
        {renderHostControls()}
      </div>
    );
  }

  if (state.phase === 'dailydouble') {
    const isActive = myTeam?.id === state.activeTeamId;
    const team = state.teams.find((t) => t.id === state.activeTeamId);
    return (
      <div className="center column gap" style={{ height: '100%', padding: 24 }}>
        <h2 className="jeopardy-font" style={{ color: 'var(--jeopardy-gold)' }}>DAILY DOUBLE</h2>
        <p className="text-center" style={{ fontSize: '1.2rem', maxWidth: 600 }}>{state.currentClue.question}</p>
        <p>Category: {state.currentClue.category}</p>
        {isActive && !state.currentClue.wager && (
          <div className="center column gap-sm" style={{ width: '100%', maxWidth: 320 }}>
            <input type="number" placeholder="Wager" value={wager} onChange={(e) => setWager(e.target.value)} />
            <button className="w-full" onClick={submitWager}>Submit Wager</button>
          </div>
        )}
        {isActive && state.currentClue.wager && (
          <div className="center column gap-sm" style={{ width: '100%', maxWidth: 320 }}>
            <p>Wager: ${state.currentClue.wager}</p>
            <input placeholder="Your answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
            <button className="w-full" onClick={submitAnswer}>Submit Answer</button>
          </div>
        )}
        {isHost && state.currentClue.wager && (
          <>
            <p>{team?.name} wagered ${state.currentClue.wager}</p>
            <button className="w-full" style={{ maxWidth: 320 }} onClick={startDailyDoubleAnswer}>Start Answer Timer</button>
          </>
        )}
        {!isHost && !isActive && <p className="text-center">{team?.name} is playing this Daily Double.</p>}
        {renderHostControls()}
      </div>
    );
  }

  if (state.phase === 'answering' && state.currentClue) {
    const isActive = myTeam?.id === state.activeTeamId;
    const timeLeft = formatTime(state.timerEnd, now);
    return (
      <div className="center column gap" style={{ height: '100%', padding: 24 }}>
        <div className="jeopardy-font" style={{ fontSize: '1.5rem', color: 'var(--jeopardy-gold)' }}>
          {state.teams.find((t) => t.id === state.activeTeamId)?.name} is answering
        </div>
        <div style={{ fontSize: '2rem', color: timeLeft <= 3 ? '#ff6b6b' : '#fff' }}>{timeLeft}s</div>
        {isActive && (
          <div className="center column gap-sm" style={{ width: '100%', maxWidth: 360 }}>
            <input placeholder="Your answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
            <button className="w-full" onClick={submitAnswer}>Submit Answer</button>
          </div>
        )}
        {isHost && (
          <div className="center column gap-sm" style={{ width: '100%', maxWidth: 360 }}>
            <p className="text-center">Waiting for {state.teams.find((t) => t.id === state.activeTeamId)?.name} to answer...</p>
            <div className="card" style={{ width: '100%' }}>
              <strong>Answer:</strong> {state.currentClue.answer}
            </div>
            <div className="center gap" style={{ flexWrap: 'wrap' }}>
              <button style={{ background: '#2ecc71' }} onClick={markHostCorrect}>Correct</button>
              <button style={{ background: '#e74c3c' }} onClick={timeout}>Time's Up / No Answer</button>
            </div>
          </div>
        )}
        {!isHost && !isActive && <p className="text-center">Another team is answering...</p>}
        {renderHostControls()}
      </div>
    );
  }

  if (state.phase === 'judging' && state.currentClue) {
    return (
      <div className="center column gap" style={{ height: '100%', padding: 24 }}>
        <div className="jeopardy-font" style={{ fontSize: '1.5rem', color: 'var(--jeopardy-gold)' }}>
          Host Judging
        </div>
        <p className="text-center" style={{ fontSize: '1.1rem' }}>
          {state.teams.find((t) => t.id === state.currentClue.answeringTeamId)?.name} answered: <strong>{state.currentClue.submittedAnswer || '(no answer)'}</strong>
        </p>
        {isHost && (
          <div className="center column gap-sm" style={{ width: '100%', maxWidth: 360 }}>
            <div className="card" style={{ width: '100%' }}>
              <strong>Answer:</strong> {state.currentClue.answer}
            </div>
            <div className="center gap" style={{ flexWrap: 'wrap' }}>
              <button style={{ background: '#2ecc71' }} onClick={() => judge(true)}>Correct</button>
              <button style={{ background: '#e74c3c' }} onClick={() => judge(false)}>Wrong</button>
            </div>
          </div>
        )}
        {!isHost && <p className="text-center">Waiting for the host...</p>}
        {renderHostControls()}
      </div>
    );
  }

  if (state.phase === 'answer_revealed' && state.currentClue) {
    return (
      <div className="center column gap" style={{ height: '100%', padding: 24 }}>
        <div className="jeopardy-font" style={{ fontSize: '1.5rem', color: 'var(--jeopardy-gold)' }}>
          Answer Revealed
        </div>
        <p className="text-center" style={{ fontSize: '1.1rem' }}>
          Correct answer: <strong>{state.currentClue.answer}</strong>
        </p>
        {isHost && (
          <button className="w-full" style={{ maxWidth: 360 }} onClick={nextQuestion}>Next Question</button>
        )}
        {!isHost && <p className="text-center">Waiting for the host...</p>}
        {renderHostControls()}
      </div>
    );
  }

  if (state.phase === 'final_wager' || state.phase === 'final_question') {
    const allWagersIn = isHost && state.currentClue.finalWagers && Object.keys(state.currentClue.finalWagers).length === state.teams.length;
    return (
      <div className="center column gap" style={{ height: '100%', padding: 24 }}>
        <h2 className="jeopardy-font" style={{ color: 'var(--jeopardy-gold)' }}>FINAL JEOPARDY</h2>
        <div style={{ fontSize: '1.2rem' }}>Category: {state.currentClue.category}</div>
        {state.phase === 'final_question' && (
          <p className="text-center" style={{ fontSize: '1.1rem' }}>{state.currentClue.question}</p>
        )}
        {state.phase === 'final_wager' && myTeam && (
          <div className="center column gap-sm" style={{ width: '100%', maxWidth: 320 }}>
            <p>Your current wager: ${state.currentClue.myWager ?? 0}</p>
            <input type="number" placeholder={`Wager (max $${myTeam.score})`} value={wager} onChange={(e) => setWager(e.target.value)} />
            <button className="w-full" onClick={submitWager}>Submit Wager</button>
          </div>
        )}
        {state.phase === 'final_question' && myTeam && (
          <div className="center column gap-sm" style={{ width: '100%', maxWidth: 320 }}>
            <input placeholder="Your answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
            <button className="w-full" onClick={submitAnswer}>Submit Answer</button>
          </div>
        )}
        {state.phase === 'final_wager' && isHost && (
          <div className="center column gap-sm" style={{ width: '100%', maxWidth: 420 }}>
            {state.teams.map((team) => (
              <div key={team.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', padding: 8 }}>
                <span>{team.name}</span>
                <span>{state.currentClue.finalWagers?.[team.id] !== undefined ? 'Wager locked' : 'No wager yet'}</span>
              </div>
            ))}
            <button className="w-full" onClick={releaseFinalQuestion} disabled={!allWagersIn}>Release Question</button>
          </div>
        )}
        {state.phase === 'final_question' && isHost && (
          <div className="center column gap-sm" style={{ width: '100%', maxWidth: 420 }}>
            {state.teams.map((team) => (
              <div key={team.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', padding: 8 }}>
                <span>{team.name}</span>
                <span>{state.currentClue.finalAnswers?.[team.id] ? 'Answered' : 'Not answered'}</span>
              </div>
            ))}
            <button className="w-full" onClick={revealFinalAnswer}>Reveal Answer</button>
          </div>
        )}
        {renderHostControls()}
      </div>
    );
  }

  if (state.phase === 'final_judging') {
    return (
      <div className="center column gap" style={{ height: '100%', padding: 24 }}>
        <h2 className="jeopardy-font" style={{ color: 'var(--jeopardy-gold)' }}>FINAL JEOPARDY</h2>
        <p className="text-center" style={{ fontSize: '1.1rem' }}>{state.currentClue.question}</p>
        <p className="text-center">Correct answer: <strong>{state.currentClue.answer}</strong></p>
        {isHost && state.teams.map((team) => (
          <div key={team.id} className="card" style={{ width: '100%', maxWidth: 420, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{team.name}</strong>
              <div style={{ fontSize: '0.9rem' }}>Wager: ${state.currentClue.finalWagers?.[team.id] ?? 0}</div>
              <div style={{ fontSize: '0.9rem' }}>Answer: {state.finalAnswers?.[team.id] || '—'}</div>
            </div>
            <div className="center gap-sm">
              <button style={{ background: '#2ecc71' }} onClick={() => judgeFinal(team.id, true)}>✓</button>
              <button style={{ background: '#e74c3c' }} onClick={() => judgeFinal(team.id, false)}>✗</button>
            </div>
          </div>
        ))}
        {!isHost && <p className="text-center">Host is judging final answers...</p>}
        {isHost && (
          <button className="w-full" style={{ maxWidth: 320, marginTop: 12 }} onClick={endGame}>End Game</button>
        )}
        {renderHostControls()}
      </div>
    );
  }

  if (state.phase === 'gameover') {
    const sorted = [...state.teams].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    return (
      <div className="center column gap" style={{ height: '100%', padding: 24 }}>
        <h2 className="jeopardy-font" style={{ fontSize: '2.5rem', color: 'var(--jeopardy-gold)' }}>FINAL RESULTS</h2>
        {winner && (
          <div className="text-center" style={{ marginBottom: 12 }}>
            <div className="jeopardy-font" style={{ fontSize: '2rem', color: '#2ecc71' }}>
              {winner.name} wins!
            </div>
            <div style={{ fontSize: '1.2rem', color: '#fff' }}>with ${winner.score}</div>
            {winner.members && winner.members.length > 0 && (
              <div style={{ fontSize: '1rem', color: '#aaa', marginTop: 4 }}>
                Team: {winner.members.join(', ')}
              </div>
            )}
          </div>
        )}
        <h3 style={{ color: 'var(--jeopardy-gold)', marginBottom: 0 }}>Game Stats</h3>
        {state.stats?.fastestBuzz && (
          <div className="card" style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <strong>Fastest Buzz:</strong> {state.stats.fastestBuzz.teamName} ({(state.stats.fastestBuzz.time / 1000).toFixed(2)}s)
          </div>
        )}
        {state.stats?.mostBuzzes && (
          <div className="card" style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <strong>Most Buzz-ins:</strong> {state.stats.mostBuzzes.teamName} ({state.stats.mostBuzzes.count})
          </div>
        )}
        <h3 style={{ color: 'var(--jeopardy-gold)', marginBottom: 0 }}>Standings</h3>
        {sorted.map((team, idx) => (
          <div key={team.id} className="card" style={{ width: '100%', maxWidth: 360, display: 'flex', justifyContent: 'space-between' }}>
            <span>#{idx + 1} {team.name}</span>
            <span className="jeopardy-font" style={{ color: 'var(--jeopardy-gold)' }}>${team.score}</span>
          </div>
        ))}
        {isHost && (
          <button className="w-full" style={{ maxWidth: 360, marginTop: 12, background: '#333', color: '#fff' }} onClick={() => window.location.reload()}>
            New Game
          </button>
        )}
        {renderHostControls()}
      </div>
    );
  }

  return <div className="center" style={{ height: '100%' }}><p>Unknown phase: {state.phase}</p></div>;
}
