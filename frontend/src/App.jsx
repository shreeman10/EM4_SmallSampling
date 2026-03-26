import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { RefreshCw, Play, CheckCircle2, AlertTriangle, Bot, User } from 'lucide-react';
import MathPanel from './components/MathPanel';
import { ErrorBarChart, PredictionsLineChart } from './components/Charts';

const API = 'http://localhost:8000';
const MONO = { fontFamily: 'var(--font-mono)' };

/* ── Count-up hook ───────────────────────────────────── */
function useCountUp(target, duration = 800) {
  const [display, setDisplay] = useState(null);
  const raf = useRef(null);
  useEffect(() => {
    if (target === null) return;
    const num = parseFloat(target);
    if (isNaN(num)) { setDisplay(target); return; }
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const decimals = String(target).includes('.') ? String(target).split('.')[1].length : 0;
      setDisplay((num * ease).toFixed(decimals));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);
  return display;
}

/* ── Metric card with count-up ───────────────────────── */
const MetricCard = ({ label, value, sub, accentColor, valueColor, badge, className = '' }) => {
  const animated = useCountUp(value);
  return (
    <div className={`card-sm fade-up ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* color bar */}
      <div style={{ width: 40, height: 4, borderRadius: 9999, background: accentColor, marginBottom: 16 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ ...MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {label}
        </span>
        {badge && <span className="pill-sig pill">{badge}</span>}
      </div>
      <p style={{ ...MONO, fontSize: 42, fontWeight: 700, lineHeight: 1, color: valueColor, letterSpacing: '-0.02em', marginBottom: 8 }}>
        {animated ?? '—'}
      </p>
      {sub && <p style={{ ...MONO, fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{sub}</p>}
    </div>
  );
};

/* ── App ─────────────────────────────────────────────── */
export default function App() {
  const [students, setStudents] = useState([]);
  const [preds,    setPreds]    = useState({});
  const [results,  setResults]  = useState(null);
  const [math,     setMath]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(false);
  const [err,      setErr]      = useState('');

  const load = async () => {
    setFetching(true); setErr(''); setResults(null); setMath(null);
    try {
      const { data } = await axios.get(`${API}/generate-sample?n=10`);
      setStudents(data.students);
      const blank = {};
      data.students.forEach(s => { blank[s.id] = ''; });
      setPreds(blank);
    } catch { setErr('Cannot reach backend. Is uvicorn running on port 8000?'); }
    setFetching(false);
  };

  useEffect(() => { load(); }, []);
  const change = (id, v) => setPreds(p => ({ ...p, [id]: v }));

  const run = async () => {
    const human = students.map(s => {
      const v = parseFloat(preds[s.id]);
      return isNaN(v) ? 0 : Math.max(0, Math.min(100, v));
    });
    setLoading(true); setErr('');
    try {
      const { data } = await axios.post(`${API}/predict-and-test`, { students, human_predictions: human });
      setResults(data.results);
      setMath(data.math_steps);
    } catch { setErr('Analysis failed. Check backend.'); }
    setLoading(false);
  };

  const meanAI    = results ? (results.reduce((a, r) => a + r.AIError,    0) / results.length).toFixed(2) : null;
  const meanHuman = results ? (results.reduce((a, r) => a + r.HumanError, 0) / results.length).toFixed(2) : null;
  const aiWins    = results ? +meanAI <= +meanHuman : null;
  const sigDiff   = math   && math.p_value < 0.05;

  const page = {
    maxWidth: 1280,
    margin: '0 auto',
    padding: '0 56px',
    paddingTop: 44,
    paddingBottom: 80,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* ── HEADER ────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ ...page, paddingTop: 0, paddingBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, paddingBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                AI vs Human — Paired t-Test
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5, letterSpacing: '0.01em' }}>
                Small-sample statistical comparison · Manual implementation · No scipy
              </p>
            </div>
            <button className="btn-ghost" onClick={load} disabled={fetching}>
              <RefreshCw size={13} style={fetching ? { animation: 'spin 1s linear infinite' } : {}} />
              {fetching ? 'Regenerating…' : 'New Sample'}
            </button>
          </div>
        </div>
      </div>

      <div style={page}>

        {/* Error */}
        {err && (
          <div style={{ marginBottom: 24, borderLeft: '3px solid var(--accent-red)', background: 'rgba(244,63,94,0.06)', borderRadius: '0 8px 8px 0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={14} color="var(--accent-red)" />
            <span style={{ ...MONO, fontSize: 13, color: 'var(--accent-red)' }}>{err}</span>
          </div>
        )}

        {/* ── ROW 1: Dataset + Inputs ──────────────────── */}
        <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 16 }}>

          {/* Dataset card */}
          <div className="card fade-up">
            <div className="card-label teal">Student Dataset Sample</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              10 randomly generated students · EndSem hidden until analysis runs
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  {['#', 'Mid-1', 'Mid-2', 'Internal', 'Attend.', 'Study h', 'Sleep h'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.length === 0
                  ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>{fetching ? 'Generating…' : 'No data'}</td></tr>
                  : students.map(s => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-muted)' }}>S{String(s.id).padStart(2, '0')}</td>
                      <td>{s.Mid1}</td><td>{s.Mid2}</td><td>{s.Internal}</td>
                      <td>{s.Attendance}</td><td>{s.StudyHours}</td><td>{s.SleepHours}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Prediction card */}
          <div className="card fade-up d1" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-label blue">Human Predictions</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>
              Enter your estimated EndSem score (0–100) for each student.
            </p>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px' }}>
              {students.map(s => (
                <div key={s.id}>
                  <div style={{ ...MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
                    S{String(s.id).padStart(2, '0')}
                  </div>
                  <input
                    type="number"
                    className="input"
                    placeholder="—"
                    min={0} max={100}
                    value={preds[s.id] ?? ''}
                    onChange={e => change(s.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <button
              className="btn-primary"
              onClick={run}
              disabled={loading || students.length === 0}
              style={{ marginTop: 20 }}
            >
              <Play size={13} fill="currentColor" />
              {loading ? 'Running Analysis…' : 'Execute Analysis Protocol'}
            </button>
          </div>
        </div>

        {/* ── RESULTS ──────────────────────────────────── */}
        {results && (
          <div>
            {/* Metric cards */}
            <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
              <MetricCard className="d1" label="Mean AI Error"    value={meanAI}    sub={aiWins ? 'AI model outperformed human' : 'AI underperformed'} accentColor="var(--accent-green)" valueColor="var(--accent-green)" />
              <MetricCard className="d2" label="Mean Human Error" value={meanHuman} sub={!aiWins ? 'Human outperformed AI' : 'Human underperformed'}   accentColor="var(--accent-red)"   valueColor="var(--accent-red)"   />
              <MetricCard className="d3" label="t-Statistic"      value={math?.t_stat?.toFixed(3)}  sub={`df = ${math?.df} · two-tailed`}     accentColor="var(--accent-teal)"  valueColor="var(--text-primary)" />
              <MetricCard className="d4" label="p-Value"          value={math?.p_value?.toFixed(4)} sub="α = 0.05 significance threshold"     accentColor="var(--accent-blue)"  valueColor="var(--accent-blue)"  badge={sigDiff ? 'Significant' : 'Not sig.'} />
            </div>

            {/* Verdict banner */}
            <div style={{
              marginBottom: 24,
              background: sigDiff ? 'linear-gradient(90deg,rgba(16,185,129,0.06),transparent)' : 'linear-gradient(90deg,rgba(249,115,22,0.06),transparent)',
              borderLeft: `3px solid ${sigDiff ? 'var(--accent-green)' : '#F97316'}`,
              borderRadius: '0 12px 12px 0',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}>
              <div style={{
                width: 28, height: 28, flexShrink: 0, borderRadius: '50%',
                background: sigDiff ? 'rgba(16,185,129,0.12)' : 'rgba(249,115,22,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {sigDiff
                  ? <CheckCircle2 size={15} color="var(--accent-green)" />
                  : <AlertTriangle size={15} color="#F97316" />}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: sigDiff ? 'var(--accent-green)' : '#F97316', marginBottom: 4 }}>
                  {sigDiff ? 'Reject H₀ — Statistically significant difference detected' : 'Fail to Reject H₀ — No significant difference found'}
                </p>
                <p style={{ ...MONO, fontSize: 11, color: 'var(--text-muted)' }}>
                  H₀: μ_d = 0 &nbsp;·&nbsp; H₁: μ_d ≠ 0 &nbsp;·&nbsp; Two-tailed &nbsp;·&nbsp; p = {math?.p_value?.toFixed(4)}
                </p>
              </div>
            </div>

            {/* Comparison matrix */}
            <div style={{ marginBottom: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                <div className="card-label green" style={{ marginBottom: 0 }}>Prediction Comparison Matrix</div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    {['Student', 'Actual', 'AI Prediction', 'Human Prediction', 'AI Error', 'Human Error', 'Superior'].map((h, i) => (
                      <th key={i} style={{ paddingLeft: i === 0 ? 24 : 14 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => {
                    const aiBetter = r.AIError < r.HumanError;
                    const tie      = r.AIError === r.HumanError;
                    return (
                      <tr key={r.id}>
                        <td style={{ color: 'var(--text-muted)', paddingLeft: 24 }}>S{String(r.id).padStart(2, '0')}</td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.Actual}</td>
                        <td style={{ color: 'var(--accent-teal)' }}>{r.AIPred}</td>
                        <td style={{ color: 'var(--accent-red)' }}>{r.HumanPred}</td>
                        <td style={{ color: 'var(--accent-blue)' }}>{r.AIError}</td>
                        <td style={{ color: !aiBetter && !tie ? 'var(--accent-red)' : 'var(--text-muted)' }}>{r.HumanError}</td>
                        <td>
                          {tie
                            ? <span className="pill pill-muted">Tie</span>
                            : aiBetter
                              ? <span className="pill pill-blue"><Bot size={10}/> AI</span>
                              : <span className="pill pill-green"><User size={10}/> Human</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ paddingLeft: 24, color: 'var(--text-muted)', fontSize: 11, textAlign: 'right' }}>Aggregate mean errors →</td>
                    <td style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{meanAI}</td>
                    <td style={{ color: 'var(--accent-red)', fontWeight: 700 }}>{meanHuman}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Charts */}
            <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card" style={{ height: 380, display: 'flex', flexDirection: 'column' }}>
                <div className="card-label blue" style={{ marginBottom: 12 }}>Error Magnitude Comparison</div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <ErrorBarChart results={results} />
                </div>
              </div>
              <div className="card" style={{ height: 380, display: 'flex', flexDirection: 'column' }}>
                <div className="card-label teal" style={{ marginBottom: 12 }}>Prediction vs Actual Scores</div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <PredictionsLineChart results={results} />
                </div>
              </div>
            </div>

            {/* Math proof */}
            <MathPanel mathProps={math} />
          </div>
        )}
      </div>
    </div>
  );
}
