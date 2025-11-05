import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, formatMoney, formatOutcome, speakAgentLine } from '../api.js';

export default function CallConsole() {
  const { callId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState(searchParams.get('campaignId') || '');
  const [call, setCall] = useState(null);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const bottomRef = useRef(null);
  const lastSpokenAgentIdRef = useRef(null);
  const speakAbortRef = useRef(null);
  const voiceReadyRef = useRef(false);
  const autoSpeakRef = useRef(true);

  useEffect(() => {
    api
      .getVoiceStatus()
      .then((s) => {
        const ready = Boolean(s.configured);
        voiceReadyRef.current = ready;
        setVoiceReady(ready);
      })
      .catch(() => {
        voiceReadyRef.current = false;
        setVoiceReady(false);
      });
  }, []);

  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  useEffect(() => {
    api
      .getCampaigns()
      .then((rows) => {
        setCampaigns(rows);
        if (!campaignId && rows[0]) setCampaignId(String(rows[0].id));
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!callId) {
      setCall(null);
      return;
    }
    api
      .getCall(callId)
      .then(setCall)
      .catch((err) => setError(err.message));
  }, [callId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [call?.messages?.length]);

  function latestAgentMessage(callData) {
    const agents = (callData?.messages || []).filter((m) => m.role === 'agent');
    return agents[agents.length - 1] || null;
  }

  function primeAudio() {
    const audio = new Audio(
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
    );
    audio.play().catch(() => {});
  }

  async function playAgentMessage(message) {
    if (!voiceReadyRef.current || !message?.content) return;
    if (message.id != null) lastSpokenAgentIdRef.current = message.id;
    speakAbortRef.current?.abort();
    const controller = new AbortController();
    speakAbortRef.current = controller;
    setSpeaking(true);
    try {
      await speakAgentLine(message.content, { signal: controller.signal });
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setSpeaking(false);
    }
  }

  function speakLatestAgent(callData) {
    if (!autoSpeakRef.current) return;
    const message = latestAgentMessage(callData);
    if (!message || message.id === lastSpokenAgentIdRef.current) return;
    playAgentMessage(message);
  }

  useEffect(() => {
    if (!call?.messages?.length || !voiceReady || !autoSpeak) return;
    speakLatestAgent(call);
  }, [call, voiceReady, autoSpeak]);

  const canReply = call?.status === 'in_progress' && call?.current_node;

  const choices = useMemo(() => call?.current_node?.choices || [], [call]);

  async function startNext() {
    if (!campaignId) return;
    primeAudio();
    setBusy(true);
    setError('');
    try {
      const next = await api.startCall({ campaignId: Number(campaignId) });
      setCall(next);
      navigate(`/call/${next.id}`);
      speakLatestAgent(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendReply({ choiceId, replyText } = {}) {
    if (!call) return;
    primeAudio();
    setBusy(true);
    setError('');
    try {
      const updated = await api.replyToCall(call.id, {
        choiceId,
        replyText: replyText ?? reply,
      });
      setCall(updated);
      setReply('');
      speakLatestAgent(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Call Console</h1>
          <p>
            Simulated outbound conversation driven by track branches
            {voiceReady ? ' · ElevenLabs voice on' : ' · text only (add ELEVENLABS_API_KEY)'}.
          </p>
        </div>
        <div className="row">
          {voiceReady && (
            <label className="row muted" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
              />
              Auto-speak agent
            </label>
          )}
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            style={{ minWidth: 220 }}
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.queued_count} queued)
              </option>
            ))}
          </select>
          <button className="btn accent" disabled={busy || !campaignId} onClick={startNext}>
            Start next call
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {!call ? (
        <div className="panel panel-pad empty">
          Select a campaign and start the next queued call, or open a call from a campaign
          queue.
        </div>
      ) : (
        <div className="call-layout">
          <div className="panel transcript">
            <div className="panel-pad" style={{ borderBottom: '1px solid var(--line)' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{call.contact.name}</strong>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {call.contact.phone} · {call.contact.account_number} ·{' '}
                    {formatMoney(call.contact.loan_amount)}
                  </div>
                </div>
                <span
                  className={`badge ${call.status === 'completed' ? 'success' : 'warn'}`}
                >
                  {speaking
                    ? 'Speaking'
                    : call.status === 'completed'
                      ? formatOutcome(call.outcome)
                      : 'Live simulation'}
                </span>
              </div>
            </div>

            <div className="transcript-body">
              {call.messages.map((m) => (
                <div key={m.id} className={`bubble ${m.role}`}>
                  <div className="row" style={{ justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div className="who">{m.role === 'agent' ? 'Agent' : 'Borrower'}</div>
                    {m.role === 'agent' && voiceReady && (
                      <button
                        type="button"
                        className="btn ghost small"
                        disabled={speaking}
                        onClick={() => playAgentMessage(m)}
                      >
                        Play
                      </button>
                    )}
                  </div>
                  <div>{m.content}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="transcript-footer">
              {canReply ? (
                <>
                  <div className="choices">
                    {choices.map((choice) => (
                      <button
                        key={choice.id}
                        className="choice-btn"
                        disabled={busy}
                        onClick={() =>
                          sendReply({
                            choiceId: choice.id,
                            replyText: choice.label,
                          })
                        }
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                  <form
                    className="reply-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendReply({ replyText: reply });
                    }}
                  >
                    <input
                      placeholder="Type what the borrower says…"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      disabled={busy}
                    />
                    <button className="btn" disabled={busy || !reply.trim()} type="submit">
                      Send
                    </button>
                  </form>
                </>
              ) : (
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="muted">
                    Call completed — outcome{' '}
                    <strong>{formatOutcome(call.outcome)}</strong>
                  </span>
                  <div className="row">
                    <Link className="btn secondary" to={`/results`}>
                      View results
                    </Link>
                    <button className="btn accent" disabled={busy} onClick={startNext}>
                      Next call
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="side-stack">
            <div className="panel panel-pad">
              <h2 className="section-title">Call details</h2>
              <div className="kv">
                <div className="kv-row">
                  <span>Track</span>
                  <strong>{call.track_name}</strong>
                </div>
                <div className="kv-row">
                  <span>Node</span>
                  <strong>{call.current_node_id || '—'}</strong>
                </div>
                <div className="kv-row">
                  <span>Started</span>
                  <strong>{call.started_at}</strong>
                </div>
                <div className="kv-row">
                  <span>Ended</span>
                  <strong>{call.ended_at || '—'}</strong>
                </div>
              </div>
            </div>

            <div className="panel panel-pad">
              <h2 className="section-title">Gathered fields</h2>
              {call.answers.length === 0 ? (
                <div className="empty">Answers will appear as the track progresses.</div>
              ) : (
                <div className="answer-list">
                  {call.answers.map((a) => (
                    <div className="answer-item" key={a.id}>
                      <div className="key">{a.field_key}</div>
                      <div>{a.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
