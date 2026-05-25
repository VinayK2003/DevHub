import { API_BASE, WS_BASE } from "../config/api";

export const openCamera = async (
  setLocalStream: (stream: MediaStream) => void
): Promise<void> => {
  if (!("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices)) {
    console.warn("getUserMedia is not supported in this browser.");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    setLocalStream(stream);
  } catch (error) {
    console.error("getUserMedia error:", error);
  }
};

export const initiateMeeting = async (
  meetingCode: string,
  socketRef: React.MutableRefObject<WebSocket | null>,
  peerRef: React.MutableRefObject<RTCPeerConnection | null>,
  localStream: MediaStream | null,
  remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>
): Promise<string> => {
  let roomId = meetingCode;

  if (!roomId) {
    console.log("Creating a new meeting room…");
    const response = await fetch(`${API_BASE}/create-room`);
    const data = await response.json() as { room_id: string };
    roomId = data.room_id;
  }

  const socket = new WebSocket(`${WS_BASE}/join-room?roomID=${roomId}`);
  socketRef.current = socket;

  socket.addEventListener("open", () => {
    console.log("Room WebSocket connected");
    socket.send(JSON.stringify({ join: true }));
  });

  socket.addEventListener("message", async (e) => {
    const message = JSON.parse(e.data as string) as Record<string, unknown>;
    console.log("Room message received:", message);

    if (message.join) {
      callUser(peerRef, localStream, socketRef, remoteVideoRef);
    }

    if (message.iceCandidate && peerRef.current) {
      try {
        await peerRef.current.addIceCandidate(
          message.iceCandidate as RTCIceCandidateInit
        );
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    }

    if (message.offer) {
      handleOffer(
        message.offer as RTCSessionDescriptionInit,
        socket,
        peerRef,
        localStream,
        socketRef,
        remoteVideoRef
      );
    }

    if (message.answer) {
      handleAnswer(message.answer as RTCSessionDescriptionInit, peerRef.current);
    }
  });

  socket.addEventListener("error", (e) => {
    console.error("Room WebSocket error:", e);
  });

  return roomId;
};

const createPeer = (
  socketRef: React.MutableRefObject<WebSocket | null>,
  remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>,
  peerRef: React.MutableRefObject<RTCPeerConnection | null>
): RTCPeerConnection => {
  const peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  peer.onicecandidate = (e) => handleIceCandidate(e, socketRef);
  peer.onnegotiationneeded = () => handleNegotiationNeeded(peerRef, socketRef);
  peer.ontrack = (e) => handleTrackEvent(e, remoteVideoRef);

  return peer;
};

const callUser = (
  peerRef: React.MutableRefObject<RTCPeerConnection | null>,
  localStream: MediaStream | null,
  socketRef: React.MutableRefObject<WebSocket | null>,
  remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>
): void => {
  peerRef.current = createPeer(socketRef, remoteVideoRef, peerRef);
  localStream?.getTracks().forEach((track) => {
    peerRef.current?.addTrack(track, localStream);
  });
};

const handleOffer = async (
  offer: RTCSessionDescriptionInit,
  socket: WebSocket,
  peerRef: React.MutableRefObject<RTCPeerConnection | null>,
  localStream: MediaStream | null,
  socketRef: React.MutableRefObject<WebSocket | null>,
  remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>
): Promise<void> => {
  peerRef.current = createPeer(socketRef, remoteVideoRef, peerRef);
  await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));

  localStream?.getTracks().forEach((track) => {
    peerRef.current?.addTrack(track, localStream);
  });

  const answer = await peerRef.current.createAnswer();
  await peerRef.current.setLocalDescription(answer);
  socket.send(JSON.stringify({ answer: peerRef.current.localDescription }));
};

const handleAnswer = (
  answer: RTCSessionDescriptionInit,
  peer: RTCPeerConnection | null
): void => {
  peer?.setRemoteDescription(new RTCSessionDescription(answer));
};

const handleNegotiationNeeded = async (
  peerRef: React.MutableRefObject<RTCPeerConnection | null>,
  socketRef: React.MutableRefObject<WebSocket | null>
): Promise<void> => {
  try {
    const offer = await peerRef.current?.createOffer();
    await peerRef.current?.setLocalDescription(offer);
    socketRef.current?.send(
      JSON.stringify({ offer: peerRef.current?.localDescription })
    );
  } catch (error) {
    console.error("Negotiation error:", error);
  }
};

const handleIceCandidate = (
  e: RTCPeerConnectionIceEvent,
  socketRef: React.MutableRefObject<WebSocket | null>
): void => {
  if (e.candidate) {
    socketRef.current?.send(JSON.stringify({ iceCandidate: e.candidate }));
  }
};

const handleTrackEvent = (
  e: RTCTrackEvent,
  remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>
): void => {
  if (remoteVideoRef.current) {
    remoteVideoRef.current.srcObject = e.streams[0];
  }
};
