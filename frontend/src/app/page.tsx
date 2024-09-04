"use client";

import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import Code from "../app/utils/Code";
import dynamic from "next/dynamic";
import Editor, { type OnChange } from "@monaco-editor/react";
import runcode from "../app/utils/Code";
import { FaPlay, FaPlus } from "react-icons/fa";
import { MdPeopleAlt } from "react-icons/md";
import { IoIosClose } from "react-icons/io";
import { IoCodeSlashOutline, IoSend } from "react-icons/io5";
import { BsChatDots } from "react-icons/bs";
// import { setTimeout } from "timers/promises";

const MonacoEditor = dynamic(import("@monaco-editor/react"), { ssr: false });

export default function Home() {
  const [socketStatus, setSocketStatus] = useState("Not Connected");
  const [messages, setMessages] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [meetingCode, setMeetingCode] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [showOutput, setShowOutput] = useState(false);
  const [output, setOutput] = useState("");
  const [showChat, setShowChat] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const codeRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    initApp();
    openCamera();
    setupCodeWebSocket();
  }, []);

  const initApp = () => {
    const isConnected = connectToWebSocket();
    if (isConnected) {
      setSocketStatus("Connected");
    }
  };

  const connectToWebSocket = () => {
    if (!window["WebSocket"]) {
      alert("Unable to proceed, browser does not support websocket");
      return false;
    }

    const ws = new WebSocket(`ws://${window.location.hostname}:8080/ws`);
    ws.onopen = () => {
      console.log("WebSocket connection established");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    ws.onmessage = function (evt) {
      console.log("hello");
      const eventData = JSON.parse(evt.data);
      routeEvent(eventData);
    };
    websocketRef.current = ws;
    return true;
  };

  const routeEvent = (event: any) => {
    if (event.type === undefined) {
      alert("unsupported action");
      return false;
    }
    switch (event.type) {
      case "incoming_message":
        appendChatForDisplay(event.payload);
        break;
      default:
        alert("unsupported message type");
    }
  };

  const appendChatForDisplay = (messageEvent: any) => {
    const date = new Date();
    const formattedMsg = `${
      messageEvent.message
    } - ${date.toLocaleTimeString()}`;
    console.log(formattedMsg);
    console.log("formattedMsg");
    setMessages((prevMessages) => [...prevMessages, formattedMsg]);
  };

  const sendEvent = (eventName: string, payload: any) => {
    const event = {
      type: eventName,
      payload: payload,
    };
    console.log("JSON.stringify(event)");
    console.log(JSON.stringify(event));
    websocketRef.current?.send(JSON.stringify(event));
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const messageInput = document.getElementById("message") as HTMLInputElement;
    if (messageInput?.value) {
      const outgoingMsgEvent = { message: messageInput.value, from: "" };
      sendEvent("send_message", outgoingMsgEvent);
      console.log("Message Input is " + messageInput.value);
      messageInput.value = "";
    }
  };

  const openCamera = async () => {
    if (
      "mediaDevices" in navigator &&
      "getUserMedia" in navigator.mediaDevices
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.log("getUserMedia error:", error);
      }
    }
  };

  const initiateMeeting = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    let roomId = meetingCode;

    if (!roomId) {
      console.log("creating a meeting");
      const response = await fetch("http://localhost:8080/create-room");
      const data = await response.json();
      roomId = data.room_id;
      setMeetingCode(roomId);
    }

    const socket = new WebSocket(
      `ws://${window.location.hostname}:8080/join-room?roomID=${roomId}`
    );
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      console.log(true);
      socket.send(JSON.stringify({ join: true }));
    });

    socket.addEventListener("message", async (e) => {
      const message = JSON.parse(e.data);
      console.log(message);

      if (message.join) {
        console.log("Someone just joined the call");
        callUser();
      }

      if (message.iceCandidate && peerRef.current) {
        try {
          await peerRef.current.addIceCandidate(message.iceCandidate);
        } catch (error) {
          console.log(error);
        }
      }

      if (message.offer) {
        handleOffer(message.offer, socket);
      }

      if (message.answer) {
        handleAnswer(message.answer);
      }
    });
  };

  const handleOffer = async (
    offer: RTCSessionDescriptionInit,
    socket: WebSocket
  ) => {
    console.log("received an offer, creating an answer");
    peerRef.current = createPeer();
    await peerRef.current.setRemoteDescription(
      new RTCSessionDescription(offer)
    );

    localStream?.getTracks().forEach((track) => {
      peerRef.current?.addTrack(track, localStream);
    });

    const answer = await peerRef.current.createAnswer();
    await peerRef.current.setLocalDescription(answer);

    socket.send(JSON.stringify({ answer: peerRef.current.localDescription }));
  };

  const handleAnswer = (answer: RTCSessionDescriptionInit) => {
    peerRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const callUser = () => {
    console.log("calling other remote user");
    peerRef.current = createPeer();

    localStream?.getTracks().forEach((track) => {
      peerRef.current?.addTrack(track, localStream);
    });
  };

  const createPeer = () => {
    console.log("creating peer connection");
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peer.onnegotiationneeded = handleNegotiationNeeded;
    peer.onicecandidate = handleIceCandidate;
    peer.ontrack = handleTrackEvent;

    return peer;
  };

  const handleNegotiationNeeded = async () => {
    console.log("creating offer");
    try {
      const myOffer = await peerRef.current?.createOffer();
      await peerRef.current?.setLocalDescription(myOffer);
      socketRef.current?.send(
        JSON.stringify({ offer: peerRef.current?.localDescription })
      );
    } catch (error) {
      console.log(error);
    }
  };

  const handleIceCandidate = (e: RTCPeerConnectionIceEvent) => {
    console.log("found ice candidate");
    if (e.candidate) {
      socketRef.current?.send(JSON.stringify({ iceCandidate: e.candidate }));
    }
  };

  const handleTrackEvent = (e: RTCTrackEvent) => {
    console.log("Received tracks");
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = e.streams[0];
    }
  };

  const setupCodeWebSocket = () => {
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

  const handleCodeChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const updatedCode = e.target.value;
    setCode(updatedCode);

    if (codeRef.current?.readyState === WebSocket.OPEN) {
      codeRef.current.send(updatedCode);
    }
  };

  const handleEditorChange: OnChange = (newValue) => {
    if (newValue !== undefined) {
      setCode(newValue);
      if (codeRef.current?.readyState === WebSocket.OPEN) {
        codeRef.current.send(newValue);
      }
    }
  };

  const outputRef = useRef(null);

  let x = 1;
  const handleRunCode = async () => {
    setShowOutput(true);
    try {
      const result = await runcode(code);
      setOutput(result);

      if (x > 0) {
        setTimeout(() => {
          handleRunCode();
          x--;
        }, 400);
      }

      outputRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      setOutput(`Error: ${error?.message}`);
    }
  };

  const handleCloseOutput = () => {
    setShowOutput(false);
    setOutput("");
  };

  return (
    <div className="flex flex-col h-screen bg-[#121421]">
      {/* Navbar */}
      <nav className="bg-[#1c1f2e] p-4 flex items-center justify-between">
        <div className="flex flex-row items-center justify-center">
          <h1 className="text-white text-lg font-semibold">
            DevHub{" "}
            <IoCodeSlashOutline className="inline-block mb-[1px] size-5" />
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative flex items-center">
            <input
              type="text"
              className="w-40 p-2 text-sm bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              placeholder="Meeting Code"
              value={meetingCode}
              onChange={(e) => setMeetingCode(e.target.value)}
            />
          </div>
          <button
            className="flex flex-row items-center gap-2 justify-center bg-white text-gray-900 py-1 px-3 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
            onClick={initiateMeeting}
          >
            Join {<MdPeopleAlt size={17} />}
          </button>
          <button
            className="flex flex-row items-center gap-2 justify-center bg-black text-white py-2 px-4 rounded-lg text-xs font-semibold hover:bg-gray-900 transition-colors"
            onClick={initiateMeeting}
          >
            Create {<FaPlus size={12} />}
          </button>
          <button
            className="text-white p-2 rounded-md hover:bg-gray-600 transition-colors"
            onClick={handleRunCode}
          >
            <FaPlay size={14} color="white" />
          </button>
          <button
            className="text-white p-2 rounded-md hover:bg-gray-600 transition-colors"
            onClick={() => setShowChat(!showChat)}
          >
            <BsChatDots size={20} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Section: Code Editor */}
        <div className={`${showChat ? 'w-[60%]' : 'w-[80%]'} p-2 transition-all duration-300`}>
          <Editor
            height="100%"
            defaultLanguage="javascript"
            theme="vs-dark"
            defaultValue=""
            onChange={handleEditorChange}
            value={code}
          />
        </div>

        {/* Middle Section: Chat (Conditionally rendered) */}
        {showChat && (
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
                  id="message"
                  className="flex-grow text-sm text-white bg-gray-900 p-2 rounded-l-lg focus:outline-none"
                  type="text"
                  placeholder="Type your message…"
                />
                <button className="bg-blue-500 p-2 text-white rounded-r-lg">
                  <IoSend />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Right Section: Videos */}
        <div className={`${showChat ? 'w-[20%]' : 'w-[20%]'} flex flex-col p-2 transition-all duration-300`}>
          {/* <video
            className="w-full h-1/2 mb-2 rounded-lg object-cover"
            autoPlay
            controls
            ref={localVideoRef}
          ></video> */}

<video
            className="w-full h-1/2 mb-2 rounded-lg object-cover"
            autoPlay
            controls
            ref={localVideoRef}
          ></video>
          <video
            className="w-full h-1/2 rounded-lg object-cover"
            autoPlay
            controls
            ref={remoteVideoRef}
          ></video>
        </div>
      </div>

      {/* Output Section */}
     {/* Output Section */}
     {showOutput && (
        <div className="bg-gray-900 p-2 h-2/5 relative">
          <div className="flex justify-between items-center mb-2">
            <div className="text-md text-white">Output</div>
            <button
              onClick={handleCloseOutput}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <IoIosClose size={26} />
            </button>
          </div>
          <div
            id="output"
            className="bg-gray-800 text-white p-2 rounded-md h-[calc(100%-2rem)] border border-gray-600 overflow-y-auto"
          >
            {/* <div
              id="output"
              className="bg-gray-800 text-white p-2 rounded-md h-[calc(100%-2rem)] border border-gray-600 overflow-y-auto"
            > */}
            <pre>{output}</pre>
            {/* </div>{" "} */}
          </div>
        </div>
      )}
    </div>
  );
}
