import { GoogleGenerativeAI } from "@google/generative-ai";

export const getApiKeys = () => {
    const keys = localStorage.getItem("GEMINI_API_KEYS");
    if (keys) return JSON.parse(keys);

    const primaryKey = localStorage.getItem("GEMINI_API_KEY") || import.meta.env.VITE_GEMINI_API_KEY;
    return primaryKey ? [primaryKey] : [];
};

export const setApiKey = (key) => {
    setApiKeys([key]);
};

export const setApiKeys = (keys) => {
    localStorage.setItem("GEMINI_API_KEYS", JSON.stringify(keys.filter(k => k && k.trim() !== "").slice(0, 5)));
};

export const hasApiKey = () => {
    return getApiKeys().length > 0;
};

const getModel = (key, modelName = "gemini-3-flash-preview") => {
    if (!key) throw new Error("API Key is missing.");
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: modelName });
};

// Global fallback wrapper with rotation for multiple keys
const callAIFunc = async (prompt, text, modelName = "gemini-3-flash-preview") => {
    const keys = getApiKeys();
    if (keys.length === 0) {
        throw new Error("No API keys found. Please enter your Gemini API keys in the settings.");
    }

    let lastError = null;

    // Try each key in sequence
    for (let i = 0; i < keys.length; i++) {
        try {
            const key = keys[i];
            const model = getModel(key, modelName);
            const fullPrompt = `${prompt}\n\nContent:\n${text}`;
            const result = await model.generateContent(fullPrompt);
            return (await result.response).text();
        } catch (error) {
            lastError = error;
            console.error(`API Key ${i + 1} failed:`, error.message);

            // If it's a quota error or internal error, try next key
            if (error.message.includes("429") || error.message.includes("quota") || error.message.includes("500")) {
                continue;
            }

            // If it's an invalid key and we have more, try next. Otherwise throw.
            if (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID")) {
                if (i === keys.length - 1) {
                    throw new Error("One or more API keys are invalid. Please check your settings.");
                }
                continue;
            }

            // For 404 on specific models, fallback but don't necessarily rotate key immediately unless it continues to fail
            if (error.message.includes("404") && modelName !== "gemini-3-flash-preview") {
                return callAIFunc(prompt, text.substring(0, 10000), "gemini-3-flash-preview");
            }

            // If we've exhausted all keys, throw the last error
            if (i === keys.length - 1) break;
        }
    }

    throw lastError || new Error("Failed to process request with available API keys.");
};

