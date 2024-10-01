import axios from "axios";

const API = axios.create({
    baseURL: "https://emkc.org/api/v2/piston", 
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

    
    console.log("Response:", response.data);
    return response.data
 
}
const runcode = async (codefromtext) => {
  // let codefromtext = document.getElementById('text-area').value;
  let output = document.getElementById('output');
  try{
      const{run:result}=await executecode(codefromtext)
      return result.output
  }catch(error){
      console.log("errorrrr :- ",error)
  }
};

export default runcode;
