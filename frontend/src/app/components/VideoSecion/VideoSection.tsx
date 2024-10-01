import React, { useRef, useEffect } from "react";

interface VideoSectionProps {
  localStream: MediaStream | null;
  showChat: boolean;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
}

const VideoSection: React.FC<VideoSectionProps> = ({ localStream, showChat ,remoteVideoRef}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <div className={`${showChat ? 'w-[20%]' : 'w-[20%]'} flex flex-col p-2 transition-all duration-300`}>
      <video
        className="w-full h-1/2 mb-2 rounded-lg object-cover"
        autoPlay
        muted
        ref={localVideoRef}
      />
      <video
        className="w-full h-1/2 mb-2 rounded-lg object-cover"
        autoPlay
        muted
        ref={remoteVideoRef}
      />
    </div>
  );
};

export default VideoSection;