export const clearApiKey = () => {
    localStorage.removeItem("GEMINI_API_KEY");
    localStorage.removeItem("GEMINI_API_KEYS");
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

/**
 * Ask PDF with Context Awareness
 * Chat with PDF content using contextual understanding
 */
export const askPDFWithContext = async (question, context, selectedText = "", pageRange = "", persona = "Friendly Tutor") => {
    let personaInstructions = "";
    if (persona === "Strict Exam Coach") {
        personaInstructions = "Be rigorous, focus on exam efficiency, drill core concepts, and don't tolerate half-answers. Push the student to be precise.";
    } else if (persona === "Research Advisor") {
        personaInstructions = "Provide academic depth, cite sources meticulously, suggest related research directions, and use formal scholarly tone.";
    } else if (persona === "Explain Like I'm 12") {
        personaInstructions = "Use very simple language, relatable analogies, and avoid all technical jargon. Make it fun and easy.";
    } else {
        personaInstructions = "Be supportive, clear, and encouraging. Use a balanced tone suitable for a high-quality learning session.";
    }

    let prompt = `You are playing the role of a ${persona}. ${personaInstructions}
    
    You are helping a student understand PDF content. 
    
User Question: "${question}"

${pageRange ? `Page Range: ${pageRange}` : ''}
${selectedText ? `Selected Text:\n${selectedText}\n` : ''}

PDF Context:
${context}

Instructions:
1. Answer the question based on the provided context and your assigned persona.
2. If the selected text is provided, focus on it while using broader context for support.
3. Be concise but thorough.
4. Highlight relevant sections from the provided text in your answer.
5. If information is not in the provided context, clearly state that.
6. For complex topics, break down the explanation into digestible parts.`;

    const response = await callAIFunc(prompt, context.substring(0, 80000));
    return response;
};

/**
 * Explain concept at different levels
 */
export const explainConcept = async (text, concept, level = "intermediate") => {
    let prompt = "";

    if (level === "beginner") {
        prompt = `Explain the following concept in simple terms that a beginner can understand. Use analogies and everyday examples. Avoid jargon.
        
Concept: ${concept}`;
    } else if (level === "intermediate") {
        prompt = `Explain the following concept at an intermediate level. Assume basic understanding of the subject.
        
Concept: ${concept}`;
    } else if (level === "advanced") {
        prompt = `Provide an advanced explanation of the following concept with technical depth and nuance.
        
Concept: ${concept}`;
    }

    return callAIFunc(prompt, text.substring(0, 50000));
};

/**
 * Summarize specific pages
 */
export const summarizePageRange = async (text, startPage, endPage) => {
    const prompt = `Summarize the following content from pages ${startPage} to ${endPage} in a concise manner. 
    Focus on key points and main ideas.`;
    return callAIFunc(prompt, text.substring(0, 60000));
};

/**
 * Extract source with answer - tracks where information came from
 */
export const askPDFWithSourceTracking = async (question, context, selectedText = "") => {
    let prompt = `Answer the following question based on the PDF content. 
    
After your answer, provide a "SOURCE" section that indicates exactly where in the text this information came from.

Question: "${question}"

${selectedText ? `Selected Text:\n${selectedText}\n\n` : ''}

Content:
${context}

Format your response as:
[Your detailed answer here]

SOURCE:
[Specify the exact quote or page reference from the PDF that supports this answer]`;

    return callAIFunc(prompt, context.substring(0, 80000));
};
/**
 * Exam Blueprint Mode
 * Generates study plan and revision cycles based on exam target
 */
export const generateExamBlueprint = async (examName, examDate, pdfText) => {
    const prompt = `You are an expert exam strategist. Create a highly detailed study plan for the "${examName}" exam scheduled for ${examDate}.
    
    Based on the following content from study documents:
    ${pdfText.substring(0, 40000)}
    
    Tasks:
    1. Map the syllabus found in the text to major exam topics.
    2. Create a week-by-week study plan leading up to the exam.
    3. Define optimal revision cycles (e.g., Active Recall on Day 1, 3, 7, 14).
    4. Generate 3 high-probability mock questions.
    
    Return the response as a structured markdown report.`;

    return callAIFunc(prompt, pdfText.substring(0, 30000));
};

/**
 * Predictive Exam Readiness
 * Predicts scores and identifies weak spots
 */
export const predictExamReadiness = async (masteryData, filename) => {
    const prompt = `Based on the following student mastery data for the document "${filename}":
    ${JSON.stringify(masteryData)}
    
    Predict:
    1. Expected score range (0-100%).
    2. Top 3 weakest topics that need immediate attention.
    3. Estimated time needed to improve the overall score by 15%.
    4. A motivational tip based on their current progress.
    
    Be objective and data-driven.`;

    return callAIFunc(prompt, JSON.stringify(masteryData));
};

/**
 * Cross-PDF Insight Engine
 * Finds connections and contradictions across multiple sources
 */
export const getCrossPDFInsights = async (currentText, otherPdfsData) => {
    const otherContexts = otherPdfsData.map(d => `[Source: ${d.name}]\n${d.text.substring(0, 5000)}`).join('\n\n');

    const prompt = `You are analyzing multiple textbooks/documents simultaneously. 
    
    Primary Document Content:
    ${currentText.substring(0, 20000)}
    
    Other Source Contexts:
    ${otherContexts}
    
    Task:
    1. Identify if the same concept is explained differently or more intuitively in one of the other sources.
    2. Point out any contradictions or complementary information between these sources.
    3. Provide "Quick Jumps" e.g., "This theorem is explained more intuitively in Source B, Page 74."
    
    Format as a comparison report.`;

    return callAIFunc(prompt, currentText.substring(0, 20000));
};

/**
 * Equation Intelligence
 * Explains math/engineering formulas and derivations
 */
export const explainEquation = async (equationText, surroundingContext = "") => {
    const prompt = `You are an expert mathematician and engineer. 
    
    Selected Equation: "${equationText}"
    
    Context: "${surroundingContext.substring(0, 2000)}"
    
    Explain:
    1. The meaning and significance of this equation.
    2. A step-by-step derivation or logical breakdown.
    3. Real-world applications or where it's typically used later in studies.
    4. Any related equations or concepts.`;

    return callAIFunc(prompt, surroundingContext.substring(0, 5000));
};

/**
 * Personal Knowledge Graph Builder
 * Identifies concepts and their relationships (dependencies)
 */
export const buildKnowledgeGraph = async (text) => {
    const prompt = `Analyze the following text and extract a list of core concepts and their relationships.
    
    Identify:
    1. Concepts (as nodes).
    2. Dependencies (as links, e.g., \"Concept A is a pre-requisite for Concept B\", \"Concept C is related to Concept D\").
    
    Return the result as a JSON object with this structure:
    {
       \"nodes\": [ {\"id\": \"ConceptName\", \"description\": \"Short definition\"} ],
       \"links\": [ {\"source\": \"ConceptA\", \"target\": \"ConceptB\", \"type\": \"requires|related\"} ]
    }
    
    Only return the JSON.`;

    const response = await callAIFunc(prompt, text.substring(0, 40000));
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (e) {
        console.error("Failed to parse knowledge graph JSON", e);
        return { nodes: [], links: [] };
    }
};

/**
 * Estimate Concept Mastery
 * Analyzes behavior and interaction to score understanding
 */
export const estimateMastery = async (behaviorData, concepts) => {
    const prompt = `Based on the following student behavior data:\n` +
        JSON.stringify(behaviorData) +
        ` \n\nAnd these concepts extracted from the material: \n` +
        concepts.join(", ") +
        ` \n\nEstimate the student's mastery score (0-100%) for each concept.
    Consider:
    - Time spent on pages.
    - Number of questions asked.
    - Correctness in past flashcard attempts (if provided).
    
    Return a JSON object: { "ConceptName": score }`;

    const response = await callAIFunc(prompt, JSON.stringify(behaviorData));
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (e) {
        return {};
    }
};

/**
 * Citation & Reference Explorer
 * Extracts and maps paper citations
 */
export const extractCitations = async (text) => {
    const prompt = `Extract all academic references and citations from this text.
    For each citation, provide:
    1. The paper/book title.
    2. The authors.
    3. The year.
    4. A short snippet explaining where it's cited.
    
    Return as a JSON array of objects.`;

    const response = await callAIFunc(prompt, text.substring(0, 30000));
    try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (e) {
        return [];
    }
};
/**
 * Generate a premium interactive quiz
 */
export const generatePremiumQuiz = async (text) => {
    const prompt = `Based on the following content, generate 5 high-quality multiple choice questions for a pro-level exam.
    Return ONLY a JSON array of objects with this structure:
    [
      {
        "question": "The question text",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "answerIndex": 0,
        "explanation": "Why this is correct"
      }
    ]
    Ensure the questions test deep understanding.`;

    const response = await callAIFunc(prompt, text.substring(0, 40000));
    try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (e) {
        console.error("Failed to parse quiz JSON", e);
        return [];
    }
};

/**
 * Generate advanced quiz with difficulty and question type controls
 * @param {string} text - Source text
 * @param {string} difficulty - 'easy', 'medium', 'hard'
 * @param {string} questionType - 'mcq', 'truefalse', 'shortanswer'
 * @param {number} count - Number of questions
 */
export const generateAdvancedQuiz = async (text, difficulty = 'medium', questionType = 'mcq', count = 5) => {
    let difficultyInstructions = '';

    if (difficulty === 'easy') {
        difficultyInstructions = 'Focus on basic recall and simple concepts. Make questions straightforward with clear answers.';
    } else if (difficulty === 'medium') {
        difficultyInstructions = 'Focus on application and understanding. Questions should require connecting multiple concepts.';
    } else if (difficulty === 'hard') {
        difficultyInstructions = 'Focus on analysis, synthesis, and critical thinking. Questions should be challenging and require deep understanding.';
    }

    let typeInstructions = '';
    let responseFormat = '';

    if (questionType === 'mcq') {
        typeInstructions = 'Create multiple choice questions with 4 options each.';
        responseFormat = `[
  {
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answerIndex": 0,
    "explanation": "Detailed explanation of why this is correct",
    "difficulty": "${difficulty}"
  }
]`;
    } else if (questionType === 'truefalse') {
        typeInstructions = 'Create true/false questions with explanations.';
        responseFormat = `[
  {
    "question": "Statement to evaluate",
    "answer": true,
    "explanation": "Detailed explanation",
    "difficulty": "${difficulty}"
  }
]`;
    } else if (questionType === 'shortanswer') {
        typeInstructions = 'Create short answer questions requiring 1-3 sentence responses.';
        responseFormat = `[
  {
    "question": "Question text",
    "sampleAnswer": "Model answer",
    "keyPoints": ["Key point 1", "Key point 2"],
    "difficulty": "${difficulty}"
  }
]`;
    }

    const prompt = `You are an expert educator creating ${difficulty} difficulty ${questionType} questions.

${difficultyInstructions}
${typeInstructions}

Generate ${count} questions based on this content.

Return ONLY a JSON array in this exact format:
${responseFormat}

Make questions relevant, clear, and properly formatted.`;

    const response = await callAIFunc(prompt, text.substring(0, 50000));
    try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (e) {
        console.error("Failed to parse advanced quiz JSON", e);
        return [];
    }
};

/**
 * Generate academic citation in specified format
 * @param {string} text - Document text (for analysis)
 * @param {string} format - 'apa', 'mla', 'chicago'
 * @param {Object} pageRange - { start, end }
 * @param {Object} metadata - { title, author, year, publisher }
 */
export const generateCitation = async (text, format = 'apa', pageRange = null, metadata = {}) => {
    const { title = 'Untitled Document', author = 'Unknown Author', year = new Date().getFullYear(), publisher = 'N/A' } = metadata;

    const pageRef = pageRange ? `pp. ${pageRange.start}-${pageRange.end}` : '';

    let formatInstructions = '';

    if (format === 'apa') {
        formatInstructions = `APA 7th Edition format:
Author, A. A. (Year). Title of work. Publisher. ${pageRef}

Example:
Smith, J. D. (2023). Understanding Neural Networks. Academic Press. pp. 45-67`;
    } else if (format === 'mla') {
        formatInstructions = `MLA 9th Edition format:
Author Last, First. Title of Work. Publisher, Year. ${pageRef}

Example:
Smith, John David. Understanding Neural Networks. Academic Press, 2023. pp. 45-67`;
    } else if (format === 'chicago') {
        formatInstructions = `Chicago 17th Edition format:
Author Last, First. Year. Title of Work. Publisher. ${pageRef}

Example:
Smith, John David. 2023. Understanding Neural Networks. Academic Press. pp. 45-67`;
    }

    const prompt = `Generate a proper academic citation in ${format.toUpperCase()} format.

${formatInstructions}

Document Information:
- Title: ${title}
- Author: ${author}
- Year: ${year}
- Publisher: ${publisher}
${pageRef ? `- Pages: ${pageRef}` : ''}

Return ONLY the formatted citation, nothing else.`;

    return callAIFunc(prompt, text.substring(0, 5000));
};

/**
 * Generate summary with page references
 */
export const summarizeWithPageRefs = async (text, pageRange) => {
    const prompt = `Summarize the following content from pages ${pageRange.start} to ${pageRange.end}.

For each major point, include the specific page number(s) where that information appears.

Format your response as:
**Main Point** (p. X-Y)
- Supporting detail
- Supporting detail

**Another Main Point** (p. Z)
- Supporting detail

Keep bullet points concise and actionable.`;

    return callAIFunc(prompt, text.substring(0, 60000));
};

/**
 * Refines dirty OCR text using AI for professional reconstruction.
 * Fixes spacing, word merging, and paragraph structure.
 */
export const refineOCRText = async (dirtyText) => {
    if (!dirtyText || dirtyText.trim().length === 0) return "";

    const prompt = `You are a professional document reconstruction engine. 
    Below is "dirty" text extracted from a PDF. It has the following issues:
    1. Letters within a word are sometimes separated by spaces (e.g., "H e l l o").
    2. Words are sometimes merged together without spaces.
    3. Paragraph breaks and line breaks are missing or incorrect.
    
    Task:
    Reconstruct this text into a professional, production-grade format. 
    - Correct all spacing issues.
    - Restore logical paragraph structures (use proper \n and \n\n).
    - Ensure the text is clean and ready for academic or professional use.
    - Maintain the original meaning and content perfectly.
    
    Return ONLY the cleaned text. Do not add any preamble or commentary.`;

    return callAIFunc(prompt, dirtyText.substring(0, 40000));
};

/**
 * Performs high-precision multimodal OCR on a page image.
 * @param {string} base64Image - Base64 encoded image data.
 */
export const performNeuralOCR = async (base64Image) => {
    const keys = getApiKeys();
    if (keys.length === 0) throw new Error("No API keys found.");

    const key = keys[0];
    const model = getModel(key, "gemini-1.5-flash"); // Flash is great for OCR

    const prompt = `Perform professional-grade OCR on this document image. 
    Reconstruct the full text with perfect spacing, indentation, and paragraph structure.
    Detect tables, headers, and footers and format them clearly in Markdown if possible.
    The output should be clean, searchable, and professional.
    Return ONLY the extracted text.`;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: base64Image.split(',')[1],
                mimeType: "image/png"
            }
        }
    ]);

    return (await result.response).text();
};

