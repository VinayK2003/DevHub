import React, { useState } from "react";
import dynamic from "next/dynamic";
import { OnChange } from "@monaco-editor/react";
import { LANGUAGE_VERSIONS } from "../Navbar/Languages";
import { FaWandMagicSparkles } from "react-icons/fa6";
import { BsFillSendFill } from "react-icons/bs";
import { API_BASE } from "../../config/api";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const Language = Object.entries(LANGUAGE_VERSIONS);

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  codeRef: React.MutableRefObject<WebSocket | null>;
  showChat: boolean;
}

/**
 * Extracts the first fenced code block from a markdown string.
 * Falls back to the trimmed raw text if no code block is found.
 */
function extractCodeBlock(text: string, language?: string): string {
  const pattern = language
    ? new RegExp("```" + language + "\\n([\\s\\S]*?)```", "m")
    : /```[\w]*\n([\s\S]*?)```/m;
  const match = text.match(pattern);
  return match ? match[1].trim() : text.trim();
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

      const resp = await fetch(`${API_BASE}/api/generate-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textBoxValue }),
      });

      if (!resp.ok) {
        throw new Error(`API error: ${resp.status} ${resp.statusText}`);
      }

      const data = await resp.json() as { generatedCode?: string; error?: string };

      if (data.error) {
        throw new Error(data.error);
      }

      // Extract the clean code block and set it — not the raw markdown response.
      const cleaned = extractCodeBlock(data.generatedCode ?? "");
      setCode(cleaned);

      // Broadcast the generated code over the collaborative editor socket.
      if (codeRef.current?.readyState === WebSocket.OPEN) {
        codeRef.current.send(cleaned);
      }

      setTextBoxValue("");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendClick();
  };

  return (
    <div
      className={`${
        showChat ? "w-[60%]" : "w-[80%]"
      } p-2 transition-all duration-300 relative`}
    >
      <MonacoEditor
        height="100%"
        defaultLanguage={Language[0][0]}
        theme="vs-dark"
        value={code}
        onChange={handleEditorChange}
        options={{ minimap: { enabled: false }, fontSize: 14 }}
        onMount={(_editor, monaco) => {
          monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: true,
          });
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
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={textBoxValue}
                  onChange={handleTextBoxChange}
                  className="w-48 p-1 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter prompt here…"
                  disabled={isLoading}
                />
              </form>
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
