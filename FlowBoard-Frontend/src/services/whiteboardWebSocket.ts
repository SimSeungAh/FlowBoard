import type {
  WhiteboardObjectResponse,
  WhiteboardPoint,
  WhiteboardStrokeResponse,
  WhiteboardTool,
  WhiteboardWorkspaceResponse,
} from "@/api/whiteboard";

export type WhiteboardConnectionState = "connecting" | "connected" | "disconnected";

export type WhiteboardEventType =
  | "STROKE_CREATED"
  | "STROKE_DELETED"
  | "CLEARED"
  | "OBJECT_CREATED"
  | "OBJECT_UPDATED"
  | "OBJECT_DELETED"
  | "WORKSPACE_UPDATED"
  | "OBJECT_LIVE_EDIT"
  | "OBJECT_LIVE_MOVE"
  | "OBJECT_LIVE_RESIZE"
  | "STROKE_LIVE_START"
  | "STROKE_LIVE_APPEND"
  | "STROKE_LIVE_END"
  | "CURSOR_MOVED";

export interface WhiteboardLiveObjectPayload {
  objectId: number;
  sourceClientId: string;
  sequence: number;
  content: string | null;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
}

export interface WhiteboardLiveStrokePayload {
  liveStrokeId: string;
  sourceClientId: string;
  sequence: number;
  tool: WhiteboardTool | null;
  color: string | null;
  lineWidth: number | null;
  points: WhiteboardPoint[];
}

export interface WhiteboardCursorPayload {
  sourceClientId: string;
  userId: number;
  nickname: string;
  x: number;
  y: number;
}

export interface WhiteboardWebSocketEvent {
  type: WhiteboardEventType;
  boardId: number;
  whiteboardId: number | null;
  strokeId: number | null;
  stroke: WhiteboardStrokeResponse | null;
  objectId: number | null;
  object: WhiteboardObjectResponse | null;
  workspace: WhiteboardWorkspaceResponse | null;
  liveObject: WhiteboardLiveObjectPayload | null;
  liveStroke: WhiteboardLiveStrokePayload | null;
  cursor: WhiteboardCursorPayload | null;
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

export interface WhiteboardWebSocketConnection {
  readonly clientId: string;
  disconnect: () => void;
  sendLiveEdit: (objectId: number, content: string) => boolean;
  sendLiveMove: (objectId: number, x: number, y: number) => boolean;
  sendLiveResize: (objectId: number, width: number, height: number) => boolean;
  sendLiveStrokeStart: (
    liveStrokeId: string,
    tool: WhiteboardTool,
    color: string,
    lineWidth: number,
    points: WhiteboardPoint[],
  ) => boolean;
  sendLiveStrokeAppend: (liveStrokeId: string, points: WhiteboardPoint[]) => boolean;
  sendLiveStrokeEnd: (liveStrokeId: string) => boolean;
  sendCursor: (x: number, y: number) => boolean;
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
  const normalizedHeaders = {
    ...headers,
    ...(body
      ? {
          "content-type": "application/json",
          "content-length": String(new TextEncoder().encode(body).length),
        }
      : {}),
  };

  const headerLines = Object.entries(normalizedHeaders).map(([key, value]) => `${key}:${value}`);
  return [command, ...headerLines, "", body].join("\n") + "\u0000";
};

const parseStompFrame = (rawFrame: string): ParsedStompFrame | null => {
  const frame = rawFrame.replace(/^\n+/, "");
  if (!frame.trim()) return null;

  const headerEndIndex = frame.indexOf("\n\n");
  if (headerEndIndex < 0) return null;

  const headerSection = frame.slice(0, headerEndIndex);
  const body = frame.slice(headerEndIndex + 2);
  const lines = headerSection.split("\n");
  const command = lines.shift()?.trim();
  if (!command) return null;

  const headers: Record<string, string> = {};
  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) continue;
    headers[line.slice(0, separatorIndex)] = line.slice(separatorIndex + 1);
  }

  return { command, headers, body };
};

