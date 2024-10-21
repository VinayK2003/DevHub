import axios from "axios";
import {LANGUAGE_VERSIONS} from "../components/Navbar/Languages"

const API = axios.create({
    baseURL: "https://emkc.org/api/v2/piston", 
});
const executecode=async (language,codefromtext)=>{
    const response = await API.post("/execute", {
      "language": language,
      "version": LANGUAGE_VERSIONS[language],
      "files": [
        {
          "content": codefromtext
        },
      ],
    });

    
    console.log("Response:", response.data);
    return response.data
 
}
const runcode = async (language,codefromtext) => {
  // let codefromtext = document.getElementById('text-area').value;
  let output = document.getElementById('output');
  try{
      const{run:result}=await executecode(language,codefromtext)
      return result.output
  }catch(error){
      console.log("errorrrr :- ",error)
  }
};

export default runcode;
