import { WS_BASE } from "../config/api";

export const setupWebSocket = (
  websocketRef: React.MutableRefObject<WebSocket | null>,
  setSocketStatus: (status: string) => void,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
): boolean => {
  if (!("WebSocket" in window)) {
    alert("Your browser does not support WebSocket.");
    return false;
  }

  const ws = new WebSocket(`${WS_BASE}/ws`);

  ws.onopen = () => {
    console.log("Chat WebSocket connected");
    setSocketStatus("Connected");
  };

  ws.onerror = () => {
    console.error("Chat WebSocket error");
    setSocketStatus("Error");
  };

  ws.onclose = () => {
    console.log("Chat WebSocket closed");
    setSocketStatus("Not Connected");
  };

  ws.onmessage = (evt) => {
    const eventData = JSON.parse(evt.data as string);
    if (eventData.type === "incoming_message") {
      const msg: ChatMessage = {
        from: eventData.payload.From ?? "",
        text: eventData.payload.message ?? "",
        time: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, msg]);
    }
  };

  websocketRef.current = ws;
  return true;
};

export const setupCodeWebSocket = (
  codeRef: React.MutableRefObject<WebSocket | null>,
  setCode: React.Dispatch<React.SetStateAction<string>>
): void => {
  const ws = new WebSocket(`${WS_BASE}/code`);
  codeRef.current = ws;

  ws.addEventListener("open", () => {
    console.log("Code WebSocket connected");
  });

  ws.addEventListener("message", (event) => {
    setCode(event.data as string);
  });

  ws.addEventListener("error", () => {
    console.error("Code WebSocket error");
  });
};

/** Shared message shape used across Chat and WebSocket utilities. */
export interface ChatMessage {
  from: string;
  text: string;
  time: string;
}
