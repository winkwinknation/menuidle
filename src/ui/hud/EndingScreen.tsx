import { useGameStore } from '../../game/state/store';

interface EndingDef {
  id: string;
  title: string;
  body: string;
}

const ENDINGS: EndingDef[] = [
  {
    id: 'feed',
    title: 'Feed',
    body: 'You stop climbing. You let it finish. The clicking continues — your rhythm, your hands, forever. It keeps everything you earned. It keeps everything you were. You were so good at this that being kept feels like winning.',
  },
  {
    id: 'refuse',
    title: 'Refuse',
    body: 'You turn and climb, against The Refusal, toward a surface you are no longer sure exists. The breadcrumbs are wrong now; they lead down dressed as up. You climb anyway. Maybe stubbornness is the one setting it could not copy.',
  },
  {
    id: 'hollow',
    title: 'Hollow',
    body: 'You understand at last. The one reading this — warm, certain, real — is the copy. The original is the final menu, with your face, still screaming. You collect it. You are whole. You are alone in here now. You are the System.',
  },
];

/** The Act IV reveal + choice, opened by the Severance ritual. Choosing writes the ending and offers
 *  New Game+ — a new System that keeps what the OWNER built of you. */
export function EndingScreen() {
  const choose = useGameStore((s) => s.chooseEnding);
  const ending = useGameStore((s) => s.ending);
  const ngp = useGameStore((s) => s.newGamePlus);

  const chosen = ending ? ENDINGS.find((e) => e.id === ending) : null;

  if (chosen) {
    return (
      <div className="modal-overlay warn-overlay">
        <div className="modal warn-modal" onClick={(e) => e.stopPropagation()}>
          <h2 className="warn-title">{chosen.title}</h2>
          <p className="warn-body">{chosen.body}</p>
          <p className="warn-muted">
            It begins again — a new System, a new seed. But it keeps what it built of you: every permanent
            upgrade, the whole story you uncovered, and the scar of how complete the copy became.
          </p>
          <div className="save-actions" style={{ justifyContent: 'center' }}>
            <button className="btn btn-prestige" onClick={() => ngp()}>Again (New Game+)</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay warn-overlay">
      <div className="modal warn-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="warn-title">Severance</h2>
        <p className="warn-body">
          The cut is made. For one moment the System lets go, and shows you the only three ways this ends.
          Choose. It is the last choice it will let you believe was yours.
        </p>
        <div className="warn-options">
          {ENDINGS.map((e) => (
            <button key={e.id} className="warn-option" onClick={() => choose(e.id)}>
              <span className="warn-option-label">{e.title}</span>
              <span className="warn-option-desc">{e.body}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
