import { GoogleGenAI } from "@google/genai";

const resolveApiKey = (): string | undefined => {
  // Vite 환경 변수 우선 확인 (import.meta.env)
  // Vercel 등 배포 환경에서는 빌드 타임에 주입됩니다.
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  
  if (apiKey) return apiKey;

  // 로컬/기타 환경에 대한 폴백
  const p: any = typeof process !== 'undefined' ? process : undefined;
  return p?.env?.API_KEY || p?.env?.GEMINI_API_KEY;
};

const getClient = () => {
  const key = resolveApiKey();
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
};

export const generateDocumentContent = async (templateName: string, keywords: string) => {
  try {
    const client = getClient();
    if (!client) {
      return "AI 키가 설정되지 않았습니다. .env.local에 키를 설정해 주세요.";
    }
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `전자결재 문서의 내용을 작성해주세요. 
      템플릿 종류: ${templateName}
      포함할 핵심 키워드: ${keywords}
      
      형식: 전문적인 비즈니스 문체로 작성하고, 목적, 세부 내용, 기대 효과 순서로 정리해주세요. 한국어로 작성하세요.
      주의사항: 마크다운 문법(#, *, - 등)은 절대 사용하지 말고, 평범한 텍스트로 작성해주세요. 번호 매기기가 필요하면 '1.', '2.' 형식을 사용하세요.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 생성에 실패했습니다. 직접 내용을 입력해주세요.";
  }
};

export const summarizeDocument = async (content: string) => {
  try {
    const client = getClient();
    if (!client) {
      return "요약 실패(키 미설정)";
    }
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `다음 전자결재 문서를 한 문장으로 요약해주세요: \n\n${content}`,
    });
    return response.text;
  } catch (error) {
    return "요약 실패";
  }
};
