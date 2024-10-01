
export const openCamera = async (setLocalStream: (stream: MediaStream) => void) => {
  if ("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setLocalStream(stream);
    } catch (error) {
      console.log("getUserMedia error:", error);
    }
  }
};

export const initiateMeeting = async (
  meetingCode: string,
  socketRef: React.MutableRefObject<WebSocket | null>,
  peerRef: React.MutableRefObject<RTCPeerConnection | null>,
  localStream: MediaStream | null,
  remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>
) => {
  let roomId = meetingCode;

  if (!roomId) {
    console.log("creating a meeting");
    const response = await fetch("http://localhost:8080/create-room");
    const data = await response.json();
    roomId = data.room_id;
  }

  const socket = new WebSocket(
    `ws://${window.location.hostname}:8080/join-room?roomID=${roomId}`
  );
  socketRef.current = socket;

  socket.addEventListener("open", () => {
    console.log("Room WebSocket connection established");
    socket.send(JSON.stringify({ join: true }));
  });

  socket.addEventListener("message", async (e) => {
    const message = JSON.parse(e.data);
    console.log("Received message:", message);

    if (message.join) {
      console.log("Someone just joined the call");
      callUser(peerRef, localStream, socket, socketRef, remoteVideoRef);
    }

    if (message.iceCandidate && peerRef.current) {
      try {
        await peerRef.current.addIceCandidate(message.iceCandidate);
      } catch (error) {
        console.log("Error adding ICE candidate:", error);
      }
    }

    if (message.offer) {
      handleOffer(message.offer, socket, peerRef, localStream, socketRef, remoteVideoRef);
    }

    if (message.answer) {
      handleAnswer(message.answer, peerRef.current);
    }
  });

  return roomId;
};

const createPeer = (
  socketRef: React.MutableRefObject<WebSocket | null>, 
  remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>,
  peerRef: React.MutableRefObject<RTCPeerConnection | null>
) => {
  console.log("creating peer connection");
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
  socket: WebSocket,
  socketRef: React.MutableRefObject<WebSocket | null>,
  remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>
) => {
  console.log("calling other remote user");
  peerRef.current = createPeer(socketRef, remoteVideoRef,peerRef);

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
) => {
  console.log("received an offer, creating an answer");
  peerRef.current = createPeer(socketRef, remoteVideoRef,peerRef);
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
) => {
  if (peer) {
    peer.setRemoteDescription(new RTCSessionDescription(answer));
  }
};

const handleNegotiationNeeded = async (
  peerRef: React.MutableRefObject<RTCPeerConnection | null>,
  socketRef: React.MutableRefObject<WebSocket | null>
) => {
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

const handleIceCandidate = (e: RTCPeerConnectionIceEvent, socketRef: React.MutableRefObject<WebSocket | null>) => {
  console.log("found ice candidate");
  if (e.candidate) {
    socketRef.current?.send(JSON.stringify({ iceCandidate: e.candidate }));
  }
};

const handleTrackEvent = (e: RTCTrackEvent, remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>) => {
  console.log("Received tracks");
  if (remoteVideoRef.current) {
    remoteVideoRef.current.srcObject = e.streams[0];
  }
};
