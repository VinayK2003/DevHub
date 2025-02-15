"use client"
import React, { useState, useEffect, useRef } from "react";
import Navbar from "./components/Navbar/Navbar";
import CodeEditor from "./components/CodeEditor/CodeEditor";
import Login from "./login/page"
import Chat from "./components/Chat/Chat";
import VideoSection from "./components/VideoSecion/VideoSection";
import OutputSection from "./components/OutputSection/OutputSection";
import { setupWebSocket, setupCodeWebSocket } from "./utils/websocket";
import { initiateMeeting, openCamera } from "./utils/videoCall";
import  runCode  from "./utils/Code";

export default function Home() {
  const [socketStatus, setSocketStatus] = useState("Not Connected");
  const [username, setUsername] = useState<string>("");
  const [messages, setMessages] = useState<string[][]>([]);
  const [code, setCode] = useState("");
  const [meetingCode, setMeetingCode] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [showOutput, setShowOutput] = useState(false);
  const [output, setOutput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [selectedLanguage, setselectedLanguage] = useState<string>("");

  const websocketRef = useRef<WebSocket | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const codeRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setupWebSocket(websocketRef, setSocketStatus, setMessages);
    openCamera(setLocalStream);
    setupCodeWebSocket(codeRef, setCode);
  }, []);
  const updateusername = (username: string) => {
    setUsername(username);
  };
  if (!username) {
    console.log("Rendering Login with setUsername:", setUsername)
    return <Login updateusername={updateusername} />;
}

  const handleRunCode = async () => {
    try {
      const result = await runCode(selectedLanguage,code);    
        setShowOutput(true);
        setOutput(String(result));
    } catch (error) {
        setShowOutput(true);
        setOutput(`Error: ${error}`);
    }
  };
  

  const handleInitiateMeeting = async () => {
    const roomId = await initiateMeeting(meetingCode, socketRef, peerRef, localStream,remoteVideoRef);
    setMeetingCode(roomId);
  };

  return (
    <div className="flex flex-col h-screen bg-[#121421]">
      <Navbar
        meetingCode={meetingCode}
        setMeetingCode={setMeetingCode}
        initiateMeeting={handleInitiateMeeting}
        handleRunCode={handleRunCode}
        setShowChat={setShowChat}
        showChat={showChat}
        setselectedLanguage={setselectedLanguage}
        selectedLanguage={selectedLanguage}
      />
      <div className="h-full flex flex-1 overflow-hidden ">
        <CodeEditor
          code={code}
          setCode={setCode}
          codeRef={codeRef}
          showChat={showChat}
        />
        {showChat && (
          <Chat
            username={username}
            messages={messages}
            setShowChat={setShowChat}
            websocketRef={websocketRef}
          />
        )}
        <VideoSection
          localStream={localStream}
          showChat={showChat}
          remoteVideoRef={remoteVideoRef}
        />
      </div>
      {showOutput && (
        <OutputSection
          output={output}
          setShowOutput={setShowOutput}
        />
      )}
    </div>
  );
}