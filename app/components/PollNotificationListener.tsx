"use client";

import React, { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { App, Button } from "antd";
import { getApiDomain } from "@/utils/domain";

type PollStartedEvent = {
  type: "poll";
  event: "started";
  message?: string;
  url?: string;
};

type PollFinishedEvent = {
  type: "poll";
  event: "finished";
  pollId?: number;
  groupId?: number;
  pollResultsUrl?: string;
};

type DrawingStartedEvent = {
  type: "drawing";
  event: "started";
  groupId?: number;
};

function getWsDomain(): string {
  return getApiDomain().replace(/^http/, "ws");
}

export default function PollNotificationListener() {
  const router = useRouter();
  const pathname = usePathname();
  const { notification } = App.useApp();

  const routerRef = useRef(router);
  const notificationRef = useRef(notification);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    notificationRef.current = notification;
  }, [notification]);

  const connectSocket = React.useCallback(() => {
    if (typeof window === "undefined") return;

    const existing = socketRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      console.log("[PollNotificationListener] socket already open/connecting, skipping");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      console.log("[PollNotificationListener] no token, skipping connect");
      return;
    }

    const wsUrl = `${getWsDomain()}/ws?token=${encodeURIComponent(token)}`;
    console.log("[PollNotificationListener] connecting to", wsUrl.replace(/token=.*/, "token=***"));
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("[PollNotificationListener] WebSocket connected");
    };

    socket.onerror = (e) => {
      console.error("[PollNotificationListener] WebSocket error", e);
    };

    socket.onmessage = (messageEvent) => {
      console.log("[PollNotificationListener] message received:", messageEvent.data);
      try {
        if (typeof messageEvent.data !== "string") return;

        const data = JSON.parse(messageEvent.data) as unknown;
        if (typeof data !== "object" || data === null) return;

        const api = notificationRef.current;
        const nav = routerRef.current;

        if (
          (data as PollStartedEvent).type === "poll" &&
          (data as PollStartedEvent).event === "started"
        ) {
          const pollData = data as PollStartedEvent;
          const url = typeof pollData.url === "string" ? pollData.url.trim() : "";
          console.log("[PollNotificationListener] firing poll:started notification, url:", url);
          api.info({
            title: "Poll started",
            description: pollData.message ?? "A new poll has started for your group.",
            duration: 0,
            btn: url ? (
              <Button
                type="primary"
                size="small"
                onClick={() => {
                  api.destroy();
                  nav.push(url);
                }}
              >
                Join Poll
              </Button>
            ) : undefined,
          });
        }

        if (
          (data as PollFinishedEvent).type === "poll" &&
          (data as PollFinishedEvent).event === "finished"
        ) {
          const pollData = data as PollFinishedEvent;

          let redirectUrl: string | null = null;

          if (
            typeof pollData.pollResultsUrl === "string" &&
            pollData.pollResultsUrl.trim()
          ) {
            redirectUrl = pollData.pollResultsUrl.trim();
          } else if (typeof pollData.groupId === "number") {
            redirectUrl = `/groups/${pollData.groupId}`;
          }

          if (!redirectUrl) return;

          const finalUrl = redirectUrl;
          api.info({
            title: "Poll finished",
            description: "The group poll has finished. See what your group picked.",
            duration: 0,
            btn: (
              <Button
                type="primary"
                size="small"
                onClick={() => {
                  api.destroy();
                  nav.push(finalUrl);
                }}
              >
                View Results
              </Button>
            ),
          });
        }

        if (
          (data as DrawingStartedEvent).type === "drawing" &&
          (data as DrawingStartedEvent).event === "started"
        ) {
          const drawingData = data as DrawingStartedEvent;

          if (!drawingData.groupId) return;

          api.info({
            title: "Drawing started",
            description: "A drawing session has started for your group.",
            duration: 0,
            btn: (
              <Button
                type="primary"
                size="small"
                onClick={() => {
                  api.destroy();
                  nav.push(`/groups/${drawingData.groupId}/canvas`);
                }}
              >
                Open Canvas
              </Button>
            ),
          });
        }
      } catch (err) {
        console.error("[PollNotificationListener] error handling message", err);
      }
    };

    socket.onclose = (e) => {
      console.log("[PollNotificationListener] WebSocket closed", e.code, e.reason);
      socketRef.current = null;
    };
  }, []);

  // Open socket on mount, close only on unmount
  useEffect(() => {
    connectSocket();
    return () => {
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [connectSocket]);

  // On navigation, reconnect only if socket is gone (handles post-login transition)
  useEffect(() => {
    connectSocket();
  }, [pathname, connectSocket]);

  return null;
}