export const connectWhiteboardWebSocket = ({
  boardId,
  whiteboardId = null,
  onEvent,
  onConnectionStateChange,
  onError,
}: ConnectWhiteboardWebSocketOptions): WhiteboardWebSocketConnection => {
  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let manuallyClosed = false;
  let messageBuffer = "";
  let stompConnected = false;
  let sequence = 0;

  const clientId = crypto.randomUUID();
  const subscriptionId =
    whiteboardId === null ? `whiteboard-${boardId}` : `whiteboard-${boardId}-${whiteboardId}`;
  const destination =
    whiteboardId === null
      ? `/topic/boards/${boardId}/whiteboard`
      : `/topic/boards/${boardId}/whiteboards/${whiteboardId}`;

  const changeConnectionState = (state: WhiteboardConnectionState) =>
    onConnectionStateChange?.(state);
  const reportError = (error: Error) => onError?.(error);

  const clearReconnectTimer = () => {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (manuallyClosed) return;
    clearReconnectTimer();
    reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY);
  };

  const subscribe = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !stompConnected) return;
    socket.send(
      createStompFrame("SUBSCRIBE", {
        id: subscriptionId,
        destination,
        ack: "auto",
      }),
    );
  };

  const sendJson = (sendDestination: string, body: unknown) => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !stompConnected) return false;
    socket.send(
      createStompFrame(
        "SEND",
        { destination: sendDestination },
        JSON.stringify(body),
      ),
    );
    return true;
  };

  const handleMessageFrame = (frame: ParsedStompFrame) => {
    try {
      const event = JSON.parse(frame.body) as WhiteboardWebSocketEvent;
      if (event.boardId !== boardId) return;
      if (whiteboardId !== null && event.whiteboardId !== whiteboardId) return;

      if (
        (event.type === "OBJECT_LIVE_EDIT" ||
          event.type === "OBJECT_LIVE_MOVE" ||
          event.type === "OBJECT_LIVE_RESIZE") &&
        event.liveObject?.sourceClientId === clientId
      ) {
        return;
      }

      if (
        (event.type === "STROKE_LIVE_START" ||
          event.type === "STROKE_LIVE_APPEND" ||
          event.type === "STROKE_LIVE_END") &&
        event.liveStroke?.sourceClientId === clientId
      ) {
        return;
      }

      if (event.type === "CURSOR_MOVED" && event.cursor?.sourceClientId === clientId) {
        return;
      }

      onEvent(event);
    } catch {
      reportError(new Error("화이트보드 실시간 데이터를 해석하지 못했습니다."));
    }
  };

  const handleStompFrame = (rawFrame: string) => {
    const frame = parseStompFrame(rawFrame);
    if (!frame) return;

    switch (frame.command) {
      case "CONNECTED":
        stompConnected = true;
        changeConnectionState("connected");
        subscribe();
        break;
      case "MESSAGE":
        handleMessageFrame(frame);
        break;
      case "ERROR":
        stompConnected = false;
        changeConnectionState("disconnected");
        reportError(new Error(frame.body || "WebSocket 서버에서 오류가 발생했습니다."));
        break;
      default:
        break;
    }
  };

  const handleSocketMessage = (event: MessageEvent<string>) => {
    if (event.data === "\n" || event.data === "\r\n") return;
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
    if (manuallyClosed) return;
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
    stompConnected = false;
    socket = new WebSocket(webSocketUrl, ["v12.stomp", "v11.stomp", "v10.stomp"]);

    socket.onopen = () => {
      if (!socket) return;
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
    socket.onerror = () => reportError(new Error("화이트보드 WebSocket 연결 중 오류가 발생했습니다."));
    socket.onclose = () => {
      socket = null;
      messageBuffer = "";
      stompConnected = false;

      /*
       * React effect cleanup / 화이트보드 탭 전환처럼 의도적으로 닫은
       * 이전 연결은 새 연결의 UI 상태를 "disconnected"로 덮어쓰면 안 됩니다.
       * 실제 네트워크 단절일 때만 연결 끊김 상태와 재연결을 처리합니다.
       */
      if (manuallyClosed) {
        return;
      }

      changeConnectionState("disconnected");
      scheduleReconnect();
    };
  };

  const disconnect = () => {
    manuallyClosed = true;
    clearReconnectTimer();

    const currentSocket = socket;
    socket = null;

    if (currentSocket) {
      /*
       * 이미 cleanup 대상이 된 연결의 비동기 onclose/onmessage가
       * 새 연결 상태를 건드리지 못하도록 핸들러를 먼저 분리합니다.
       */
      currentSocket.onopen = null;
      currentSocket.onmessage = null;
      currentSocket.onerror = null;
      currentSocket.onclose = null;

      if (currentSocket.readyState === WebSocket.OPEN) {
        currentSocket.send(createStompFrame("UNSUBSCRIBE", { id: subscriptionId }));
        currentSocket.send(createStompFrame("DISCONNECT"));
      }

      if (
        currentSocket.readyState === WebSocket.OPEN ||
        currentSocket.readyState === WebSocket.CONNECTING
      ) {
        currentSocket.close();
      }
    }

    messageBuffer = "";
    stompConnected = false;

    /*
     * cleanup 자체는 화면에 "연결 끊김"을 표시하지 않습니다.
     * 새 connection이 바로 connecting → connected 상태를 이어받습니다.
     */
  };

  const nextSequence = () => {
    sequence += 1;
    return sequence;
  };

  const sendLiveEdit = (objectId: number, content: string) => {
    if (whiteboardId === null) return false;
    return sendJson(
      `/app/boards/${boardId}/whiteboards/${whiteboardId}/objects/${objectId}/live-edit`,
      { sourceClientId: clientId, sequence: nextSequence(), content },
    );
  };

  const sendLiveMove = (objectId: number, x: number, y: number) => {
    if (whiteboardId === null) return false;
    return sendJson(
      `/app/boards/${boardId}/whiteboards/${whiteboardId}/objects/${objectId}/live-move`,
      { sourceClientId: clientId, sequence: nextSequence(), x, y },
    );
  };

  const sendLiveResize = (objectId: number, width: number, height: number) => {
    if (whiteboardId === null) return false;
    return sendJson(
      `/app/boards/${boardId}/whiteboards/${whiteboardId}/objects/${objectId}/live-resize`,
      { sourceClientId: clientId, sequence: nextSequence(), width, height },
    );
  };

  const sendLiveStrokeStart = (
    liveStrokeId: string,
    tool: WhiteboardTool,
    color: string,
    lineWidth: number,
    points: WhiteboardPoint[],
  ) => {
    if (whiteboardId === null) return false;
    return sendJson(`/app/boards/${boardId}/whiteboards/${whiteboardId}/strokes/live-start`, {
      liveStrokeId,
      sourceClientId: clientId,
      sequence: nextSequence(),
      tool,
      color,
      lineWidth,
      points,
    });
  };

  const sendLiveStrokeAppend = (liveStrokeId: string, points: WhiteboardPoint[]) => {
    if (whiteboardId === null || points.length === 0) return false;
    return sendJson(`/app/boards/${boardId}/whiteboards/${whiteboardId}/strokes/live-append`, {
      liveStrokeId,
      sourceClientId: clientId,
      sequence: nextSequence(),
      points,
    });
  };

  const sendLiveStrokeEnd = (liveStrokeId: string) => {
    if (whiteboardId === null) return false;
    return sendJson(`/app/boards/${boardId}/whiteboards/${whiteboardId}/strokes/live-end`, {
      liveStrokeId,
      sourceClientId: clientId,
      sequence: nextSequence(),
    });
  };

  const sendCursor = (x: number, y: number) => {
    if (whiteboardId === null) return false;
    return sendJson(`/app/boards/${boardId}/whiteboards/${whiteboardId}/cursor`, {
      sourceClientId: clientId,
      x,
      y,
    });
  };

  connect();

  return {
    clientId,
    disconnect,
    sendLiveEdit,
    sendLiveMove,
    sendLiveResize,
    sendLiveStrokeStart,
    sendLiveStrokeAppend,
    sendLiveStrokeEnd,
    sendCursor,
  };
};
