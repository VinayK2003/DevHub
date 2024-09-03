import React, { useRef } from 'react';
import Editor, { DiffEditor, useMonaco, loader } from '@monaco-editor/react';
import axios from "axios";

const API = axios.create({
    baseURL: "https://emkc.org/api/v2/piston", // Fixed the typo 'baseurl' to 'baseURL'
});
const executecode=async (codefromtext)=>{
    const response = await API.post("/execute", {
      "language": "javascript",
      "version": "18.15.0",
      "files": [
        {
          "content": codefromtext
        },
      ],
    });

    // Handle and display the output
    console.log("Response:", response.data);
    return response.data
 
}
const runcode = async (codefromtext) => {
  // Get the value from the text area
  // let codefromtext = document.getElementById('text-area').value;
  let output = document.getElementById('output');
  try{
      const{run:result}=await executecode(codefromtext)
      output.innerText=result.output
  }catch(error){
      console.log("errorrrr",error)
  }
};

export default runcode;
