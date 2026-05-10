"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getApiDomain } from "@/utils/domain";
import { ApiService } from "@/api/apiService";
import { DrawingJoinResponse, DrawingStroke } from "@/types/group";
import { Button, Spin } from "antd";
import styles from "@/styles/page.module.css";

type DrawingStateEvent = {
  type: "drawing";
  event: "state";
  sessionId: string;
  drawingState: { strokes: DrawingStroke[] };
};

type DrawingStrokeEvent = {
  type: "drawing";
  event: "stroke";
  sessionId: string;
  stroke: DrawingStroke;
};

function drawAllStrokes(canvas: HTMLCanvasElement, strokes: DrawingStroke[]): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;

    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (stroke.points.length === 1) {
      ctx.arc(stroke.points[0][0], stroke.points[0][1], stroke.width / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
    } else {
      ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
      }
      ctx.stroke();
    }
  }
}

export default function CanvasPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = params.groupId as string;
  const sessionId = searchParams.get("sessionId");

  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [joining, setJoining] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef(sessionId);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);


  useEffect(() => {
    if (!canvasRef.current) return;
    drawAllStrokes(canvasRef.current, strokes);
  }, [strokes]);


  useEffect(() => {
    let isMounted = true;
    const api = new ApiService();
    api.get<DrawingJoinResponse>(`/groups/${groupId}/drawing/join`)
      .then(res => {
        if (!isMounted) return;
        setStrokes(res.drawingState?.strokes ?? []);
        setJoining(false);
        if (res.sessionId !== sessionIdRef.current) {
          router.replace(`/groups/${groupId}/canvas?sessionId=${encodeURIComponent(res.sessionId)}`);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        router.replace(`/groups/${groupId}`);
      });
    return () => { isMounted = false; };
  }, [groupId, router]);

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
        if (typeof data !== "object" || data === null) return;

        const d = data as Record<string, unknown>;

        if (d.type === "drawing" && d.event === "state" && d.sessionId === sessionId) {
          const ev = data as DrawingStateEvent;
          setStrokes(ev.drawingState?.strokes ?? []);
          return;
        }

        if (d.type === "session" && d.event === "closed") {
          router.push(`/groups/${groupId}`);
          return;
        }

        if (d.type === "drawing" && d.event === "stroke" && d.sessionId === sessionId) {
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
  }, [sessionId, groupId, router]);

  if (joining) {
    return (
      <main className={styles.page}>
        <div className={styles.content}>
          <div className={styles.loadingWrap}>
            <Spin size="large" />
          </div>
        </div>
      </main>
    );
  }

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
          <div className={`${styles.shellCard} ${styles.softCard}`} style={{ padding: "24px" }}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 16 }}>Group Canvas</h2>
            <div className={styles.canvasWrap}>
              <canvas
                ref={canvasRef}
                width={512}
                height={512}
                className={styles.drawingCanvas}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
