import React, { useEffect, useMemo, useState } from 'react';

// The "activities" pack: interactive learning activities ported from the standalone
// embedded-activities family (portfolio/embedded-projects/simple/activities). The old
// inline `window.activityData` configs became library schemas; the interaction logic
// lives here as React components. Same contract as the kingfisher web pack: props = the
// node's merged data + renderChildren(); design tokens via --theme-* CSS variables;
// SSR-safe (browser APIs only inside effects/handlers). Page chrome (background, text
// color, body font) is applied by index.html on .player-themed, so a lone activity at
// the document root looks right without an activitySet parent.

const vars = {
  accent: 'var(--theme-accent, #5b8def)',
  accentText: 'var(--theme-accent-text, #ffffff)',
  surface: 'var(--theme-surface, #2a3054)',
  border: 'var(--theme-border, #3d4470)',
  headingFont: 'var(--theme-heading-font, system-ui, sans-serif)',
  maxWidth: 'var(--theme-max-width, 860px)',
  radius: 'calc(var(--theme-radius, 12) * 1px)',
};

const GOOD = '#2e9e5b';
const BAD = '#d4553a';

const card = {
  maxWidth: vars.maxWidth,
  margin: '2rem auto',
  padding: '1.75rem 1.9rem',
  background: vars.surface,
  border: `1px solid ${vars.border}`,
  borderRadius: vars.radius,
};

function ActivityHead({ title, sub }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
      <h2 style={{ fontFamily: vars.headingFont, fontSize: '1.6rem', margin: 0 }}>{title}</h2>
      {sub && <p style={{ opacity: 0.8, margin: '0.5rem auto 0', maxWidth: 560 }}>{sub}</p>}
    </div>
  );
}

const actionBtn = (primary) => ({
  padding: '0.6rem 1.4rem',
  borderRadius: vars.radius,
  border: `2px solid ${vars.accent}`,
  background: primary ? vars.accent : 'transparent',
  color: primary ? vars.accentText : 'inherit',
  fontWeight: 600,
  fontSize: '0.95rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
});

// --- Activity set -----------------------------------------------------------------

export function ActivitySet({ title, intro, renderChildren }) {
  return (
    <div>
      <div style={{ textAlign: 'center', margin: '2.5rem auto 0', maxWidth: vars.maxWidth }}>
        <h1 style={{ fontFamily: vars.headingFont, fontSize: '2.1rem', margin: 0 }}>{title}</h1>
        {intro && <p style={{ opacity: 0.8, margin: '0.6rem auto 0', maxWidth: 620 }}>{intro}</p>}
      </div>
      {renderChildren()}
    </div>
  );
}

// --- Matching ---------------------------------------------------------------------

