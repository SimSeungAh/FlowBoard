import type { WhiteboardStrokeResponse } from "@/api/whiteboard";

export type WhiteboardConnectionState = "connecting" | "connected" | "disconnected";

export type WhiteboardEventType = "STROKE_CREATED" | "STROKE_DELETED" | "CLEARED";

export interface WhiteboardWebSocketEvent {
  type: WhiteboardEventType;
  boardId: number;
  whiteboardId: number | null;
  strokeId: number | null;
  stroke: WhiteboardStrokeResponse | null;
  occurredAt: string;
}

interface ConnectWhiteboardWebSocketOptions {
  boardId: number;
  whiteboardId?: number | null;
  onEvent: (event: WhiteboardWebSocketEvent) => void;
  onConnectionStateChange?: (state: WhiteboardConnectionState) => void;
  onError?: (error: Error) => void;
}

interface ParsedStompFrame {
  command: string;
  headers: Record<string, string>;
  body: string;
}

const RECONNECT_DELAY = 3000;

const buildWebSocketUrl = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error("VITE_API_BASE_URL이 설정되어 있지 않습니다.");
  }

  const url = new URL(apiBaseUrl, window.location.origin);

  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

  const pathname = url.pathname.replace(/\/+$/, "").replace(/\/api$/, "");

  url.pathname = `${pathname}/ws`.replace(/\/{2,}/g, "/");

  url.search = "";
  url.hash = "";

  return url.toString();
};

const createStompFrame = (command: string, headers: Record<string, string> = {}, body = "") => {
  const headerLines = Object.entries(headers).map(([key, value]) => `${key}:${value}`);

  return [command, ...headerLines, "", body].join("\n") + "\u0000";
};

const parseStompFrame = (rawFrame: string): ParsedStompFrame | null => {
  const frame = rawFrame.replace(/^\n+/, "");

  if (!frame.trim()) {
    return null;
  }

  const headerEndIndex = frame.indexOf("\n\n");

  if (headerEndIndex < 0) {
    return null;
  }

  const headerSection = frame.slice(0, headerEndIndex);
  const body = frame.slice(headerEndIndex + 2);
  const lines = headerSection.split("\n");
  const command = lines.shift()?.trim();

  if (!command) {
    return null;
  }

  const headers: Record<string, string> = {};

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 1);

    headers[key] = value;
  }

  return {
    command,
    headers,
    body,
  };
};

export const connectWhiteboardWebSocket = ({
  boardId,
  whiteboardId = null,
  onEvent,
  onConnectionStateChange,
  onError,
}: ConnectWhiteboardWebSocketOptions) => {
  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let manuallyClosed = false;
  let messageBuffer = "";

  const subscriptionId =
    whiteboardId === null ? `whiteboard-${boardId}` : `whiteboard-${boardId}-${whiteboardId}`;

  const destination =
    whiteboardId === null
      ? `/topic/boards/${boardId}/whiteboard`
      : `/topic/boards/${boardId}/whiteboards/${whiteboardId}`;

  const changeConnectionState = (state: WhiteboardConnectionState) => {
    onConnectionStateChange?.(state);
  };

  const reportError = (error: Error) => {
    onError?.(error);
  };

  const clearReconnectTimer = () => {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (manuallyClosed) {
      return;
    }

    clearReconnectTimer();

    reconnectTimer = window.setTimeout(() => {
      connect();
    }, RECONNECT_DELAY);
  };

  const subscribe = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(
      createStompFrame("SUBSCRIBE", {
        id: subscriptionId,
        destination,
        ack: "auto",
      }),
    );
  };

  const handleMessageFrame = (frame: ParsedStompFrame) => {
    try {
      const event = JSON.parse(frame.body) as WhiteboardWebSocketEvent;

      if (event.boardId !== boardId) {
        return;
      }

      if (whiteboardId !== null && event.whiteboardId !== whiteboardId) {
        return;
      }

      onEvent(event);
    } catch {
      reportError(new Error("화이트보드 실시간 데이터를 해석하지 못했습니다."));
    }
  };

  const handleStompFrame = (rawFrame: string) => {
    const frame = parseStompFrame(rawFrame);

    if (!frame) {
      return;
    }

    switch (frame.command) {
      case "CONNECTED":
        changeConnectionState("connected");
        subscribe();
        break;

      case "MESSAGE":
        handleMessageFrame(frame);
        break;

      case "ERROR":
        changeConnectionState("disconnected");
        reportError(new Error(frame.body || "WebSocket 서버에서 오류가 발생했습니다."));
        break;

      default:
        break;
    }
  };

  const handleSocketMessage = (event: MessageEvent<string>) => {
    if (event.data === "\n" || event.data === "\r\n") {
      return;
    }

    messageBuffer += event.data;

    let frameEndIndex = messageBuffer.indexOf("\u0000");

    while (frameEndIndex >= 0) {
      const rawFrame = messageBuffer.slice(0, frameEndIndex);

      messageBuffer = messageBuffer.slice(frameEndIndex + 1);

      handleStompFrame(rawFrame);

      frameEndIndex = messageBuffer.indexOf("\u0000");
    }
  };

  const connect = () => {
    if (manuallyClosed) {
      return;
    }

    clearReconnectTimer();

    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
      changeConnectionState("disconnected");
      reportError(new Error("WebSocket 인증 토큰이 없습니다."));
      return;
    }

    let webSocketUrl: string;

    try {
      webSocketUrl = buildWebSocketUrl();
    } catch (error) {
      changeConnectionState("disconnected");
      reportError(
        error instanceof Error ? error : new Error("WebSocket 주소를 생성하지 못했습니다."),
      );
      return;
    }

    changeConnectionState("connecting");
    messageBuffer = "";

    socket = new WebSocket(webSocketUrl, ["v12.stomp", "v11.stomp", "v10.stomp"]);

    socket.onopen = () => {
      if (!socket) {
        return;
      }

      const host = new URL(webSocketUrl).host;

      socket.send(
        createStompFrame("CONNECT", {
          "accept-version": "1.2,1.1,1.0",
          host,
          "heart-beat": "0,0",
          Authorization: `Bearer ${accessToken}`,
        }),
      );
    };

    socket.onmessage = handleSocketMessage;

    socket.onerror = () => {
      reportError(new Error("화이트보드 WebSocket 연결 중 오류가 발생했습니다."));
    };

    socket.onclose = () => {
      socket = null;
      messageBuffer = "";
      changeConnectionState("disconnected");
      scheduleReconnect();
    };
  };

  connect();

  return () => {
    manuallyClosed = true;
    clearReconnectTimer();

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        createStompFrame("UNSUBSCRIBE", {
          id: subscriptionId,
        }),
      );

      socket.send(createStompFrame("DISCONNECT"));
      socket.close();
    }

    socket = null;
    messageBuffer = "";
    changeConnectionState("disconnected");
  };
};
