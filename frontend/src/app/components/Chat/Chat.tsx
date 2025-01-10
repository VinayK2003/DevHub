import React, { useState, useRef, useEffect } from "react";
import { IoIosClose } from "react-icons/io";
import { IoSend } from "react-icons/io5";

interface ChatProps {
  username: string;
  messages: string[][];
  setShowChat: (show: boolean) => void;
  websocketRef: React.MutableRefObject<WebSocket | null>;
}

const Chat: React.FC<ChatProps> = ({ username, messages, setShowChat, websocketRef }) => {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      const outgoingMsgEvent = { message: inputMessage, from: username };
      websocketRef.current?.send(
        JSON.stringify({ type: "send_message", payload: outgoingMsgEvent })
      );
      setInputMessage("");
    }
  };

  return (
    <div className="w-[20%] flex flex-col bg-gray-900 rounded-lg shadow-xl h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          <h2 className="text-white font-semibold">Live Chat</h2>
        </div>
        <button
          onClick={() => setShowChat(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <IoIosClose size={24} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {messages.map((msg, index) => {
          const [fromMsg, payloadMsg, timeMsg] = msg;
          const isOwnMessage = fromMsg === username;

          return (
            <div
              key={index}
              className={`flex flex-col ${
                isOwnMessage ? "items-end" : "items-start"
              }`}
            >
              <div className="flex items-end gap-1 max-w-[85%]">
                {!isOwnMessage && (
                  <span className="text-xs text-gray-400">{fromMsg}</span>
                )}
                <div
                  className={`rounded-lg px-3 py-1.5 break-words ${
                    isOwnMessage
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-100"
                  }`}
                >
                  {payloadMsg}
                </div>
              </div>
              <span className="text-xs text-gray-500 mt-0.5">{timeMsg}</span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={sendMessage} className="border-t border-gray-700 p-2">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            type="text"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-1.5 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <IoSend size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
