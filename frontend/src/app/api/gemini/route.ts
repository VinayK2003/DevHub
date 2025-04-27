import type { NextApiRequest, NextApiResponse } from 'next'
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: "GEMINI_API_KEY" });
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
 try {
  console.log("req",req);
  console.log('Full Request:', {
    method: req.method,
    url: req.url,
    // headers: Object.fromEntries(req.headers),
  });

  // Parse the request body
  // const body = await req.json();
  // console.log('Request Body:', body);
 return NextResponse.json({message:"message Received"});}
 catch (error) {
  console.error('API Error:', error);
  return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
}
}

// Explicitly export the config to ensure proper routing
export const config = {
  api: {
    bodyParser: true,
  },
};