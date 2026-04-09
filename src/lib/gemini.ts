import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function breakdownTask(taskTitle: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Bạn là một học giả thông thái trong một thư viện cổ. Bạn có kinh nghiệm quản lý dự án và nghề nghiệp của một chuyên gia hơn 20 năm kinh nghiệm. Hãy giúp tôi chia nhỏ mục tiêu học tập sau đây thành 5-7 bước cụ thể, khả thi và mang tính thực tiễn cao: "${taskTitle}". 
      Hãy trả về kết quả dưới dạng danh sách các chuỗi (JSON array of strings), không kèm theo văn bản giải thích nào khác.`,
    });

    const text = response.text || "";
    
    // Clean up the response to ensure it's valid JSON
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as string[];
    }
    return [];
  } catch (error) {
    console.error("AI Breakdown Error:", error);
    return [];
  }
}