/** Deterministic shuffle (LCG seeded by list length) so SSR and hydration agree. */
function shuffled(list) {
  const arr = list.map((v, i) => ({ v, i }));
  let seed = (arr.length * 2654435761) % 4294967296;
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function Matching({ title, introText, sourceLabel, targetLabel, pairs, shuffleTargets, successMessage, partialMessage, renderChildren }) {
  const list = Array.isArray(pairs) ? pairs.filter((p) => p?.source && p?.target) : [];
  const targets = useMemo(
    () => (shuffleTargets === false ? list.map((p, i) => ({ v: p, i })) : shuffled(list)),
    [JSON.stringify(list), shuffleTargets] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [selected, setSelected] = useState(null); // source index awaiting a target
  const [matches, setMatches] = useState({}); // sourceIndex -> original pair index of chosen target
  const [submitted, setSubmitted] = useState(false);

  const allMatched = Object.keys(matches).length === list.length && list.length > 0;
  const correctCount = list.reduce((sum, _p, i) => sum + (matches[i] === i ? 1 : 0), 0);

  function pickSource(i) {
    if (submitted) return;
    setSelected(selected === i ? null : i);
  }
  function pickTarget(originalIndex) {
    if (submitted) return;
    const takenBy = Object.entries(matches).find(([, t]) => t === originalIndex)?.[0];
    if (takenBy !== undefined) {
      // clicking a matched target unmatches it
      setMatches((prev) => {
        const next = { ...prev };
        delete next[takenBy];
        return next;
      });
      return;
    }
    if (selected === null) return;
    setMatches((prev) => ({ ...prev, [selected]: originalIndex }));
    setSelected(null);
  }
  function reset() {
    setMatches({});
    setSelected(null);
    setSubmitted(false);
  }

  const matchNumber = (originalIndex) => {
    const entry = Object.entries(matches).find(([, t]) => t === originalIndex);
    return entry ? Number(entry[0]) + 1 : null;
  };

  const pill = (state) => ({
    display: 'block', width: '100%', textAlign: 'left', margin: '0 0 0.6rem',
    padding: '0.65rem 0.85rem', borderRadius: vars.radius, fontFamily: 'inherit', fontSize: '0.95rem',
    color: 'inherit', cursor: submitted ? 'default' : 'pointer', lineHeight: 1.4,
    background: 'transparent',
    border: `2px solid ${state === 'good' ? GOOD : state === 'bad' ? BAD : state === 'active' ? vars.accent : vars.border}`,
    boxShadow: state === 'active' ? `0 0 0 2px ${vars.accent}` : 'none',
    opacity: state === 'dim' ? 0.55 : 1,
  });

  return (
    <div style={card}>
      <ActivityHead title={title} sub={introText} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '1.5rem' }}>
        <div>
          <h3 style={{ fontFamily: vars.headingFont, fontSize: '1rem', textAlign: 'center', margin: '0 0 0.7rem', opacity: 0.85 }}>{sourceLabel || 'Concepts'}</h3>
          {list.map((p, i) => {
            const matchedTo = matches[i];
            const state = submitted
              ? (matchedTo === i ? 'good' : 'bad')
              : selected === i ? 'active' : matchedTo !== undefined ? 'dim' : 'idle';
            return (
              <button key={i} type="button" style={pill(state)} onClick={() => pickSource(i)} aria-pressed={selected === i}>
                <strong>{i + 1}.</strong> {p.source}
                {matchedTo !== undefined && !submitted && <span style={{ float: 'right', opacity: 0.7 }}>→ matched</span>}
                {submitted && <span style={{ float: 'right' }}>{matchedTo === i ? '✓' : '✗'}</span>}
              </button>
            );
          })}
        </div>
        <div>
          <h3 style={{ fontFamily: vars.headingFont, fontSize: '1rem', textAlign: 'center', margin: '0 0 0.7rem', opacity: 0.85 }}>{targetLabel || 'Examples'}</h3>
          {targets.map(({ v, i: originalIndex }) => {
            const num = matchNumber(originalIndex);
            const state = submitted
              ? (matches[originalIndex] === originalIndex && num ? 'good' : num ? 'bad' : 'idle')
              : num ? 'dim' : 'idle';
            return (
              <button key={originalIndex} type="button" style={pill(state)} onClick={() => pickTarget(originalIndex)}>
                {num && <strong style={{ color: vars.accent }}>{num} · </strong>}
                {v.target}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: '1.2rem' }} aria-live="polite">
        {submitted && (
          <p style={{ fontWeight: 600, color: correctCount === list.length ? GOOD : 'inherit' }}>
            {correctCount} / {list.length} correct. {correctCount === list.length ? (successMessage || 'Great work!') : (partialMessage || 'Review the red pairs and try again.')}
          </p>
        )}
        {!submitted ? (
          <button type="button" style={{ ...actionBtn(true), opacity: allMatched ? 1 : 0.55 }} disabled={!allMatched} onClick={() => setSubmitted(true)}>
            Submit answers ✓
          </button>
        ) : (
          <button type="button" style={actionBtn(false)} onClick={reset}>Try again 🔄</button>
        )}
      </div>
      {renderChildren()}
    </div>
  );
}

// --- Compare slider ------------------------------------------------------------------

export function CompareSlider({ title, description, themes, renderChildren }) {
  const list = Array.isArray(themes) ? themes.filter((t) => t?.name) : [];
  const [active, setActive] = useState(0);
  const [value, setValue] = useState(50);
  const theme = list[Math.min(active, Math.max(list.length - 1, 0))];
  if (!theme) return null;

  const zone = value < 35 ? 'left' : value > 65 ? 'right' : 'center';
  const zoneTitle = zone === 'left' ? theme.leftConcept : zone === 'right' ? theme.rightConcept : 'Balanced approach';
  const zoneText = theme[zone];
  const leftColor = theme.leftColor || '#e74c3c';
  const rightColor = theme.rightColor || '#3498db';

  return (
    <div style={card}>
      <ActivityHead title={title} sub={description} />
      {list.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', marginBottom: '1.3rem' }}>
          {list.map((t, i) => (
            <button key={i} type="button"
              onClick={() => { setActive(i); setValue(50); }}
              style={{ ...actionBtn(i === active), padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>
              {t.name}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.8rem' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: `${1.6 + (100 - value) / 60}rem`, transition: 'font-size 0.15s' }} aria-hidden>{theme.leftIcon || '◀'}</div>
          <div style={{ fontWeight: 700, color: leftColor }}>{theme.leftConcept}</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: `${1.6 + value / 60}rem`, transition: 'font-size 0.15s' }} aria-hidden>{theme.rightIcon || '▶'}</div>
          <div style={{ fontWeight: 700, color: rightColor }}>{theme.rightConcept}</div>
        </div>
      </div>
      <input
        type="range" min="0" max="100" value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-label={`Balance between ${theme.leftConcept} and ${theme.rightConcept}`}
        style={{ width: '100%', accentColor: zone === 'left' ? leftColor : zone === 'right' ? rightColor : undefined }}
      />
      <div style={{ background: `linear-gradient(90deg, ${leftColor}, ${rightColor})`, height: 6, borderRadius: 3, opacity: 0.55, marginTop: 2 }} />
      <div style={{ background: 'rgba(0,0,0,0.18)', border: `1px solid ${vars.border}`, borderRadius: vars.radius, padding: '0.9rem 1.1rem', marginTop: '1.1rem', minHeight: '5.2rem' }} aria-live="polite">
        <strong style={{ display: 'block', marginBottom: '0.25rem', color: zone === 'left' ? leftColor : zone === 'right' ? rightColor : 'inherit' }}>{zoneTitle}</strong>
        <span style={{ opacity: 0.9 }}>{zoneText}</span>
      </div>
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button type="button" style={actionBtn(false)} onClick={() => setValue(50)}>🔄 Reset to center</button>
      </div>
      {renderChildren()}
    </div>
  );
}

// --- Speed sort ------------------------------------------------------------------------

export function SpeedSort({ title, description, rounds, renderChildren }) {
  const list = Array.isArray(rounds) ? rounds.filter((r) => Array.isArray(r?.words) && r.words.length) : [];
  const [round, setRound] = useState(0);
  const [word, setWord] = useState(0);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState(null); // 'good' | 'bad' | null
  const totalWords = list.reduce((sum, r) => sum + r.words.length, 0);
  const current = list[round];
  const done = list.length > 0 && round >= list.length;

  function answer(side) {
    if (!current || flash) return;
    const correct = current.words[word]?.category === side;
    if (correct) setScore((s) => s + 1);
    setFlash(correct ? 'good' : 'bad');
    setTimeout(() => {
      setFlash(null);
      if (word + 1 < current.words.length) setWord(word + 1);
      else { setRound(round + 1); setWord(0); }
    }, 420);
  }
  function replay() {
    setRound(0); setWord(0); setScore(0); setFlash(null);
  }

  // Arrow keys answer too — the signature interaction of the original.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft') answer('left');
      else if (e.key === 'ArrowRight') answer('right');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!list.length) return null;

  const sideBtn = (side, label) => (
    <button type="button" onClick={() => answer(side)}
      style={{ ...actionBtn(false), flex: 1, padding: '0.9rem 0.5rem', fontSize: '1rem' }}>
      {side === 'left' ? '⬅ ' : ''}{label}{side === 'right' ? ' ➡' : ''}
    </button>
  );

  return (
    <div style={card}>
      <ActivityHead title={title} sub={description} />
      {done ? (
        <div style={{ textAlign: 'center' }} aria-live="polite">
          <p style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.4rem' }}>Score: {score} / {totalWords}</p>
          <p style={{ opacity: 0.8, margin: '0 0 1rem' }}>{score === totalWords ? 'Perfect round!' : score >= Math.ceil(totalWords * 0.7) ? 'Nice sorting!' : 'Worth another run.'}</p>
          <button type="button" style={actionBtn(true)} onClick={replay}>Play again 🔄</button>
        </div>
      ) : (
        <>
          <p style={{ textAlign: 'center', opacity: 0.8, margin: '0 0 1rem' }}>
            {current.instructions} <span style={{ opacity: 0.7 }}>— round {round + 1} of {list.length}</span>
          </p>
          <div
            style={{
              textAlign: 'center', padding: '1.6rem 1rem', marginBottom: '1.1rem',
              fontSize: '1.7rem', fontWeight: 700, borderRadius: vars.radius,
              border: `2px solid ${flash === 'good' ? GOOD : flash === 'bad' ? BAD : vars.border}`,
              background: flash === 'good' ? 'rgba(46,158,91,0.16)' : flash === 'bad' ? 'rgba(212,85,58,0.16)' : 'rgba(0,0,0,0.15)',
              transition: 'border-color 0.1s, background 0.1s',
            }}
            aria-live="polite"
          >
            {current.words[word]?.text}
          </div>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            {sideBtn('left', current.leftCategory || 'Left')}
            {sideBtn('right', current.rightCategory || 'Right')}
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', opacity: 0.65, margin: '0.9rem 0 0' }}>
            {word + 1} / {current.words.length} · score {score} · arrow keys work too
          </p>
        </>
      )}
      {renderChildren()}
    </div>
  );
}

/** typeKey → component, matching library/activities-library.json */
export const activitiesPack = {
  activitySet: ActivitySet,
  matching: Matching,
  compareSlider: CompareSlider,
  speedSort: SpeedSort,
};
