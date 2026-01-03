import { GoogleGenerativeAI } from "@google/generative-ai";

const getApiKey = () => {
    return localStorage.getItem("GEMINI_API_KEY") || import.meta.env.VITE_GEMINI_API_KEY;
};

export const setApiKey = (key) => {
    localStorage.setItem("GEMINI_API_KEY", key);
};

export const hasApiKey = () => {
    return !!getApiKey();
};

const getModel = (modelName = "gemini-3-flash-preview") => {
    const key = getApiKey();
    if (!key) throw new Error("API Key is missing. Please add it in the settings.");
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: modelName });
};

// Global fallback wrapper
const callAIFunc = async (prompt, text, modelName = "gemini-3-flash-preview") => {
    try {
        const key = getApiKey();
        if (!key || key.trim() === "") {
            throw new Error("No API key found. Please enter your Gemini API key in the settings.");
        }

        const model = getModel(modelName);
        const fullPrompt = `${prompt}\n\nContent:\n${text}`;
        const result = await model.generateContent(fullPrompt);
        return (await result.response).text();
    } catch (error) {
        if (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID")) {
            throw new Error("The API key you provided is invalid. Please double-check it at aistudio.google.com and ensure you copied it correctly without any extra characters.");
        }
        if (error.message.includes("404") && modelName !== "gemini-pro") {
            console.warn(`Model ${modelName} failed with 404, falling back to gemini-pro`);
            return callAIFunc(prompt, text.substring(0, 10000), "gemini-pro");
        }
        throw error;
    }
};

export const clearApiKey = () => {
    localStorage.removeItem("GEMINI_API_KEY");
};

export const generateSummary = async (text) => {
    const prompt = `Summarize the following PDF content in a professional manner. 
    Focus on key themes, main arguments, and important conclusions. 
    Use bullet points for clarity where appropriate. 
    Keep it concise but comprehensive.`;
    return callAIFunc(prompt, text.substring(0, 50000));
};

export const semanticSearch = async (query, text) => {
    const prompt = `Given the following PDF content, find the most relevant sections or information related to the query: "${query}".
    Return a list of relevant snippets, including the page numbers if available in the text.
    If no relevant information is found, state so.`;
    return callAIFunc(prompt, text.substring(0, 50000));
};

export const getSmartSuggestions = async (text) => {
    const prompt = `Based on the following PDF content, suggest 3 interesting questions or topics that a reader might want to explore further.
    Keep the suggestions short and engaging.`;
    return callAIFunc(prompt, text.substring(0, 50000));
};

export const generateStudyMaterial = async (text, type = "flashcards") => {
    let prompt = "";
    if (type === "flashcards") {
        prompt = `Based on the following PDF text, create 5-8 flashcards for active recall. 
        Each flashcard should have a 'Question' and an 'Answer'. 
        Return them in a clear, labeled format.`;
    } else if (type === "mcqs") {
        prompt = `Based on the following PDF text, create 5 multiple choice questions (MCQs). 
        Each question should have 4 options (A, B, C, D) and indicate the correct answer with a brief explanation.`;
    } else if (type === "viva") {
        prompt = `Based on the following PDF text, generate 5-10 viva/interview questions that test deep understanding of the core concepts. 
        Include a sample 'Ideal Answer' for each.`;
    }
    return callAIFunc(prompt, text.substring(0, 50000));
};

export const generateRevisionMode = async (text) => {
    const prompt = `Convert the following PDF content into a condensed revision sheet.
    Include:
    1. A "Key Concept Map" (summary of main ideas).
    2. A "Formula & Definitions" section (extract any formulas, equations, or critical definitions).
    3. A "Quick Review" checklist.`;
    return callAIFunc(prompt, text.substring(0, 50000));
};

export const generateSocialContent = async (text, platform = "linkedin") => {
    let prompt = "";
    if (platform === "linkedin") {
        prompt = `Create a professional LinkedIn post based on the following content extracted from a PDF. 
        Make it engaging, use relevant hashtags, and structure it for high readability. 
        Focus on insights and value for a professional network.`;
    } else if (platform === "twitter") {
        prompt = `Create an engaging Twitter/X thread (3-5 tweets) based on the following PDF content. 
        Use hook-based writing, emojis, and hashtags. 
        Ensure each tweet is under 280 characters.`;
    } else if (platform === "blog") {
        prompt = `Write a compelling blog post draft based on the following PDF content. 
        Include a catchy title, an introduction, subheadings for main points, and a conclusion.`;
    }
    return callAIFunc(prompt, text.substring(0, 50000));
};

export const generateWebsiteContent = async (text) => {
    const prompt = `Convert the following PDF content into a structured, responsive website layout (represented in clean Markdown/HTML compatible structure).
    Organize the content with a clear navigation hierarchy (H1, H2, H3).
    Add "Sidebars" for key definitions or callouts.
    Make it look like a modern documentation or blog site.`;
    return callAIFunc(prompt, text.substring(0, 50000));
};
