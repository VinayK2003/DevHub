'use client';

import React, { useState, useEffect, useRef,ChangeEvent } from 'react';
import Code from "../app/utils/Code"
import dynamic from 'next/dynamic';
import Editor,{type OnChange} from '@monaco-editor/react';
import runcode from '../app/utils/Code';
// import { api } from "~/trpc/react"
const MonacoEditor = dynamic(import('@monaco-editor/react'), { ssr: false });



export default function Home() {
  const [socketStatus, setSocketStatus] = useState('Not Connected');
  const [messages, setMessages] = useState<string[]>([]);
  const [code, setCode] = useState('')
  const [meetingCode, setMeetingCode] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const codeRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  // const updateContentMutation = api.editor.updateContent.useMutation();

  useEffect(() => {
    initApp();
    openCamera();
    setupCodeWebSocket();
  }, []);

  const initApp = () => {
    const isConnected = connectToWebSocket();
    if (isConnected) {
      setSocketStatus('Connected');
    }
  };

  const connectToWebSocket = () => {
    if (!window['WebSocket']) {
      alert('Unable to proceed, browser does not support websocket');
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
    
    // console.log("connection is " + `ws://${window.location.hostname}:8080/ws`)
    ws.onmessage = function (evt) {
      console.log("hello")
    const eventData = JSON.parse(evt.data);
      routeEvent(eventData);
    };
    websocketRef.current = ws;
    return true;
  };

  const routeEvent = (event: any) => {
    if (event.type === undefined) {
      alert('unsupported action');
      return false;
    }
    switch (event.type) {
      case "incoming_message":
        appendChatForDisplay(event.payload);
        break;
      default:
        alert('unsupported message type');
    }
  };

  const appendChatForDisplay = (messageEvent: any) => {
    const date = new Date();
    const formattedMsg = `${messageEvent.message} - ${date.toLocaleTimeString()}`;
    console.log(formattedMsg)
    console.log("formattedMsg")
    setMessages((prevMessages) => [...prevMessages, formattedMsg]);
//     let date = new Date();
//   const formattedMsgTemplate = `<div class="flex justify-between w-full">
//   <p class="flex-auto  w-5/6"><span class="text-sm"></span> ${
//     messageEvent.message
//   }</p>
//   <p class="flext-none w-18 text-sm text-gray-300 italic">${date.toLocaleTimeString()}</p>
// </div>`;
//   console.log("appending hit "+ messageEvent.message)

//   let chatWall = document.getElementById('chat_messages');
//   if(chatWall){
//     chatWall.innerHTML = chatWall.innerHTML + formattedMsgTemplate;
//     chatWall.scrollTop = chatWall.scrollHeight;
//   }
  };

  const sendEvent = (eventName: string, payload: any) => {
    // const event = { payload, type: eventName };
    // websocketRef.current?.send(JSON.stringify(event));
    const event = {
      type: eventName,
      payload: payload
    };
    console.log("JSON.stringify(event)");
    console.log(JSON.stringify(event));
    websocketRef.current?.send(JSON.stringify(event));
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const messageInput = document.getElementById('message') as HTMLInputElement;
    if (messageInput?.value) {
      const outgoingMsgEvent = { message: messageInput.value, from: '' };
      sendEvent("send_message", outgoingMsgEvent);
      console.log("Message Input is " + messageInput.value)
      messageInput.value = '';
    }
  };

  const openCamera = async () => {
    if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
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
      console.log('creating a meeting');
      const response = await fetch('http://localhost:8080/create-room');
      const data = await response.json();
      roomId = data.room_id;
      setMeetingCode(roomId);
    }

    const socket = new WebSocket(`ws://${window.location.hostname}:8080/join-room?roomID=${roomId}`);
    socketRef.current = socket;
    // const codesocket = new WebSocket('ws://localhost:8080/code');
    // codeRef.current=codesocket;
    // socket.addEventListener('open', () => {
    //   console.log("Codesocket established !!");
    // });

    socket.addEventListener('open', () => {
      console.log(true);
      socket.send(JSON.stringify({ join: true }));
    });

    socket.addEventListener('message', async (e) => {
      const message = JSON.parse(e.data);
      console.log(message);


      if (message.join) {
        console.log('Someone just joined the call');
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


  const handleOffer = async (offer: RTCSessionDescriptionInit, socket: WebSocket) => {
    console.log('received an offer, creating an answer');
    peerRef.current = createPeer();
    await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));

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
    console.log('calling other remote user');
    peerRef.current = createPeer();

    localStream?.getTracks().forEach((track) => {
      peerRef.current?.addTrack(track, localStream);
    });
  };

  const createPeer = () => {
    console.log('creating peer connection');
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    peer.onnegotiationneeded = handleNegotiationNeeded;
    peer.onicecandidate = handleIceCandidate;
    peer.ontrack = handleTrackEvent;

    return peer;
  };

  const handleNegotiationNeeded = async () => {
    console.log('creating offer');
    try {
      const myOffer = await peerRef.current?.createOffer();
      await peerRef.current?.setLocalDescription(myOffer);
      socketRef.current?.send(JSON.stringify({ offer: peerRef.current?.localDescription }));
    } catch (error) {
      console.log(error);
    }
  };

  const handleIceCandidate = (e: RTCPeerConnectionIceEvent) => {
    console.log('found ice candidate');
    if (e.candidate) {
      socketRef.current?.send(JSON.stringify({ iceCandidate: e.candidate }));
    }
  };

  const handleTrackEvent = (e: RTCTrackEvent) => {
    console.log('Received tracks');
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = e.streams[0];
    }
  };
  
  // codeRef.current?.addEventListener('open', () => {
  //   console.log("Code WebSocket connection established");

  //   // Event listener for receiving code updates
  //   codeRef.current?.addEventListener('message', (event) => {
  //     const editorElement = document.getElementById('text-area') as HTMLTextAreaElement | null;
  //     if (editorElement) {
  //       editorElement.value = event.data;
  //       setCode(event.data); // Sync with state
  //     }
  //   });

  //   // Event listener for sending code updates
  //   const editorElement = document.getElementById('text-area') as HTMLTextAreaElement | null;
  //   if (editorElement) {
  //     editorElement.addEventListener('input', () => {
  //       if (codeRef.current?.readyState === WebSocket.OPEN) {
  //         codeRef.current?.send(editorElement.value);
  //       }
  //     });
  //   }
  // });
  const setupCodeWebSocket = () => {
    const codesocket = new WebSocket('ws://localhost:8080/code');
    codeRef.current = codesocket;

    codesocket.addEventListener('open', () => {
      console.log('Code WebSocket connection established');
    });

    codesocket.addEventListener('message', (event) => {
      const receivedCode = event.data;
      setCode(receivedCode);
    });
  };
  const handleCodeChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const updatedCode = e.target.value;
    setCode(updatedCode);

    // Send updated code through WebSocket if the connection is open
    if (codeRef.current?.readyState === WebSocket.OPEN) {
      codeRef.current.send(updatedCode);
    }
    
  };
  const handleEditorChange: OnChange = (newValue) => {
    if (newValue !== undefined) {
      setCode(newValue);
      // localStorage.setItem("editorContent", newValue);
      if (codeRef.current?.readyState === WebSocket.OPEN) {
        codeRef.current.send(newValue);
      }
      // updateContentMutation.mutate(newValue);
    }
  };
  return (
    <div className="p-6 bg-[#121421] min-h-screen flex flex-col">
  {/* Header Section */}
  <div className="bg-[#1c1f2e] p-4 rounded-lg shadow-lg mb-4">
    <h1 className="text-2xl text-white font-bold">Streamify</h1>
    <p className="text-xs text-gray-400">Collaborate and communicate seamlessly.</p>

    <div className="flex items-center space-x-2 mt-2">
      <input
        type="text"
        id="meeting_code_box"
        className="w-1/2 p-1 text-xs bg-gray-900 text-white rounded-lg focus:outline-none"
        placeholder="Meeting Code"
        value={meetingCode}
        onChange={(e) => setMeetingCode(e.target.value)}
      />
      <button
        className="bg-blue-500 text-white py-1 px-2 rounded-lg text-xs"
        onClick={initiateMeeting}
      >
        Join
      </button>
      <span className="text-white">or</span>
      <button
        className="bg-green-500 text-white py-1 px-2 rounded-lg text-xs"
        onClick={initiateMeeting}
      >
        Create
      </button>
    </div>

    <div className="flex items-center space-x-2 mt-2">
      <span className={`inline-block w-2 h-2 rounded-full ${socketStatus === 'Connected' ? 'bg-green-600' : 'bg-red-600'}`}></span>
      <p className="text-gray-400 text-xs">{socketStatus}</p>
    </div>
  </div>

  {/* Main Content */}
  <div className="flex flex-1">
    {/* Left Section: Videos */}
    <div className="flex flex-col w-1/4 space-y-2 p-2">
      <video className="w-full h-50 rounded-lg object-cover" autoPlay controls ref={localVideoRef}></video>
      <video className="w-full h-50 rounded-lg object-cover" autoPlay controls ref={remoteVideoRef}></video>
    </div>

    {/* Center Section: Code Editor and Output */}
    <div className="flex-1 flex flex-col space-y-4 p-2">
      <div className="bg-[#1a2767] p-2 rounded-lg shadow-lg">
        <Editor height="40vh" defaultLanguage="javascript" theme="vs-dark"defaultValue="" onChange={handleEditorChange} value={code} />
      </div>
      <div className="bg-gray-900 p-2 rounded-lg shadow-lg">
        <div className="text-lg text-white mb-1">Output</div>
        <div id="output" className="bg-gray-800 text-white p-2 rounded-md min-h-[150px] border border-gray-600 overflow-y-auto">
          {/* Output content goes here */}
        </div>
      </div>
    </div>

    {/* Right Section: Chat */}
    <div className="w-1/4 bg-[#1c1f2e] rounded-lg shadow-lg flex flex-col">
      <div className="flex items-center justify-between bg-gray-900 p-2 rounded-t-lg">
        <div className="text-white font-semibold text-lg">Chat</div>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-white">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
      </div>

      <div className="p-2 overflow-y-auto flex-1">
        {messages.map((msg, index) => (
          <div key={index} className="text-white text-sm bg-gray-800 p-1 rounded-lg mb-1">{msg}</div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="flex p-2 border-t border-gray-700">
        <input
          id="message"
          className="flex-grow text-sm text-white bg-gray-900 p-1 rounded-l-lg focus:outline-none"
          type="text"
          placeholder="Type your message…"
        />
        <button className="bg-blue-500 p-1 text-white rounded-r-lg text-xs">Send</button>
      </form>
    </div>
  </div>

  <button className="bg-blue-500 text-white py-2 px-4 rounded-lg shadow mt-4 self-center" onClick={() => runcode(code)}>RUN</button>
</div>

  );
}