import React, { useState } from "react";
import { IoIosClose } from "react-icons/io";
import { IoSend } from "react-icons/io5";

interface ChatProps {
  messages: string[];
  setShowChat: (show: boolean) => void;
  websocketRef: React.MutableRefObject<WebSocket | null>;
}

const Chat: React.FC<ChatProps> = ({ messages, setShowChat, websocketRef }) => {
  const [inputMessage, setInputMessage] = useState("");

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage) {
      const outgoingMsgEvent = { message: inputMessage, from: "" };
      websocketRef.current?.send(JSON.stringify({ type: "send_message", payload: outgoingMsgEvent }));
      setInputMessage("");
    }
  };

  return (
    <div className="w-[20%] flex flex-col bg-[#1c1f2e] p-2">
      <div className="flex items-center justify-between bg-gray-900 p-2 rounded-t-lg">
        <div className="text-white font-semibold text-lg">Chat</div>
        <button onClick={() => setShowChat(false)}>
          <IoIosClose size={24} className="text-white" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className="text-white text-sm bg-gray-800 p-2 rounded-lg mb-2">
            {msg}
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="mt-2">
        <div className="flex">
          <input
            className="flex-grow text-sm text-white bg-gray-900 p-2 rounded-l-lg focus:outline-none"
            type="text"
            placeholder="Type your message…"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
          />
          <button className="bg-blue-500 p-2 text-white rounded-r-lg">
            <IoSend />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;