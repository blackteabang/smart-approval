import { GoogleGenerativeAI } from "@google/generative-ai";

const resolveApiKey = (): string | undefined => {
  // 1. Try Local Storage (User Settings)
  if (typeof localStorage !== 'undefined') {
    const localKey = localStorage.getItem('smartapprove_ai_key');
    if (localKey) return localKey;
  }

  // 2. Try Environment Variables
  const p: any = typeof process !== 'undefined' ? process : undefined;
  const fromProcess = p?.env?.API_KEY as string | undefined;
  const ie: any = typeof import.meta !== 'undefined' ? import.meta : undefined;
  const fromVite = ie?.env?.VITE_GEMINI_API_KEY as string | undefined;
  const fromGemini = ie?.env?.GEMINI_API_KEY as string | undefined;
  return fromProcess || fromVite || fromGemini;
};

const getClient = () => {
  const key = resolveApiKey();
  if (!key) return null;
  // Use user provided key or fallback to env key
  return new GoogleGenerativeAI(key);
};

export const generateDocumentContent = async (templateName: string, keywords: string) => {
  try {
    const client = getClient();
    if (!client) {
      return "AI 키가 설정되지 않았습니다. 관리자 설정에서 키를 입력하거나 .env 파일에 키를 설정해 주세요.";
    }
    
    // Call API (using generateContent)
    // Fallback to 'gemini-pro' if 'gemini-1.5-flash' is not found in v1beta
    const model = client.getGenerativeModel({ model: "gemini-pro" }); 
    
    const result = await model.generateContent(`
      전자결재 문서의 내용을 작성해주세요. 
      템플릿 종류: ${templateName}
      포함할 핵심 키워드: ${keywords}
      
      형식: 전문적인 비즈니스 문체로 작성하고, 목적, 세부 내용, 기대 효과 순서로 정리해주세요. 한국어로 작성하세요.
    `);
    
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `AI 생성에 실패했습니다. (오류: ${error instanceof Error ? error.message : '알 수 없는 오류'})`;
  }
};

export const summarizeDocument = async (content: string) => {
  try {
    const client = getClient();
    if (!client) return "요약 실패(키 미설정)";
    
    const model = client.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(`다음 전자결재 문서를 한 문장으로 요약해주세요: \n\n${content}`);
    const response = await result.response;
    return response.text();
  } catch (error) {
    return "요약 실패";
  }
};
