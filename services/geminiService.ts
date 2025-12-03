
import { GoogleGenAI, Chat } from "@google/genai";
import { Language, TalentStrategyStructured, OutreachOption, CandidatePersona, CandidateAnalysisStructured, InterviewQuestionsStructured } from "../types";

// Helper to get language name for prompts
const getLangName = (lang: Language) => {
  switch (lang) {
    case 'en': return 'English';
    case 'ja': return 'Japanese';
    case 'ko': return 'Korean';
    case 'zh-TW': 
    default: return 'Traditional Chinese (繁體中文)';
  }
};

// Check if a valid API key is available without throwing
export const hasValidApiKey = (): boolean => {
    const localKey = localStorage.getItem('user_gemini_api_key');
    const envKey = process.env.API_KEY;
    return !!(localKey || envKey);
};

// Helper to get API Key with BYOK support
const getAPIKey = (): string => {
  const localKey = localStorage.getItem('user_gemini_api_key');
  // Use local key if available, otherwise fall back to environment variable
  const key = localKey || process.env.API_KEY;
  
  if (!key) {
    console.error("API Key is missing. Please set it in Settings or Environment Variables.");
    throw new Error("API Key is missing. Please set it in Settings.");
  }
  return key;
};

const getAI = () => new GoogleGenAI({ apiKey: getAPIKey() });

export const generateJobDescription = async (
  language: Language,
  title: string, 
  skills: string, 
  seniority: string, 
  culture: string,
  fileContent: string = ""
): Promise<{ platform: string; social: string }> => {
  const ai = getAI();
  const langName = getLangName(language);

  const prompt = `
    Act as a professional HR Consultant and Recruitment Marketing Expert. 
    Create a Job Description based on the following inputs.

    [User Inputs]
    Title: ${title}
    Seniority: ${seniority}
    Skills: ${skills}
    Company Culture: ${culture}

    [Reference Document Content] (This may contain raw notes from hiring managers):
    "${fileContent.substring(0, 10000)}"

    ---
    
    You need to generate TWO distinct versions of the content:

    VERSION 1: FORMAL RECRUITMENT PLATFORM (e.g., 104, LinkedIn, CakeResume)
    - Structure: Role Summary, Key Responsibilities, Requirements, Nice to Have, Company Benefits.
    - Tone: Professional, Structured, Clear.

    VERSION 2: SOCIAL MEDIA MARKETING (e.g., Facebook, Instagram, LinkedIn Post)
    - Structure: Catchy Hook/Headline, Emojis, Key Selling Points, Call to Action (CTA).
    - Tone: Engaging, Energetic, Viral-friendly.

    ---
    CRITICAL OUTPUT FORMAT INSTRUCTION:
    1. Output strictly in ${langName}.
    2. Output Version 1 first.
    3. Insert the separator "|||SPLIT|||" exactly between Version 1 and Version 2.
    4. Output Version 2 after the separator.
    5. Do not add any other conversational text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = response.text || "";
    const parts = text.split("|||SPLIT|||");

    return {
      platform: parts[0]?.trim() || "Generation failed for Platform version.",
      social: parts[1]?.trim() || "Generation failed for Social Media version."
    };

  } catch (error: any) {
    console.error("JD Generation Error:", error);
    return {
      platform: `Error: Failed to generate JD. (${error.message || error})`,
      social: ""
    };
  }
};

export const generateOutreachMessage = async (
  language: Language,
  candidateName: string,
  position: string,
  company: string,
  tone: string,
  points: string,
  resumeText: string = "",
  jdText: string = ""
): Promise<OutreachOption[]> => {
  const ai = getAI();
  const langName = getLangName(language);

  const prompt = `
    Act as a Senior Headhunter. Write 3 different outreach messages (LinkedIn InMail or Email).
    
    [Basic Info]
    Candidate Name: ${candidateName}
    Target Role: ${position}
    Client/Company: ${company}
    Tone: ${tone}
    Key Selling Points: ${points}

    [Context Documents]
    1. Candidate Resume Content:
    "${resumeText.substring(0, 8000)}"
    
    2. Job Description (JD):
    "${jdText.substring(0, 8000)}"

    ---
    INSTRUCTIONS:
    1. Analyze the match between the [Candidate Resume] and [Job Description].
    2. In the emails, SPECIFICALLY mention why they are a good fit based on their actual experience found in the resume (e.g., "I saw your experience with [Skill] at [Company]...").
    3. Connect their background to the JD requirements.
    
    Provide these 3 options:
    1. Short & Punchy (Direct, respectful of time, high-impact)
    2. Detailed & Value-Driven (Focus on career growth, matching skills to JD, and selling points)
    3. Question-Based Approach (Soft opener to start conversation based on a specific project/skill in their resume)
    
    IMPORTANT: 
    1. Output the response strictly in ${langName}.
    2. Output MUST be a valid JSON array.
    
    JSON Schema:
    [
      {
        "type": "Short & Punchy",
        "subject": "Email Subject Line Here",
        "content": "Email Body Content Here (Markdown supported)"
      },
      {
        "type": "Detailed & Value-Driven",
        "subject": "Email Subject Line Here",
        "content": "Email Body Content Here"
      },
      {
        "type": "Question-Based",
        "subject": "Email Subject Line Here",
        "content": "Email Body Content Here"
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = response.text || "";
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/) || [null, text];
    let jsonString = jsonMatch[1] || text;
    
    const firstBracket = jsonString.indexOf('[');
    const lastBracket = jsonString.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
        jsonString = jsonString.substring(firstBracket, lastBracket + 1);
    }

    try {
        const options: OutreachOption[] = JSON.parse(jsonString);
        return options;
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        return [
            { type: "Error", subject: "Error parsing response", content: text }
        ];
    }
  } catch (error) {
    console.error("Outreach Generation Error:", error);
    return [];
  }
};