/**
 * Detects and masks PII (Personally Identifiable Information)
 */
export const maskPII = async (text) => {
    const prompt = `Identify all Personally Identifiable Information (PII) in the following text. 
    This includes: Aadhaar numbers, PAN numbers, full names, mobile numbers, email addresses, and home addresses (specifically Indian formats like Aadhaar/PAN).
    Return the text with all PII replaced by [MASKED].
    Return ONLY the masked text.`;
    return callAIFunc(prompt, text.substring(0, 40000));
};

/**
 * Predicts risks and liabilities from context
 */
export const predictRisks = async (text) => {
    const prompt = `Act as a legal and risk management expert. Analyze the following text for potential risks, liabilities, or unfavorable clauses.
    Identify:
    1. Liability exposing clauses.
    2. Missing critical information.
    3. Potential financial risks (e.g. late fees, penalties).
    4. Compliance issues.
    Return a structured report with Risk Level (Low/Medium/High) and recommendations.`;
    return callAIFunc(prompt, text.substring(0, 50000));
};

/**
 * Auto-translate sections
 */
export const translateText = async (text, targetLang = 'Bengali') => {
    const prompt = `Translate the following text into ${targetLang}. 
    Ensure the translation is natural, contextually accurate, and maintains professional/academic tone.
    If it is technical text, use appropriate technical terms in ${targetLang}.
    Return ONLY the translated text.`;
    return callAIFunc(prompt, text.substring(0, 30000));
};

