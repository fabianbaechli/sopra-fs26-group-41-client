"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getApiDomain } from "@/utils/domain";
import styles from "@/styles/page.module.css";

type Notif = {
  id: number;
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
};

type PollStartedEvent    = { type: "poll";    event: "started";  message?: string; url?: string; };
type PollFinishedEvent   = { type: "poll";    event: "finished"; pollId?: number; groupId?: number; pollResultsUrl?: string; };
type DrawingStartedEvent = { type: "drawing"; event: "started";  groupId?: number; sessionId?: string; };

function getWsDomain(): string {
  return getApiDomain().replace(/^http/, "ws");
}

function shouldSuppress(type: string, event: string): boolean {
  try {
    const raw = localStorage.getItem("suppressNotif");
    if (!raw) return false;
    const s = JSON.parse(raw) as { type: string; event: string; ts: number };
    if (s.type === type && s.event === event && Date.now() - s.ts < 5000) {
      localStorage.removeItem("suppressNotif");
      return true;
    }
  } catch { }
  return false;
}

export default function PollNotificationListener() {
  const router = useRouter();
  const pathname = usePathname();

  const [notifs, setNotifs] = useState<Notif[]>([]);
  const nextId = useRef(0);
  const notifTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const routerRef = useRef(router);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addNotifRef = useRef<(n: Omit<Notif, "id">) => void>(() => { });

  useEffect(() => { routerRef.current = router; }, [router]);

  const addNotif = useCallback((n: Omit<Notif, "id">) => {
    const id = ++nextId.current;
    setNotifs(prev => [...prev, { ...n, id }]);
    const timer = setTimeout(() => {
      notifTimers.current.delete(id);
      setNotifs(prev => prev.filter(x => x.id !== id));
    }, 120000);
    notifTimers.current.set(id, timer);
  }, []);

  useEffect(() => { addNotifRef.current = addNotif; }, [addNotif]);

  const dismiss = (id: number) => {
    const timer = notifTimers.current.get(id);
    if (timer) clearTimeout(timer);
    notifTimers.current.delete(id);
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const connectSocket = useCallback(() => {
    if (typeof window === "undefined") return;

    const existing = socketRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = new WebSocket(`${getWsDomain()}/ws?token=${encodeURIComponent(token)}`);
    socketRef.current = socket;

    socket.onerror = () => { };

    socket.onmessage = (messageEvent) => {
      try {
        if (typeof messageEvent.data !== "string") return;
        const data = JSON.parse(messageEvent.data) as unknown;
        if (typeof data !== "object" || data === null) return;

        const d = data as Record<string, unknown>;

        if (d.type === "poll" && d.event === "started") {
          if (shouldSuppress("poll", "started")) return;
          const pollData = data as PollStartedEvent;
          const url = typeof pollData.url === "string" ? pollData.url.trim() : "";
          addNotifRef.current({
            title: "Poll started",
            body: pollData.message ?? "A new poll has started for your group.",
            actionLabel: url ? "Join Poll" : undefined,
            actionUrl: url || undefined,
          });
        }

        if (d.type === "poll" && d.event === "finished") {
          if (shouldSuppress("poll", "finished")) return;
          const pollData = data as PollFinishedEvent;
          let redirectUrl: string | null = null;
          if (typeof pollData.pollResultsUrl === "string" && pollData.pollResultsUrl.trim()) {
            redirectUrl = pollData.pollResultsUrl.trim();
          } else if (typeof pollData.groupId === "number") {
            redirectUrl = `/groups/${pollData.groupId}`;
          }
          if (!redirectUrl) return;
          addNotifRef.current({
            title: "Poll finished",
            body: "The group poll has finished. See what your group picked.",
            actionLabel: "View Results",
            actionUrl: redirectUrl,
          });
        }

        if (d.type === "drawing" && d.event === "started") {
          if (shouldSuppress("drawing", "started")) return;
          const drawingData = data as DrawingStartedEvent;
          const groupId = drawingData.groupId ?? null;
          const sessionId = drawingData.sessionId ?? null;
          const canvasUrl = groupId
            ? sessionId
              ? `/groups/${groupId}/canvas?sessionId=${encodeURIComponent(sessionId)}`
              : `/groups/${groupId}/canvas`
            : null;
          addNotifRef.current({
            title: "Drawing session started",
            body: "A drawing session has started for your group.",
            actionLabel: canvasUrl ? "Open Canvas" : undefined,
            actionUrl: canvasUrl ?? undefined,
          });
        }
      } catch { }
    };

    socket.onclose = (e) => {
      socketRef.current = null;
      if (e.code !== 1000) {
        reconnectTimerRef.current = setTimeout(connectSocket, 3000);
      }
    };
  }, []);

  useEffect(() => {
    connectSocket();
    return () => {
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      socketRef.current?.close(1000);
      socketRef.current = null;
    };
  }, [connectSocket]);

  useEffect(() => { connectSocket(); }, [pathname, connectSocket]);

  if (notifs.length === 0) return null;

  return (
    <div className={styles.notifStack}>
      {notifs.map(n => (
        <div key={n.id} className={styles.notifCard}>
          <div className={styles.notifHeader}>
            <span className={styles.notifTitle}>{n.title}</span>
            <button className={styles.notifClose} onClick={() => dismiss(n.id)}>×</button>
          </div>
          <p className={styles.notifBody}>{n.body}</p>
          {n.actionLabel && n.actionUrl && (
            <div className={styles.notifActions}>
              <button
                className={styles.notifActionBtn}
                onClick={() => { dismiss(n.id); window.location.href = n.actionUrl!; }}
              >
                {n.actionLabel}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