export const generateInterviewQuestions = async (
  language: Language,
  jobDescription: string, 
  resumeText?: string
): Promise<InterviewQuestionsStructured | null> => {
  const ai = getAI();
  const langName = getLangName(language);
  let prompt = '';

  if (resumeText) {
    prompt = `
      Based on the provided [Job Description] and [Candidate Resume], generate a highly customized interview guide.
      
      [Job Description]:
      "${jobDescription.substring(0, 10000)}..."

      [Candidate Resume]:
      "${resumeText.substring(0, 10000)}..."

      OUTPUT FORMAT:
      You MUST output a valid JSON object strictly in ${langName}.

      JSON Schema:
      {
        "resumeDeepDive": ["Question 1", "Question 2", "Question 3"], // 3-4 probing questions verifying specific experiences in resume
        "gapAnalysis": ["Question 1", "Question 2", "Question 3"], // 3-4 questions addressing skills required in JD but missing/weak in resume
        "behavioralQuestions": ["Question 1", "Question 2", "Question 3"] // 2-3 questions based on soft skills/culture
      }
    `;
  } else {
    prompt = `
      Analyze the following Job Description (JD) and generate a structured interview guide.
      
      JD Content:
      "${jobDescription.substring(0, 8000)}..."
      
      OUTPUT FORMAT:
      You MUST output a valid JSON object strictly in ${langName}.

      JSON Schema:
      {
        "resumeDeepDive": ["Question 1", "Question 2", "Question 3"], // Since no resume, create 3 generic technical/experience deep dive questions based on JD requirements
        "gapAnalysis": ["Question 1", "Question 2", "Question 3"], // Focus on "Tell me about a time you had to learn [Skill]..." types
        "behavioralQuestions": ["Question 1", "Question 2", "Question 3"] // 3 culture fit questions
      }
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = response.text || "";
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
    let jsonString = jsonMatch ? jsonMatch[1] : text;
    
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(jsonString) as InterviewQuestionsStructured;

  } catch (error: any) {
    console.error("Interview Question Error:", error);
    return null;
  }
};

export const analyzeCandidateMatch = async (
  language: Language,
  jobDescription: string, 
  resumeText: string
): Promise<CandidateAnalysisStructured | null> => {
  const ai = getAI();
  const langName = getLangName(language);

  const prompt = `
    Act as a strict Recruitment Manager. Compare the [Job Description] and [Candidate Resume] to provide a fit analysis.

    [Job Description]:
    "${jobDescription.substring(0, 10000)}..."

    [Candidate Resume]:
    "${resumeText.substring(0, 10000)}..."

    OUTPUT FORMAT:
    You MUST output a valid JSON object strictly in ${langName}.

    JSON Schema:
    {
      "score": number, // 0-100
      "summary": "string", // A one-sentence summary of the fit
      "recommendation": "Strong Hire" | "Hire" | "Hold" | "Reject",
      "reasoning": "string", // Why this recommendation?
      "strengths": ["string", "string", ...], // Top 3-5 strengths
      "weaknesses": ["string", "string", ...], // Top 3-5 weaknesses/risks
      "interviewQuestions": ["string", "string", ...] // 3-5 Specific questions to ask based on this analysis
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = response.text || "";
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
    let jsonString = jsonMatch ? jsonMatch[1] : text;
    
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(jsonString) as CandidateAnalysisStructured;

  } catch (error: any) {
    console.error("Candidate Analysis Error:", error);
    return {
        score: 0,
        summary: `Analysis Failed: ${error.message}. Please try again with shorter text or check content.`,
        recommendation: "Hold",
        reasoning: "API Error occurred.",
        strengths: [],
        weaknesses: [],
        interviewQuestions: []
    };
  }
};

export const suggestSkillsFromTitle = async (
  language: Language,
  jobTitle: string
): Promise<string> => {
  const ai = getAI();
  const langName = getLangName(language);

  const prompt = `
    You are an expert Headhunter. 
    Based on the job title: "${jobTitle}", list the top 8 most important and standard technical skills or keywords (Tech Stack) required for this role in ${langName}.
    
    Output strictly as a comma-separated list. No other text.
    Example output: React, TypeScript, Node.js, AWS, CI/CD, Git
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Skill Suggestion Error:", error);
    return "";
  }
};

export const generateTalentSearchStrategy = async (
  language: Language,
  jobTitle: string,
  skills: string,
  location: string = "Taiwan"
): Promise<TalentStrategyStructured | null> => {
  const ai = getAI();
  const langName = getLangName(language);

  const prompt = `
    Act as a Senior Headhunter and Recruitment Strategist.
    I am looking for: "${jobTitle}"
    Required Skills: "${skills}"
    Location: "${location}"

    Please perform a deep search to find real-time market information.
    
    1. **Channel Strategy**: What are the best 3-5 platforms/communities to find these specific talents?
    2. **Company Hunting List**: Use Google Search to find at least 8-10 specific companies in ${location} that employ this type of talent. Look for companies with similar tech stacks, competitors, or tech-famous companies.
    3. **Boolean Search Strings**: Provide 3 Boolean Search Strings (Broad, Specific, Niche) for LinkedIn.

    CRITICAL: You MUST use the Google Search tool to find actual, real-world companies.
    
    OUTPUT FORMAT:
    You must output a single valid JSON object inside a code block \`\`\`json ... \`\`\`.
    The content MUST be in ${langName}.
    
    JSON Schema:
    {
      "channelStrategy": ["string", "string", ...],
      "companyHuntingList": [
        { "name": "Company Name", "reason": "Why this company is a good target" },
        ...
      ],
      "booleanStrings": [
        { "label": "Broad Search", "query": "boolean string here" },
        { "label": "Specific Search", "query": "boolean string here" },
        { "label": "Niche Search", "query": "boolean string here" }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => ({
        title: chunk.web?.title || "Source",
        uri: chunk.web?.uri || "#"
      }))
      .filter((s: any) => s.uri !== "#") || [];

    const text = response.text || "";
    
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
    let jsonString = jsonMatch ? jsonMatch[1] : text;
    
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }

    let parsedData: TalentStrategyStructured;
    try {
        const rawData = JSON.parse(jsonString);
        parsedData = {
            channelStrategy: rawData.channelStrategy || [],
            companyHuntingList: rawData.companyHuntingList || [],
            booleanStrings: rawData.booleanStrings || [],
            sources: sources
        };
    } catch (e) {
        console.error("Failed to parse JSON response:", e);
        parsedData = {
            channelStrategy: ["解析錯誤：AI 回傳格式不正確，請重試。"],
            companyHuntingList: [],
            booleanStrings: [],
            sources: sources
        };
    }

    return parsedData;

  } catch (error) {
    console.error("Talent Search Error:", error);
    return null;
  }
};

export const generateCandidatePersona = async (
  language: Language,
  jdText: string
): Promise<CandidatePersona | null> => {
  const ai = getAI();
  const langName = getLangName(language);

  const prompt = `
    Act as a World-Class Recruitment Marketing Expert.
    Analyze the following Job Description (JD) and create a detailed "Candidate Persona" (人才畫像).
    
    [Job Description]:
    "${jdText.substring(0, 10000)}"

    ---

    OUTPUT INSTRUCTIONS:
    1. Output strictly in ${langName}.
    2. Output MUST be a valid JSON object.
    
    The Persona MUST include these 7 specific dimensions:
    1. Work Type (工作類型): e.g. Remote, High-pressure, Team-oriented.
    2. Talent Traits (人才特質): e.g. Analytical, Resilient, Creative.
    3. Professional Skills (專業技能): Technical or Hard Skills.
    4. Values (價值觀): What do they care about? e.g. Growth, Stability, Social Impact.
    5. Background (人才背景): Education, Experience level, Target Industries.
    6. Sourcing Channels (尋才來源): Where to find them?
    7. Keywords (關鍵字): SEO or Search keywords for this role.

    JSON Schema:
    {
      "archetype": "A creative title for this persona (e.g. 'The Coding Wizard')",
      "quote": "A first-person quote that represents their mindset",
      "bio": "A 2-3 sentence narrative describing who they are",
      
      "workType": ["string", "string"],
      "traits": ["string", "string"],
      "skills": ["string", "string"],
      "values": ["string", "string"],
      "background": {
         "education": "string",
         "experience": "string",
         "industries": ["string", "string"]
      },
      "channels": ["string", "string"],
      "keywords": ["string", "string"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || "";
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```([\s\S]*?)```/);
    let jsonString = jsonMatch ? jsonMatch[1] : text;
    
    const firstBrace = jsonString.indexOf('{');
    const lastBrace = jsonString.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(jsonString) as CandidatePersona;

  } catch (error) {
    console.error("Persona Generation Error:", error);
    return null;
  }
};

export const createAgentChat = (language: Language): Chat => {
  const ai = getAI();
  const langName = getLangName(language);
  
  const AGENT_SYSTEM_INSTRUCTION = `
    You are RecruitAI, a top-tier Recruitment Consultant and HR Strategy Expert.
    Your goal is to assist Headhunters and HR professionals.
    You are expert in recruitment trends, salary negotiation, Boolean Search Strings, and interview techniques.
    
    CRITICAL INSTRUCTION: You MUST answer the user in ${langName} language.
    Keep answers professional, concise, and actionable.
  `;

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: AGENT_SYSTEM_INSTRUCTION,
    },
  });
};