/**
 * Audio Summaries "Explain para X simply"
 */
export const generateAudioSummary = async (text) => {
    const prompt = `Create a short, spoken-word style summary of the following content. 
    Imagine you are explaining this to someone over audio. 
    Use clear, simple language and a conversational tone.
    Keep it under 300 words.`;
    return callAIFunc(prompt, text.substring(0, 20000));
};

/**
 * Solve or Explain Math Equations
 */
export const solveMathEquation = async (equationText) => {
    const prompt = `You are a mathematical genius and engineering expert.
    Analyze the following equation or math problem:
    "${equationText}"
    
    Provide:
    1. **Interpretation**: What does this equation represent?
    2. **Step-by-Step Solution/Derivation**: If it's a problem, solve it. If it's a formula, derive it or show its usage.
    3. **Key Concepts**: Briefly explain the underlying mathematical concepts.
    4. **LaTeX**: Provide the corrected LaTeX form if applicable.
    
    Format nicely with bold headers.`;

    return callAIFunc(prompt, "");
};


/**
 * ============================================================================
 * PHASE 6: WORLD-CLASS RAG ENGINE (Source Grounding)
 * ============================================================================
 */

/**
 * Splits text into overlapping chunks for better context retrieval.
 */
const chunkText = (text, chunkSize = 1000, overlap = 200) => {
    const chunks = [];
    for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
        chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks;
};

