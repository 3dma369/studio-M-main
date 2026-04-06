import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiAssistant {
  private genAI: GoogleGenerativeAI;
  
  constructor() {
    // In Vite projects, process.env is usually not defined, so we check process.env or import.meta.env
    const key = (process.env.GEMINI_API_KEY || "AIzaSy_Placeholder");
    this.genAI = new GoogleGenerativeAI(key);
  }

  async getRecommendations(userInput: string) {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: "You are the AI assistant for Molina Multimedia Studio. Guide users to our Dating, Toys, or Food programs. Eric A. Molina Denegri is the founder."
      });
      
      const result = await model.generateContent(`User Input: "${userInput}". Recommend a program and shop item.`);
      const response = await result.response;
      return response.text();
    } catch (error) {
       console.error("Gemini Error:", error);
       return "Connecting to the studio's creative AI... Discover 'TOY VERSES' or 'DATE ME' in our originals!";
    }
  }
}
