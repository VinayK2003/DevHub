import React, { useRef, useEffect } from "react";

interface VideoSectionProps {
  localStream: MediaStream | null;
  showChat: boolean;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
}

const VideoSection: React.FC<VideoSectionProps> = ({ localStream, showChat, remoteVideoRef }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <div
      className={`${
        showChat ? "w-[20%]" : "w-[20%]"
      } flex flex-col p-2 transition-all duration-300`}
    >
      {/* Local preview — muted to prevent audio feedback */}
      <video
        className="w-full h-1/2 mb-2 rounded-lg object-cover"
        autoPlay
        muted
        ref={localVideoRef}
      />
      {/* Remote participant — NOT muted so audio is audible */}
      <video
        className="w-full h-1/2 mb-2 rounded-lg object-cover"
        autoPlay
        ref={remoteVideoRef}
      />
    </div>
  );
};

export default VideoSection;
