import { GoogleGenAI } from "@google/genai";

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export async function breakdownTask(taskTitle: string) {
  if (!ai) {
    console.warn("Gemini API Key is missing. AI features are disabled.");
    return [];
  }
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

export async function decomposeGoal(goalTitle: string, level: string, targetValue: number, unit: string) {
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Bạn là một vị sư phụ thông thái. Đệ tử có một mục tiêu lớn: "${goalTitle}" với giá trị mục tiêu là ${targetValue} ${unit} cho cấp độ ${level}.
      Hãy giúp đệ tử chia nhỏ mục tiêu này thành các cấp độ thấp hơn (nếu là Năm thì chia thành 4 Quý, nếu là Quý thì chia thành 3 Tháng, nếu là Tháng thì chia thành 4 Tuần).
      
      YÊU CẦU QUAN TRỌNG:
      1. Trả về DUY NHẤT một mảng JSON các đối tượng.
      2. Mỗi đối tượng PHẢI có:
         - "title": tên mục tiêu con (ví dụ: "Quý 1: Khởi đầu nan")
         - "targetValue": giá trị mục tiêu con (PHẢI là số, tổng các targetValue của con nên xấp xỉ bằng targetValue của cha)
         - "description": lời khuyên ngắn gọn
      3. KHÔNG có văn bản giải thích, KHÔNG có markdown code blocks. Chỉ trả về mảng JSON bắt đầu bằng [ và kết thúc bằng ].`,
    });
    const text = response.text || "";
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return null;
  } catch (error) {
    console.error("AI Goal Decomposition Error:", error);
    return null;
  }
}
