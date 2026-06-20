import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API } from '@/api/api';
import useAuthStore from '@/store/useAuthStore';
import { fetchLids } from '@/pages/lid/lid.service';
import './ipTelephone.css';
import { useSip } from './useSip';
import noAnswerIcon from '../../assets/images/missed-cal.svg';

interface UserRole {
  name: string;
}

interface User {
  roles?: UserRole[];
  role?: UserRole | string;
}

function isAllowedUser(user: User | null): boolean {
  if (!user) return false;

  const checkRole = (roleName: string) => {
    if (!roleName) return false;
    const r = roleName.toLowerCase();
    return r.includes('operator') || r.includes('admin');
  };

  if (Array.isArray(user.roles)) {
    return user.roles.some((r: UserRole) => checkRole(r.name));
  }
  if (typeof user.role === 'object' && user.role !== null) {
    return checkRole(user.role.name);
  }
  if (typeof user.role === 'string') {
    return checkRole(user.role);
  }
  return false;
}

interface CallRecord {
  vaqt: string;
  raqam: string;
  davomiyligi: number;
  operator: string;
  status: 'ANSWERED' | 'FAILED' | 'NO ANSWER';
  baho: string;
  recordingfile: string;
}

interface HistoryResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: CallRecord[];
}

const BASE_URL = 'https://mainoffice.uz:8181';

function formatDuration(sec: number): string {
  if (!sec) return '0:00';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDateTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const time = d.toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const date = d.toLocaleDateString('ru-RU');
  return `${time} ${date}`;
}

function statusLabel(status: string) {
  switch (status) {
    case 'ANSWERED':
      return { label: 'Qabul qilindi', cls: 'status-answered' };
    case 'FAILED':
      return { label: 'Bekor qilindi', cls: 'status-failed' };
    case 'NO ANSWER':
      return { label: 'Javob yo‘q', cls: 'status-noanswer' };
    default:
      return { label: status, cls: '' };
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'ANSWERED':
      return <i className="fas fa-phone ipt-status-icon answered" />;
    case 'FAILED':
      return <i className="fas fa-phone-slash ipt-status-icon failed" />;
    case 'NO ANSWER':
      return <img src={noAnswerIcon} alt="no answer icon" className="noAnswer-icon noanswer" />;
    default:
      return <i className="fas fa-phone ipt-status-icon" />;
  }
}

interface IpTelefonOperator {
  id: number;
  login: number;
  branch?: { id: number; name_uz?: string; name_ru?: string; name_en?: string };
  employee?: { id: number; first_name: string; last_name: string; middle_name?: string };
  filial?: string;
  name?: string;
}

interface CallModalProps {
  initialNumber: string;
  onCall: (number: string) => void;
  onHangup: () => void;
  onMute: (muted: boolean) => void;
  onHold: (held: boolean) => Promise<void>;
  onSendDtmf: (tone: string) => void;
  onAnswer: () => Promise<void>;
  callState: string;
  elapsed: number;
  onClose: () => void;
  onBlindTransfer: (ext: string) => Promise<void>;
  onAttendedTransfer: (ext: string) => Promise<void>;
  operators: IpTelefonOperator[];
}

const DIALPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

