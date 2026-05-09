"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getApiDomain } from "@/utils/domain";
import { ApiService } from "@/api/apiService";
import { DrawingJoinResponse } from "@/types/group";
import { Button } from "antd";
import styles from "@/styles/page.module.css";

type DrawingStroke = {
  strokeId: string;
  userId: number;
  color: string;
  width: number;
  points: number[][];
};

type DrawingStrokeEvent = {
  type: "drawing";
  event: "stroke";
  sessionId: string;
  stroke: DrawingStroke;
};

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = params.groupId as string;
  const sessionId = searchParams.get("sessionId");

  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendStroke = (stroke: DrawingStroke) => {
    if (!sessionId) return;
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    socketRef.current.send(
      JSON.stringify({
        type: "drawing",
        event: "stroke",
        sessionId,
        stroke,
      })
    );
  };

  useEffect(() => {
    if (sessionId) return;
    const api = new ApiService();
    api.get<DrawingJoinResponse>(`/groups/${groupId}/drawing/join`)
      .then(res => router.replace(`/groups/${groupId}/canvas?sessionId=${encodeURIComponent(res.sessionId)}`))
      .catch(() => router.replace(`/groups/${groupId}`));
  }, [groupId, sessionId, router]);

  useEffect(() => {
    if (!sessionId) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const wsBaseUrl = getApiDomain()
      .replace(/^http:\/\//, "ws://")
      .replace(/^https:\/\//, "wss://");

    const socket = new WebSocket(`${wsBaseUrl}/ws?token=${token}`);
    socketRef.current = socket;

    socket.onclose = (e) => {
      socketRef.current = null;
      if (e.code !== 1000) {
        reconnectTimerRef.current = setTimeout(() => {
          const t = localStorage.getItem("token");
          if (!t) return;
          const wsBaseUrl = getApiDomain()
            .replace(/^http:\/\//, "ws://")
            .replace(/^https:\/\//, "wss://");
          const newSocket = new WebSocket(`${wsBaseUrl}/ws?token=${t}`);
          socketRef.current = newSocket;
          newSocket.onmessage = socket.onmessage;
          newSocket.onclose = socket.onclose;
        }, 3000);
      }
    };

    socket.onmessage = (event) => {
      try {
        const data: unknown = JSON.parse(event.data);

        if (
          typeof data === "object" &&
          data !== null &&
          (data as DrawingStrokeEvent).type === "drawing" &&
          (data as DrawingStrokeEvent).event === "stroke" &&
          (data as DrawingStrokeEvent).sessionId === sessionId
        ) {
          const strokeEvent = data as DrawingStrokeEvent;

          setStrokes((prev) => [...prev, strokeEvent.stroke]);
        }
      } catch { }
    };

    return () => {
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      socketRef.current?.close(1000);
      socketRef.current = null;
    };
  }, [sessionId]);

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.brandRow}>
              <img src="/logo.png" alt="logo" className={styles.logo} />
              <h1 className={styles.brand}>Movieblendr.</h1>
            </div>
          </div>
          <div className={styles.heroRight}>
            <Button className={styles.authButton} onClick={() => router.push(`/groups/${groupId}`)}>
              Back to Group
            </Button>
          </div>
        </div>

        <div className={styles.section}>
          <div className={`${styles.shellCard} ${styles.softCard}`} style={{ padding: "48px", textAlign: "center" }}>
            <h2 className={styles.sectionTitle}>Drawing Canvas</h2>
            <p className={styles.helperText} style={{ marginTop: 12 }}>
              Live strokes: {strokes.length}
            </p>
            {sessionId && (
              <p className={styles.helperText} style={{ marginTop: 8, fontSize: 12 }}>
                Session: {sessionId}
              </p>
            )}
            <div style={{ marginTop: 24, textAlign: "left" }}>
              {strokes.map((stroke) => (
                <div key={stroke.strokeId} style={{ marginBottom: 8 }}>
                  <span className={styles.helperText}>
                    User {stroke.userId} drew {stroke.points.length} points
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
