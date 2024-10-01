import React from "react";
import { IoIosClose } from "react-icons/io";

interface OutputSectionProps {
  output: string;
  setShowOutput: (show: boolean) => void;
}

const OutputSection: React.FC<OutputSectionProps> = ({ output, setShowOutput }) => {
  return (
    <div className="bg-gray-900 p-2 h-2/5 relative">
      <div className="flex justify-between items-center mb-2">
        <div className="text-md text-white">Output</div>
        <button
          onClick={() => setShowOutput(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <IoIosClose size={26} />
        </button>
      </div>
      <div
        id="output"
        className="bg-gray-800 text-white p-2 rounded-md h-[calc(100%-2rem)] border border-gray-600 overflow-y-auto"
      >
        <pre>{output}</pre>
      </div>
    </div>
  );
};

export default OutputSection;