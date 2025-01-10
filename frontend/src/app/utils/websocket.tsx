// utils/websocket.ts

export const setupWebSocket = (
    websocketRef: React.MutableRefObject<WebSocket | null>,
    setSocketStatus: (status: string) => void,
    setMessages: React.Dispatch<React.SetStateAction<string[][]>>
  ) => {
    if (!window["WebSocket"]) {
      alert("Unable to proceed, browser does not support websocket");
      return false;
    }
  
    const ws = new WebSocket(`ws://${window.location.hostname}:8080/ws`);
    
    ws.onopen = () => {
      console.log("WebSocket connection established");
      setSocketStatus("Connected");
    };
  
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setSocketStatus("Error");
    };
  
    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setSocketStatus("Not Connected");
    };
  
    ws.onmessage = function (evt) {
      const eventData = JSON.parse(evt.data);
      console.log("eventData :-",eventData)
      if (eventData.type === "incoming_message") {
        const date = new Date();
        const formattedMsg:string[]=[];
         formattedMsg[0] = `${eventData.payload.From }`;
         formattedMsg[1]=`${eventData.payload.message}`
         formattedMsg[2]= `${date.toLocaleTimeString()}`
       
        setMessages((prevMessages) => [...prevMessages, formattedMsg]);
      }
    };
  
    websocketRef.current = ws;
    return true;
  };
  
  export const setupCodeWebSocket = (
    codeRef: React.MutableRefObject<WebSocket | null>,
    setCode: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const codesocket = new WebSocket("ws://localhost:8080/code");
    codeRef.current = codesocket;
  
    codesocket.addEventListener("open", () => {
      console.log("Code WebSocket connection established");
    });
  
    codesocket.addEventListener("message", (event) => {
      const receivedCode = event.data;
      setCode(receivedCode);
    });
  };