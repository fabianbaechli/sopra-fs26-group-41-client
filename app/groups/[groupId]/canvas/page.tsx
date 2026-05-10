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

type StrokeStartedEvent = {
  type: "stroke";
  event: "started";
  sessionId: string;
  stroke: {
    strokeId: string;
    userId: number;
    color: string;
    width: number;
    point: [number, number];
  };
};

type StrokeAppendedEvent = {
  type: "stroke";
  event: "appended";
  sessionId: string;
  strokeId: string;
  points: [number, number][];
};

const PALETTE = ["#1a1a1a", "#e24531", "#4a90d9", "#2f7a32", "#f5c518", "#9b59b6", "#ffffff"];
const SIZES = [2, 6, 14, 24];

function getCanvasCoords(canvas: HTMLCanvasElement, e: React.PointerEvent): [number, number] {
  const r = canvas.getBoundingClientRect();
  return [
    (e.clientX - r.left) * (canvas.width / r.width),
    (e.clientY - r.top) * (canvas.height / r.height),
  ];
}

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
  const [color, setColor] = useState("#1a1a1a");
  const [brushSize, setBrushSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef(sessionId);
  const isDrawingRef = useRef(false);
  const currentStrokeIdRef = useRef("");
  const pendingPointsRef = useRef<[number, number][]>([]);

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
          const wsBase = getApiDomain().replace(/^http:\/\//, "ws://").replace(/^https:\/\//, "wss://");
          const newSocket = new WebSocket(`${wsBase}/ws?token=${t}`);
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

        if (d.type === "stroke" && d.event === "started" && d.sessionId === sessionId) {
          const ev = data as StrokeStartedEvent;
          setStrokes(prev => [...prev, {
            strokeId: ev.stroke.strokeId,
            userId: ev.stroke.userId,
            color: ev.stroke.color,
            width: ev.stroke.width,
            points: [ev.stroke.point],
          }]);
          return;
        }

        if (d.type === "stroke" && d.event === "appended" && d.sessionId === sessionId) {
          const ev = data as StrokeAppendedEvent;
          setStrokes(prev => prev.map(s =>
            s.strokeId === ev.strokeId
              ? { ...s, points: [...s.points, ...ev.points] }
              : s
          ));
          return;
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

  // Flush accumulated points to the server every 50 ms while drawing
  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(() => {
      if (!isDrawingRef.current || pendingPointsRef.current.length === 0) return;
      const pts = pendingPointsRef.current.splice(0);
      socketRef.current?.send(JSON.stringify({
        type: "stroke", event: "append",
        sessionId, strokeId: currentStrokeIdRef.current, points: pts,
      }));
    }, 50);
    return () => clearInterval(id);
  }, [sessionId]);

  const drawColor = isEraser ? "#ffffff" : color;

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !sessionId) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const strokeId = crypto.randomUUID();
    const point = getCanvasCoords(canvasRef.current, e);

    isDrawingRef.current = true;
    currentStrokeIdRef.current = strokeId;
    pendingPointsRef.current = [];

    setStrokes(prev => [...prev, {
      strokeId, userId: -1, color: drawColor, width: brushSize, points: [point],
    }]);

    socketRef.current?.send(JSON.stringify({
      type: "stroke", event: "start",
      sessionId, strokeId, color: drawColor, width: brushSize, point,
    }));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const point = getCanvasCoords(canvasRef.current, e);
    pendingPointsRef.current.push(point);
    setStrokes(prev => prev.map(s =>
      s.strokeId === currentStrokeIdRef.current
        ? { ...s, points: [...s.points, point] }
        : s
    ));
  };

  const finishStroke = () => {
    if (!isDrawingRef.current || !sessionId) return;
    isDrawingRef.current = false;
    const strokeId = currentStrokeIdRef.current;
    const pending = pendingPointsRef.current.splice(0);
    if (pending.length > 0) {
      socketRef.current?.send(JSON.stringify({
        type: "stroke", event: "append", sessionId, strokeId, points: pending,
      }));
    }
    socketRef.current?.send(JSON.stringify({
      type: "stroke", event: "end", sessionId, strokeId,
    }));
  };

  const handleSave = () => {
    if (!canvasRef.current || !sessionId || isSaving) return;
    setIsSaving(true);
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) { setIsSaving(false); return; }
      const form = new FormData();
      form.append("sessionId", sessionId);
      form.append("image", blob, "canvas.png");
      try {
        const api = new ApiService();
        await api.upload<{ image: string }>(`/groups/${groupId}/drawing/save`, form);
        // backend broadcasts session:closed → onmessage redirects everyone
      } catch {
        setIsSaving(false);
      }
    }, "image/png");
  };

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

            {/* Toolbar */}
            <div className={styles.canvasToolbar}>
              <div className={styles.canvasPalette}>
                {PALETTE.map(c => (
                  <button
                    key={c}
                    onClick={() => { setColor(c); setIsEraser(false); }}
                    className={styles.colorSwatch}
                    style={{
                      backgroundColor: c,
                      border: !isEraser && color === c
                        ? "2px solid #fff4eb"
                        : "2px solid rgba(255,244,235,0.2)",
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={e => { setColor(e.target.value); setIsEraser(false); }}
                  className={styles.colorPickerInput}
                  title="Custom colour"
                />
              </div>

              <div className={styles.canvasSizes}>
                {SIZES.map(s => (
                  <button
                    key={s}
                    onClick={() => setBrushSize(s)}
                    className={styles.sizeButton}
                    style={{
                      border: brushSize === s
                        ? "2px solid #fff4eb"
                        : "2px solid rgba(255,244,235,0.2)",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        width: s,
                        height: s,
                        borderRadius: "50%",
                        background: "#fff4eb",
                      }}
                    />
                  </button>
                ))}
              </div>

              <Button
                className={styles.authButton}
                onClick={() => setIsEraser(v => !v)}
                style={isEraser ? { background: "#fff4eb", color: "#1a1a1a" } : undefined}
              >
                Eraser
              </Button>

              <Button
                className={styles.authButton}
                onClick={handleSave}
                loading={isSaving}
                style={{ marginLeft: "auto" }}
              >
                Save
              </Button>
            </div>

            <div className={styles.canvasWrap}>
              <canvas
                ref={canvasRef}
                width={512}
                height={512}
                className={styles.drawingCanvas}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishStroke}
                onPointerLeave={finishStroke}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
