import React, { useState } from "react";
import dynamic from "next/dynamic";
import { OnChange } from "@monaco-editor/react";
import { LANGUAGE_VERSIONS } from "../Navbar/Languages";
import { FaWandMagicSparkles } from "react-icons/fa6";
import { BsFillSendFill } from "react-icons/bs";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const Language = Object.entries(LANGUAGE_VERSIONS);

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  codeRef: React.MutableRefObject<WebSocket | null>;
  showChat: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, setCode, codeRef, showChat }) => {
  const [isTextBoxOpen, setIsTextBoxOpen] = useState(false);
  const [textBoxValue, setTextBoxValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEditorChange: OnChange = (newValue) => {
    if (newValue !== undefined) {
      setCode(newValue);
      if (codeRef.current?.readyState === WebSocket.OPEN) {
        codeRef.current.send(newValue);
      }
    }
  };

  const handleIconClick = () => {
    setIsTextBoxOpen((prev) => !prev);
    setError(null);
  };

  const handleTextBoxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextBoxValue(e.target.value);
    setError(null);
  };

  const handleSendClick = async () => {
    if (!textBoxValue.trim()) {
      setError("Please enter a prompt");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Detailed logging of request
      console.log('Sending request with prompt:', textBoxValue);

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: textBoxValue,
        }),
      });

      // Enhanced logging
      console.log('Full Response Details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Comprehensive error handling
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Detailed Error Response:', {
          status: response.status,
          errorText: errorText
        });
        throw new Error(`API Error: ${response.status} - ${errorText || 'Unknown error'}`);
      }

      // Safe JSON parsing
      const data = await response.json();
      console.log('Parsed Response Data:', data);

      // Validate response
      if (!data || !data.generatedCode) {
        throw new Error("No generated code found in the response");
      }

      // Update editor content
      const generatedCode = data.generatedCode;
      setCode(generatedCode);

      // Broadcast the generated code if WebSocket is active
      if (codeRef.current?.readyState === WebSocket.OPEN) {
        codeRef.current.send(generatedCode);
      }

      setTextBoxValue(""); // Clear the text box
    } catch (error) {
      console.error('Comprehensive Client-Side Error:', error);
      
      // Detailed error handling
      if (error instanceof Error) {
        setError(error.message);
      } else if (typeof error === 'string') {
        setError(error);
      } else {
        setError("An unexpected error occurred during API call");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`${showChat ? "w-[60%]" : "w-[80%]"} p-2 transition-all duration-300 relative`}>
      <MonacoEditor
        height="100%"
        defaultLanguage={Language[0][0]}
        theme="vs-dark"
        value={code}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
        }}
      />
      <div className="absolute bottom-4 left-4">
        <FaWandMagicSparkles
          onClick={handleIconClick}
          className="text-2xl cursor-pointer text-white hover:text-blue-500 transition"
        />
        {isTextBoxOpen && (
          <div className="flex flex-col mt-2">
            <div className="flex items-center bg-gray-800 text-white p-2 rounded shadow-md">
              <input
                type="text"
                value={textBoxValue}
                onChange={handleTextBoxChange}
                className="w-48 p-1 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter prompt here..."
                disabled={isLoading}
              />
              <BsFillSendFill
                onClick={handleSendClick}
                className={`text-xl cursor-pointer ml-2 transition ${
                  isLoading ? "text-gray-500 cursor-not-allowed" : "hover:text-green-500"
                }`}
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm mt-1 bg-gray-800 p-1 rounded">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;