import { useEffect, useRef, useState, useCallback } from "react";
import { SimpleUser, type SimpleUserOptions } from "sip.js/lib/platform/web";
import { Invitation } from "sip.js";

const SIP_SERVER =
  import.meta.env.VITE_SIP_SERVER || "wss://mainoffice.uz:8089/ws";
const SIP_AOR = import.meta.env.VITE_SIP_AOR || "sip:1001@mainoffice.uz";
const SIP_PASS =
  import.meta.env.VITE_SIP_PASS || "d4e9b220f53624228396c969b637280b";
const SIP_DOMAIN = import.meta.env.VITE_SIP_DOMAIN || "mainoffice.uz";

export type CallState =
  | "idle"
  | "connecting"
  | "ringing"
  | "active"
  | "ended"
  | "error";

export interface UseSipReturn {
  callState: CallState;
  callTarget: string | null;
  registered: boolean;
  makeCall: (phoneNumber: string) => Promise<void>;
  hangup: () => Promise<void>;
  answer: () => Promise<void>;
  mute: (muted: boolean) => void;
  hold: (held: boolean) => Promise<void>;
  sendDtmf: (tone: string) => void;
  blindTransfer: (ext: string) => Promise<void>;
  attendedTransfer: (ext: string) => Promise<void>;
  elapsed: number;
}

const sdpSanitizer = (sdp: string): string => {
  const lines = sdp.split("\n");
  const filtered = lines
    .map((line) => {
      const cleanLine = line.trim();
      if (/a=fingerprint:/i.test(cleanLine)) {
        const parts = cleanLine.split(/\s+/);
        if (parts.length < 2 || parts[1].length < 10) return null;
        return `${parts[0]} ${parts[1]}`;
      }
      return line;
    })
    .filter((line): line is string => line !== null);
  return filtered.join("\n") + "\n";
};

export function useSip(
  remoteAudioRef: React.RefObject<HTMLAudioElement>,
): UseSipReturn {
  const suRef = useRef<SimpleUser | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [callTarget, setCallTarget] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStateRef = useRef<CallState>("idle");

  const updateCallState = useCallback((state: CallState) => {
    callStateRef.current = state;
    setCallState(state);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsed(0);
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => setElapsed((v) => v + 1), 1000);
  }, [stopTimer]);

  useEffect(() => {
    if (!remoteAudioRef.current || suRef.current) return;

    const options: SimpleUserOptions = {
      aor: SIP_AOR,
      userAgentOptions: {
        authorizationPassword: SIP_PASS,
        authorizationUsername: SIP_AOR.split(":")[1]?.split("@")[0],
        transportOptions: {
          server: SIP_SERVER,
          reconnectionAttempts: 10,
          reconnectionDelay: 5,
        },
        sessionDescriptionHandlerFactoryOptions: {
          iceGatheringTimeout: 3000,
          peerConnectionConfiguration: {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
            rtcpMuxPolicy: "require",
            bundlePolicy: "max-bundle",
          },
        },
      } as any,
      media: { remote: { audio: remoteAudioRef.current } },
      delegate: {
        onRegistered: () => setRegistered(true),
        onUnregistered: () => setRegistered(false),
        onCallReceived: () => {
          updateCallState("ringing");
          const session = (suRef.current as any)?.session;
          if (session?.remoteIdentity?.uri?.user) {
            setCallTarget(session.remoteIdentity.uri.user);
          }
        },
        onCallAnswered: () => {
          updateCallState("active");
          startTimer();
          remoteAudioRef.current
            ?.play()
            .catch(() => console.error("Audio play blocked"));
        },
        onCallHangup: () => {
          updateCallState("idle");
          setCallTarget(null);
          stopTimer();
        },
      },
    };

    const su = new SimpleUser(SIP_SERVER, options);
    suRef.current = su;
    su.connect()
      .then(() => su.register())
      .catch((err) => console.error("SIP Connect Error:", err));

    return () => {
      su.disconnect();
      suRef.current = null;
    };
  }, [remoteAudioRef, startTimer, stopTimer, updateCallState]);

  const makeCall = useCallback(
    async (phoneNumber: string) => {
      const su = suRef.current;
      if (!su) return;
      const cleanDigits = phoneNumber.replace(/[^\d+]/g, "").replace(/^\+/, "");
      const target = `sip:${cleanDigits}@${SIP_DOMAIN}`;
      setCallTarget(phoneNumber);
      updateCallState("connecting");
      try {
        await su.call(target, {
          sessionDescriptionHandlerOptions: {
            constraints: { audio: true, video: false },
            sdpTransform: sdpSanitizer,
          } as any,
        });
      } catch (err) {
        console.error("Call Error:", err);
        updateCallState("error");
        setTimeout(() => updateCallState("idle"), 2000);
      }
    },
    [updateCallState],
  );

  const answer = useCallback(async () => {
    const su = suRef.current;
    if (!su) return;
    try {
      await su.answer({
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: false },
          sdpTransform: sdpSanitizer,
        } as any,
      });
    } catch (err) {
      console.warn("SimpleUser answer failed, trying session accept:", err);
      const session = (su as any).session as Invitation;
      if (session) await session.accept();
    }
  }, []);

  const hangup = useCallback(async () => {
    const su = suRef.current;
    if (!su) return;
    try {
      const session = (su as any).session;
      if (callStateRef.current === "ringing" && session) {
        await (session as Invitation).reject();
      } else {
        await su.hangup();
      }
    } catch (err) {
      console.error("Hangup Error:", err);
    } finally {
      updateCallState("idle");
      setCallTarget(null);
      stopTimer();
    }
  }, [updateCallState, stopTimer]);

  const mute = useCallback(
    (m: boolean) => (m ? suRef.current?.mute() : suRef.current?.unmute()),
    [],
  );
  const hold = useCallback(
    async (h: boolean) => (h ? suRef.current?.hold() : suRef.current?.unhold()),
    [],
  );
  const sendDtmf = useCallback((t: string) => suRef.current?.sendDTMF(t), []);

  const blindTransfer = useCallback(async (ext: string) => {
    const session = (suRef.current as any).session;
    if (session) await session.refer(`sip:${ext}@${SIP_DOMAIN}`);
  }, []);

  return {
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
    attendedTransfer: blindTransfer,
    elapsed,
  };
}
