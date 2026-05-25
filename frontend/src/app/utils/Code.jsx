import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8080",
});

const executecode = async (language, codefromtext) => {
  const response = await API.post("/run-code", {
    language,
    code: codefromtext,
  });
  return response.data;
};

const runcode = async (language, codefromtext) => {
  try {
    const result = await executecode(language, codefromtext);
    if (result.error) {
      return result.output ? `${result.output}\n${result.error}` : result.error;
    }
    return result.output ?? "";
  } catch (error) {
    return "Execution failed";
  }
};

export default runcode;