const CallModal: React.FC<CallModalProps> = ({
  initialNumber,
  onCall,
  onHangup,
  onMute,
  onHold,
  onSendDtmf,
  onAnswer,
  callState,
  elapsed,
  onClose,
  onBlindTransfer,
  onAttendedTransfer,
  operators,
}) => {
  const { t } = useTranslation();
  const [number, setNumber] = useState(initialNumber);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  const [showDialpad, setShowDialpad] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [transferMode, setTransferMode] = useState<'direct' | 'hold'>('direct');
  const [selectedOpId, setSelectedOpId] = useState<number | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const keyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // FIX: answering state - javob berish jarayonida tugmani ikki marta bosilishini oldini olish
  const [isAnswering, setIsAnswering] = useState(false);

  const isInCall = callState === 'active' || callState === 'connecting';
  const isIncoming = callState === 'ringing';

  useEffect(() => {
    setNumber(initialNumber);
  }, [initialNumber]);

  useEffect(() => {
    if (isInCall || isIncoming) setShowDialpad(false);
    else {
      setShowDialpad(true);
      setShowDrawer(false);
      setSelectedOpId(null);
      setMuted(false);
      setHeld(false);
      // FIX: State tozalash
      setIsAnswering(false);
    }
  }, [isInCall, isIncoming]);

  const pressKey = (k: string) => {
    if (isInCall) onSendDtmf(k);
    setNumber((v) => v + k);
    activateKey(k);
  };

  const backspace = () => {
    setNumber((v) => v.slice(0, -1));
    activateKey('Backspace');
  };

  const activateKey = (k: string) => {
    setActiveKey(k);
    if (keyTimeoutRef.current) clearTimeout(keyTimeoutRef.current);
    keyTimeoutRef.current = setTimeout(() => setActiveKey(null), 150);
  };

  const toggleHold = async () => {
    const n = !held;
    setHeld(n);
    await onHold(n);
  };

  const toggleMute = () => {
    const n = !muted;
    setMuted(n);
    onMute(n);
  };

  // FIX: Keyboard handler - stale closure muammosini hal qilish
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Modal ichida input focused bo'lsa ignore
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && target !== document.activeElement) return;

      if (/^[\d*#]$/.test(e.key)) {
        e.preventDefault();
        pressKey(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === 'Enter' && number.length > 0 && callState === 'idle') {
        e.preventDefault();
        onCall(number);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callState, number]); // eslint-disable-line react-hooks/exhaustive-deps

  // FIX: Answer handler - loading state bilan
  const handleAnswer = async () => {
    if (isAnswering) return;
    setIsAnswering(true);
    try {
      await onAnswer();
    } catch (err) {
      console.error('Answer error in modal:', err);
      setIsAnswering(false);
    }
    // Note: isAnswering state ni callState o'zgarganda useEffect tozalaydi
  };

  const handleOperatorClick = async (op: IpTelefonOperator) => {
    setSelectedOpId(op.id);
    const ext = String(op.login);
    if (transferMode === 'direct') await onBlindTransfer(ext);
    else await onAttendedTransfer(ext);
  };

  const elapsed_m = Math.floor(elapsed / 60);
  const elapsed_s = (elapsed % 60).toString().padStart(2, '0');

  if (minimized && (isInCall || isIncoming)) {
    return (
      <div className="ipt-minimized-bar">
        <div className="ipt-min-info">
          <div className="ipt-min-number">
            <i
              className="fas fa-phone-alt"
              style={{ marginRight: '10px', fontSize: '14px', opacity: 0.8 }}
            />
            {number || initialNumber}
          </div>
          <div className="ipt-min-timer">
            <span className="ipt-timer-dot" />
            {elapsed_m}:{elapsed_s}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            onClick={toggleMute}
            className="ipt-tg-btn"
            title={muted ? t('ipTelephone.muteOff') : t('ipTelephone.muteOn')}
          >
            <i
              className={`fas ${muted ? 'fa-microphone-slash' : 'fa-microphone'}`}
              style={{ color: muted ? '#E70A0A' : '#fff' }}
            />
          </button>

          <button
            onClick={() => setMinimized(false)}
            className="ipt-tg-btn"
            title={t('ipTelephone.maximize')}
          >
            <i className="fas fa-expand-alt" />
          </button>

          <button
            onClick={onHangup}
            className="ipt-btn-hangup"
            style={{
              borderRadius: '6px',
              height: '32px',
              padding: '0 15px',
              width: 'auto',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fas fa-phone-slash" />
            {t('ipTelephone.end')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ipt-modal-overlay">
      <div className="ipt-modal-wrapper" style={{ width: showDrawer ? '680px' : '380px' }}>
        {/* ── LEFT PANEL ── */}
        <div className="ipt-unified-modal">
          {/* Header Buttons (Telegram Style) */}
          <div className="ipt-tg-header">
            <button
              onClick={() => setMinimized(true)}
              className="ipt-tg-btn"
              title={t('ipTelephone.minimize')}
            >
              <i className="fas fa-minus" />
            </button>
            <button className="ipt-tg-btn" title={t('ipTelephone.maximize')}>
              <i className="far fa-square" />
            </button>
            <button onClick={onClose} className="ipt-tg-btn" title={t('ipTelephone.close')}>
              <i className="fas fa-times" />
            </button>
          </div>

          {/* ── ACTIVE CALL VIEW ── */}
          {isInCall || isIncoming ? (
            <div
              className="ipt-unified-modal"
              style={{ padding: 0, minHeight: 'auto', width: '100%' }}
            >
              <div className="ipt-avatar-circle">
                <i className="fa-solid fa-user" />
              </div>
              <div className="ipt-call-number">{number || initialNumber}</div>

              {callState === 'active' && (
                <div className="ipt-call-timer">
                  <span className="ipt-timer-dot" />
                  <span className="ipt-timer-text">
                    {elapsed_m}:{elapsed_s}
                  </span>
                </div>
              )}
              {isIncoming && (
                <div className="ipt-timer-text" style={{ fontSize: '14px', opacity: 0.7 }}>
                  {t('ipTelephone.incoming')}
                </div>
              )}
              {callState === 'connecting' && (
                <div className="ipt-timer-text" style={{ fontSize: '14px', opacity: 0.7 }}>
                  {t('ipTelephone.connecting')}
                </div>
              )}
            </div>
          ) : (
            /* ── DIALPAD VIEW ── */
            <>
              <div
                style={{
                  width: '160px',
                  background: 'rgba(255,255,255,0.3)',
                  marginBottom: '20px',
                  borderRadius: '2px',
                }}
              />
              <div className="ipt-dial-input-area">
                <span className="ipt-dial-display">
                  {number || t('ipTelephone.dialpadPlaceholder')}
                </span>
                <button
                  onClick={backspace}
                  disabled={!number}
                  className={`ipt-backspace-btn ${activeKey === 'Backspace' ? 'active' : ''}`}
                >
                  <i className="fa-solid fa-delete-left" />
                </button>
              </div>

              {showDialpad && (
                <div className="ipt-dial-grid">
                  {DIALPAD_KEYS.map((k) => (
                    <button
                      key={k}
                      onClick={() => pressKey(k)}
                      className={`ipt-dial-key ${activeKey === k ? 'active' : ''}`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── BUTTON ROW ── */}
          <div className="ipt-action-row">
            <button
              onClick={toggleHold}
              disabled={callState !== 'active'}
              className={`ipt-round-btn ipt-btn-hold`}
              title={t('ipTelephone.hold')}
            >
              <i className={`fas ${held ? 'fa-play' : 'fa-pause'}`} />
            </button>

            <button
              onClick={toggleMute}
              disabled={callState !== 'active'}
              className={`ipt-round-btn ipt-btn-mute`}
              title={muted ? t('ipTelephone.muteOff') : t('ipTelephone.muteOn')}
            >
              <i className={`fas ${muted ? 'fa-microphone-slash' : 'fa-microphone'}`} />
            </button>

            {/* Yo'naltirish - active qo'ng'iroqlarda ko'rinadigan */}
            <button
              onClick={() => setShowDrawer((v) => !v)}
              disabled={callState !== 'active'}
              className={`ipt-round-btn ipt-btn-share`}
              title={t('ipTelephone.transfer')}
            >
              <i className="fa-solid fa-share" />
            </button>

            {/* FIX: Cancel/Hangup - barcha holatlarda ishlaydi */}
            <button
              onClick={callState !== 'idle' ? onHangup : onClose}
              className="ipt-round-btn ipt-btn-hangup"
              title={callState !== 'idle' ? t('ipTelephone.hangup') : t('ipTelephone.close')}
              style={{ cursor: 'pointer' }}
            >
              <i className={`fas ${callState !== 'idle' ? 'fa-phone-slash' : 'fa-times'}`} />
            </button>

            {/* FIX: Answer/Call tugmasi - to'g'ri disable logikasi */}
            <button
              disabled={
                isAnswering ||
                callState === 'active' ||
                callState === 'connecting' ||
                (callState === 'idle' && !number)
              }
              onClick={() => {
                if (callState === 'ringing') {
                  handleAnswer();
                } else if (callState === 'idle' && number) {
                  onCall(number);
                }
              }}
              className="ipt-round-btn ipt-btn-answer"
              title={
                callState === 'ringing'
                  ? isAnswering
                    ? t('ipTelephone.connecting')
                    : t('ipTelephone.answer')
                  : t('ipTelephone.callBtn')
              }
              style={{ cursor: 'pointer' }}
            >
              {isAnswering ? (
                <i className="fas fa-spinner fa-spin" />
              ) : (
                <i className="fas fa-phone-alt" />
              )}
            </button>

            <button
              onClick={() => setShowDialpad((v) => !v)}
              className={`ipt-round-btn ipt-btn-dialpad`}
              title={t('ipTelephone.dialpad')}
            >
              <i className="fas fa-th" />
            </button>
          </div>
        </div>

        {/* ── RIGHT DRAWER ── */}
        {showDrawer && (
          <div className="ipt-right-drawer">
            <div className="ipt-mode-tabs">
              {(['direct', 'hold'] as const).map((mode) => {
                const active = transferMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setTransferMode(mode)}
                    className={`ipt-mode-btn ${active ? 'active' : ''}`}
                  >
                    {mode === 'direct'
                      ? t('ipTelephone.transferDirect')
                      : t('ipTelephone.transferHold')}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                height: '1px',
                background: 'rgba(0,0,0,0.05)',
                margin: '0 16px',
              }}
            />

            <div className="ipt-operator-list">
              {operators.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '13px',
                  }}
                >
                  {t('ipTelephone.noOperators')}
                </div>
              ) : (
                operators.map((op) => {
                  const selected = selectedOpId === op.id;
                  return (
                    <div
                      key={op.id}
                      onClick={() => handleOperatorClick(op)}
                      className="ipt-operator-item"
                      style={{ background: selected ? '#FE9100' : '' }}
                    >
                      <div>
                        <div className="ipt-op-login" style={{ color: selected ? '#fff' : '' }}>
                          {op.branch?.name_uz || op.filial || t('ipTelephone.branchDefault')}
                        </div>
                        <div className="ipt-op-name" style={{ color: selected ? '#fff' : '' }}>
                          {op.employee
                            ? `${op.employee.last_name} ${op.employee.first_name}`
                            : op.name || 'Operator'}
                        </div>
                      </div>
                      <div
                        className="ipt-op-login"
                        style={{
                          fontSize: '18px',
                          color: selected ? '#fff' : '#003366',
                          fontWeight: 'bold',
                        }}
                      >
                        {op.login}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface AudioPlayerProps {
  filename: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ filename }) => {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const fetchAndPlay = useCallback(async () => {
    if (audioUrl) {
      const audio = audioRef.current!;
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        window.dispatchEvent(new CustomEvent('stopAllAudio', { detail: filename }));
        audio.play();
        setPlaying(true);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/get_link/${filename}`);
      const json = await res.json();

      let url: string =
        json.download_url || json.url || json.link || json.file_url || json.path || '';

      if (url.startsWith('/')) {
        url = `${BASE_URL}${url}`;
      }

      if (!url) {
        throw new Error('Audio URL topilmadi');
      }

      setAudioUrl(url);
    } catch {
      setLoading(false);
    }
  }, [audioUrl, playing, filename]);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
      setLoading(false);
    });
    audio.addEventListener('timeupdate', () => {
      setProgress(audio.currentTime / audio.duration || 0);
    });
    audio.addEventListener('ended', () => {
      setPlaying(false);
      setProgress(0);
    });
    audio
      .play()
      .then(() => {
        window.dispatchEvent(new CustomEvent('stopAllAudio', { detail: filename }));
        setPlaying(true);
      })
      .catch(() => setLoading(false));

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl, filename]);

  useEffect(() => {
    const handleStopOtherAudio = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== filename) {
        if (audioRef.current && playing) {
          audioRef.current.pause();
          setPlaying(false);
        }
      }
    };

    window.addEventListener('stopAllAudio', handleStopOtherAudio);
    return () => window.removeEventListener('stopAllAudio', handleStopOtherAudio);
  }, [playing, filename]);

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setProgress(val);
    if (audioRef.current) audioRef.current.currentTime = val * audioRef.current.duration;
  };

  const displayTime = duration ? formatDuration(Math.round(duration)) : '';

  return (
    <div className="ipt-audio-player">
      <button
        className={`ipt-play-btn${loading ? ' ipt-loading' : ''}`}
        onClick={fetchAndPlay}
        disabled={loading}
        title={playing ? t('ipTelephone.audioPause') : t('ipTelephone.audioPlay')}
      >
        {loading ? (
          <i className="fas fa-spinner fa-spin" />
        ) : playing ? (
          <i className="fas fa-pause" />
        ) : (
          <i className="fas fa-play" />
        )}
      </button>

      <input
        type="range"
        className="ipt-progress"
        min={0}
        max={1}
        step={0.001}
        value={progress}
        onChange={seek}
      />

      {displayTime && <span className="ipt-duration">{displayTime}</span>}
    </div>
  );
};

const isOperatorNumber = (num: string) => {
  if (!num) return false;
  return num === '552051515' || (num.length === 4 && Number(num) >= 1000);
};

const getCallInfo = (r: CallRecord) => {
  let client = r.operator;
  let op = r.raqam;
  let direction = 'unknown';

  if (isOperatorNumber(r.raqam) && !isOperatorNumber(r.operator)) {
    op = r.raqam;
    client = r.operator;
    direction = 'out';
  } else if (!isOperatorNumber(r.raqam) && isOperatorNumber(r.operator)) {
    client = r.raqam;
    op = r.operator;
    direction = 'in';
  } else {
    if (r.recordingfile?.startsWith('in-')) direction = 'in';
    else if (r.recordingfile?.startsWith('out-')) direction = 'out';
  }

  if (r.recordingfile) {
    if (r.recordingfile.startsWith('in-')) direction = 'in';
    if (r.recordingfile.startsWith('out-')) direction = 'out';
  }

  return { client, op, direction };
};

const IPTelephone: React.FC = () => {
  const { t } = useTranslation();
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const location = useLocation();

  const FILTERS = useMemo(
    () => [
      { key: 'all', label: t('ipTelephone.filterAll') },
      { key: 'in', label: t('ipTelephone.filterIn') },
      { key: 'out', label: t('ipTelephone.filterOut') },
      { key: 'missed', label: t('ipTelephone.filterMissed') },
      { key: 'rejected', label: t('ipTelephone.filterRejected') },
    ],
    [t],
  );

  const {
    callState,
    callTarget,
    registered,
    makeCall,
    hangup,
    answer,
    mute,
    hold,
    sendDtmf,
    blindTransfer,
    attendedTransfer,
    elapsed,
  } = useSip(remoteAudioRef as React.RefObject<HTMLAudioElement>);

  const [phoneToName, setPhoneToName] = useState<Record<string, string>>({});
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterWrapRef.current && !filterWrapRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    if (showFilterMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterMenu]);
  const [showCallModal, setShowCallModal] = useState(false);
  const [modalInitialNumber, setModalInitialNumber] = useState('');
  const [operators, setOperators] = useState<IpTelefonOperator[]>([]);

  const showCallModalRef = useRef(false);
  const pendingCallRef = useRef<string | null>(null);

  const getLidName = useCallback(
    (phone: string): string | null => {
      const digits = phone.replace(/\D/g, '');
      return phoneToName[digits] ?? phoneToName[digits.slice(-9)] ?? null;
    },
    [phoneToName],
  );

  const getOperatorName = useCallback(
    (opLogin: string): string => {
      const found = operators.find((o) => String(o.login) === opLogin);
      if (!found) return opLogin;
      if (found.employee) return `${found.employee.last_name} ${found.employee.first_name}`;
      return found.name || opLogin;
    },
    [operators],
  );

  useEffect(() => {
    const state = location.state as { callNumber?: string } | null;
    if (state?.callNumber) {
      pendingCallRef.current = state.callNumber;
      window.history.replaceState({}, '');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const emptyHistory: HistoryResponse = {
        data: [],
        page: 0,
        limit: 0,
        total: 0,
        totalPages: 0,
      };

      const [json, ops, lidMap] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/history?limit=${limit * 3}`)
          .then((r) => r.json() as Promise<HistoryResponse>)
          .catch(() => emptyHistory),

        API.get('/ip-telefon-operators')
          .then(
            (r) => (Array.isArray(r.data) ? r.data : (r.data?.data ?? [])) as IpTelefonOperator[],
          )
          .catch(() => [] as IpTelefonOperator[]),

        fetchLids({ page: 1, per_page: 1000 })
          .then((list) => {
            const map: Record<string, string> = {};
            list.forEach((lid) => {
              if (!lid.phone) return;
              const digits = lid.phone.replace(/\D/g, '');
              const fish = [lid.last_name, lid.first_name].filter(Boolean).join(' ');
              map[digits] = fish;
              if (digits.length >= 9) map[digits.slice(-9)] = fish;
            });
            return map;
          })
          .catch(() => ({}) as Record<string, string>),
      ]);

      const uniqueData = (json.data || []).filter(
        (v, i, a) =>
          a.findIndex((t) => {
            const tDate = new Date(t.vaqt).getTime();
            const vDate = new Date(v.vaqt).getTime();
            return (
              Math.abs(tDate - vDate) < 10000 && t.raqam === v.raqam && t.operator === v.operator
            );
          }) === i,
      );
      const slicedData = uniqueData.slice(0, limit);
      setRecords(slicedData);
      setTotal(slicedData.length);
      setOperators(ops);
      setPhoneToName(lidMap);
      setLoading(false);
    };

    load();
  }, [limit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (callState === 'ringing') {
        if (!showCallModalRef.current) {
          showCallModalRef.current = true;
          setShowCallModal(true);
        }
      } else if (callState === 'idle') {
        const pending = pendingCallRef.current;
        if (pending) {
          pendingCallRef.current = null;
          setModalInitialNumber(pending);
          showCallModalRef.current = true;
          setShowCallModal(true);
        } else {
          showCallModalRef.current = false;
          setShowCallModal(false);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [callState]);

  const handleCallClick = useCallback(
    (raqam: string) => {
      if (callState !== 'idle') return;
      setModalInitialNumber(raqam);
      showCallModalRef.current = true;
      setShowCallModal(true);
    },
    [callState],
  );

  const handleHangup = useCallback(async () => {
    // FIX: Avval UI ni tozalash, keyin SIP hangup
    showCallModalRef.current = false;
    setShowCallModal(false);
    try {
      await hangup();
    } catch (err) {
      console.error('Hangup error:', err);
    }
  }, [hangup]);

  const handleAnswer = useCallback(async () => {
    try {
      await answer();
    } catch (err) {
      console.error('Answer error:', err);
    }
  }, [answer]);

  // FIX: Modal yopilganda - agar qo'ng'iroq davom etayotgan bo'lsa hangup qilish
  const handleModalClose = useCallback(async () => {
    showCallModalRef.current = false;
    setShowCallModal(false);
    // Agar qo'ng'iroq davom etayotgan bo'lsa - yakunlash
    if (callState !== 'idle') {
      try {
        await hangup();
      } catch (err) {
        console.error('Close hangup error:', err);
      }
    }
  }, [callState, hangup]);

  const branches = useMemo(() => {
    const map = new Map<string, string>();
    operators.forEach((o) => {
      const name = o.branch?.name_uz || o.filial || 'Asosiy';
      map.set(String(o.branch?.id ?? '0'), name);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [operators]);

  const displayed = records.filter((r) => {
    const { client, op, direction } = getCallInfo(r);

    const matchSearch = !search || client.includes(search) || op.includes(search);

    let matchTab = true;
    if (activeFilter === 'missed') matchTab = r.status === 'NO ANSWER';
    else if (activeFilter === 'rejected') matchTab = r.status === 'FAILED';
    else if (activeFilter === 'in') matchTab = direction === 'in';
    else if (activeFilter === 'out') matchTab = direction === 'out';

    const matchDate = (() => {
      if (!dateFrom && !dateTo) return true;
      const recDate = new Date(r.vaqt);
      if (dateFrom && recDate < new Date(dateFrom)) return false;
      if (dateTo && recDate > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    })();

    const matchOperator = !operatorFilter || op === operatorFilter;

    const matchBranch =
      !branchFilter ||
      (() => {
        const found = operators.find((o) => String(o.login) === op);
        return String(found?.branch?.id ?? '0') === branchFilter;
      })();

    return matchSearch && matchTab && matchDate && matchOperator && matchBranch;
  });

  const isCallActive = callState !== 'idle';

  return (
    <>
      {/* FIX: audio element - autoPlay + playsInline + to'g'ri atributlar */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      <div className="ipt-page container">
        <div className="ipt-header">
          <h1 className="ipt-title">
            {t('ipTelephone.pageTitle')}
            <span className="ipt-title-icon">
              <i className="fas fa-phone-volume" />
            </span>
          </h1>

          <div className="ipt-header-right">
            <span className={`ipt-sip-status ${registered ? 'registered' : 'unregistered'}`}>
              <span className="ipt-sip-dot" />
              {registered ? t('ipTelephone.sipConnected') : t('ipTelephone.sipDisconnected')}
            </span>

            <button
              className="ipt-call-btn"
              disabled={isCallActive}
              onClick={() => {
                setModalInitialNumber('');
                showCallModalRef.current = true;
                setShowCallModal(true);
              }}
            >
              {t('ipTelephone.callBtn')}
            </button>
          </div>
        </div>

        <div className="ipt-card">
          <div className="ipt-toolbar">
            <div className="ipt-tabs">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={`ipt-tab${activeFilter === f.key ? ' active' : ''}`}
                  onClick={() => setActiveFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="ipt-toolbar-right">
              <div className="ipt-search-wrap">
                <i className="fas fa-search ipt-search-icon" />
                <input
                  className="ipt-search"
                  placeholder={t('ipTelephone.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="ipt-date-wrap">
                <input
                  type="date"
                  className="ipt-date-input"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  title={t('ipTelephone.dateFrom')}
                />
                <span className="ipt-date-sep">—</span>
                <input
                  type="date"
                  className="ipt-date-input"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  title={t('ipTelephone.dateTo')}
                />
              </div>

              <div className="ipt-filter-wrap" ref={filterWrapRef}>
                <button
                  className={`ipt-filter-btn ${showFilterMenu ? 'active' : ''}`}
                  onClick={() => setShowFilterMenu((v) => !v)}
                >
                  <i className="fas fa-sliders-h" /> {t('ipTelephone.filterBtn')}
                  {(operatorFilter || branchFilter || dateFrom || dateTo) && (
                    <span className="ipt-filter-dot" />
                  )}
                </button>
                {showFilterMenu && (
                  <div className="ipt-filter-menu">
                    <div className="ipt-filter-field">
                      <label>{t('ipTelephone.filterOperator')}</label>
                      <select
                        value={operatorFilter}
                        onChange={(e) => setOperatorFilter(e.target.value)}
                      >
                        <option value="">{t('ipTelephone.allOperators')}</option>
                        {operators.map((o) => (
                          <option key={o.id} value={String(o.login)}>
                            {o.employee
                              ? `${o.employee.last_name} ${o.employee.first_name}`
                              : o.name || String(o.login)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="ipt-filter-field">
                      <label>{t('ipTelephone.filterBranch')}</label>
                      <select
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value)}
                      >
                        <option value="">{t('ipTelephone.allOperators')}</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="ipt-filter-clear"
                      onClick={() => {
                        setOperatorFilter('');
                        setBranchFilter('');
                        setDateFrom('');
                        setDateTo('');
                      }}
                    >
                      {t('ipTelephone.filterClear')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <table className="ipt-table">
            <thead>
              <tr>
                <th>{t('ipTelephone.thStatus')}</th>
                <th>{t('ipTelephone.thClient')}</th>
                <th>{t('ipTelephone.thBranch')}</th>
                <th>{t('ipTelephone.thOperator')}</th>
                <th>{t('ipTelephone.thDateTime')}</th>
                <th>{t('ipTelephone.thActions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="ipt-loading-cell">
                    <i className="fas fa-spinner fa-spin" /> {t('ipTelephone.loading')}
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ipt-empty-cell">
                    {t('ipTelephone.noData')}
                  </td>
                </tr>
              ) : (
                displayed.map((rec, idx) => {
                  const { client, op } = getCallInfo(rec);
                  const { cls } = statusLabel(rec.status);
                  const hasRecording = !!rec.recordingfile && rec.status === 'ANSWERED';
                  const isCalling = isCallActive && callTarget === `+${client}`;

                  return (
                    <tr key={idx} className={isCalling ? 'ipt-row-active' : ''}>
                      <td>
                        <div className={`ipt-status-wrap ${cls}`}>{statusIcon(rec.status)}</div>
                      </td>

                      <td className="ipt-phone-cell">
                        {getLidName(client) ? (
                          <span>
                            <span style={{ fontWeight: 600, color: '#003366' }}>
                              {getLidName(client)}
                            </span>
                            <br />
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{client}</span>
                          </span>
                        ) : (
                          client
                        )}
                      </td>

                      <td>{t('ipTelephone.branchDefault')}</td>

                      <td className="ipt-operator-cell">{getOperatorName(op)}</td>

                      <td className="ipt-date-cell">{formatDateTime(rec.vaqt)}</td>

                      <td>
                        <div className="ipt-actions-cell">
                          <button
                            className={`ipt-row-call-btn${isCalling ? ' calling' : ''}`}
                            title={
                              isCalling ? t('ipTelephone.callActive') : t('ipTelephone.callAction')
                            }
                            disabled={isCallActive && !isCalling}
                            onClick={() => handleCallClick(client)}
                          >
                            <i className={`fas ${isCalling ? 'fa-phone-volume' : 'fa-phone'}`} />
                          </button>

                          {hasRecording ? (
                            <AudioPlayer filename={rec.recordingfile} />
                          ) : (
                            <span className="ipt-no-record" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="ipt-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span className="ipt-total-info">
                {t('ipTelephone.totalCalls', { count: total })}
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#666',
                }}
              >
                <span>{t('ipTelephone.rowsLabel')}</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    outline: 'none',
                    cursor: 'pointer',
                    background: '#fff',
                    color: '#333',
                    fontSize: '14px',
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {showCallModal && (
          <CallModal
            initialNumber={modalInitialNumber || callTarget || ''}
            onClose={handleModalClose}
            onCall={(num) => {
              setModalInitialNumber(num);
              makeCall(num);
            }}
            onHangup={handleHangup}
            onAnswer={handleAnswer}
            onMute={mute}
            onHold={hold}
            onSendDtmf={sendDtmf}
            onBlindTransfer={blindTransfer}
            onAttendedTransfer={attendedTransfer}
            callState={callState}
            elapsed={elapsed}
            operators={operators}
          />
        )}
      </div>
    </>
  );
};

const IPTelephoneWrapper: React.FC = () => {
  const user = useAuthStore((s) => s.user);

  if (!isAllowedUser(user)) {
    return <Navigate to="/" replace />;
  }

  return <IPTelephone />;
};

export default IPTelephoneWrapper;