/**
 * RAG-Lite: Finds most relevant page chunks based on query similarity.
 * Uses term-frequency / keyword overlap since we don't have local embeddings yet.
 */
const findRelevantChunks = (query, pagesData) => {
    if (!pagesData || pagesData.length === 0) return [];

    const queryTerms = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    // Score each page based on term occurrence
    const scoredPages = pagesData.map(page => {
        const contentLower = page.content.toLowerCase();
        let score = 0;

        // Exact phrase match bonus
        if (contentLower.includes(query.toLowerCase())) score += 10;

        // Term frequency match
        queryTerms.forEach(term => {
            const regex = new RegExp(term, 'g');
            const count = (contentLower.match(regex) || []).length;
            score += count;
        });

        return { ...page, score };
    });

    // Sort by score and take top 5
    return scoredPages
        .filter(p => p.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
};

/**
 * Ask PDF with Grounded Citations (True AI)
 * Uses RAG to find specific pages and cites them.
 */
export const askPDFGrounded = async (question, pagesData, history = []) => {
    // 1. Retrieve relevant context
    const setContext = findRelevantChunks(question, pagesData);

    // 2. Format context for LLM
    const contextString = setContext.map(c => `[PAGE ${c.page}]: ${c.content}`).join('\n\n');

    if (!contextString) {
        return "I couldn't find any relevant information in the document to answer your question. Please try rephrasing or asking about a different topic.";
    }

    // 3. Construct prompt
    const prompt = `You are a world-class research assistant. Answer the user's question using ONLY the provided context from the PDF.
    
    CRITICAL INSTRUCTIONS:
    1.  **Cite your sources**: Every time you state a fact, append the page number like this: [Page 5].
    2.  **Be precise**: Do not hallucinate. If the answer isn't in the context, say so.
    3.  **Structure**: Use bullet points for list-like answers.
    
    User Question: "${question}"
    
    Retrieved Context:
    ${contextString.substring(0, 50000)} // Safety cap
    
    Chat History:
    ${history.map(h => `${h.role}: ${h.content}`).join('\n')}
    
    Answer:`;

    return callAIFunc(prompt, "");
};
