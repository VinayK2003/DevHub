import React from "react";
import dynamic from "next/dynamic";
import { OnChange } from "@monaco-editor/react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  codeRef: React.MutableRefObject<WebSocket | null>;
  showChat: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, setCode, codeRef, showChat }) => {
  const handleEditorChange: OnChange = (newValue) => {
    if (newValue !== undefined) {
      setCode(newValue);
      if (codeRef.current?.readyState === WebSocket.OPEN) {
        codeRef.current.send(newValue);
      }
    }
  };

  return (
    <div className={`${showChat ? 'w-[60%]' : 'w-[80%]'} p-2 transition-all duration-300`}>
      <MonacoEditor
        height="100%"
        defaultLanguage="javascript"
        theme="vs-dark"
        value={code}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
        }}
      />
    </div>
  );
};

export default CodeEditor;