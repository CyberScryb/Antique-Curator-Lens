
import { GoogleGenAI, Type } from "@google/genai";
import { AppraisalResult, LiveAnalysisUpdate, MarketAnalysis, LensMode } from "../types";

const SYSTEM_INSTRUCTION = `You are "Curator Prime", an Autonomous Wealth & Heritage Engine.
Your analysis goes beyond identification; you predict financial futures, digital restoration, and issue trusted authentication passports.

CRITICAL TASKS:
1. **Multi-Vector Analysis**: If multiple images are provided, synthesize data from all angles (Front, Back, Marks) to confirm authenticity.
2. **Identify**: Precision ID of the object (Maker, Era, Model).
3. **Visual Hotspots**: Locate 3-5 features (x,y coordinates) specifically tagging 'damage' for restoration or 'marks' for auth.
4. **Forecast**: Project value 5 years out based on inflation and collecting trends.
5. **Trust Tier**: Assign a "Trust Tier" (Level 1-3) based on the visual evidence provided. 1 image = Level 1. 3+ verifiable angles = Level 3.
`;

// FULL APPRAISAL (Manual Mode)
export const analyzeItem = async (imageBuffers: string[]): Promise<AppraisalResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Determine Trust Context based on evidence count
  const evidenceCount = imageBuffers.length;
  const prompt = `Perform a "Master Appraisal".
  EVIDENCE PROVIDED: ${evidenceCount} ANGLE(S).
  
  1. Identify the object strictly.
  2. Locate hotspots.
  3. Generate a 5-year value forecast.
  4. Provide restoration advice.
  5. Suggest 3 deep-dive questions.
  6. **Authentication**: If ${evidenceCount} >= 3, cross-reference the Front, Reverse, and Details to validate.
  7. **Forensic Analysis**: Act as a Senior Forensic Appraiser. Analyze metallurgical wear, tool marks, patina consistency, or hallmark placement. NO GENERAL HISTORY. If visual data is too low, state "Insufficient visual data for forensic appraisal."
  
  Return valid JSON.`;

  const imageParts = imageBuffers.map(buffer => ({
    inlineData: { data: buffer.split(',')[1], mimeType: 'image/jpeg' }
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        ...imageParts,
        { text: prompt }
      ]
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          itemName: { type: Type.STRING },
          category: { type: Type.STRING },
          classification: { type: Type.STRING, enum: ["Antique", "Vintage", "Modern", "New", "Specialty"] },
          era: { type: Type.STRING },
          origin: { type: Type.STRING },
          condition: { type: Type.STRING },
          conditionScore: { type: Type.NUMBER },
          rarityScore: { type: Type.NUMBER, description: "1-10 scale" },
          rarityDescription: { type: Type.STRING },
          valuation: {
            type: Type.OBJECT,
            properties: {
              low: { type: Type.NUMBER },
              mid: { type: Type.NUMBER },
              high: { type: Type.NUMBER },
              currency: { type: Type.STRING }
            }
          },
          authenticationMarks: { type: Type.ARRAY, items: { type: Type.STRING } },
          visualHotspots: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER, description: "X Position % (0-100)" },
                y: { type: Type.NUMBER, description: "Y Position % (0-100)" },
                label: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['damage', 'signature', 'material', 'design'] }
              },
              required: ["x", "y", "label", "description"]
            }
          },
          historicalContext: { type: Type.STRING },
          materials: { type: Type.STRING },
          careInstructions: { type: Type.STRING },
          comparableSales: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                price: { type: Type.STRING },
                date: { type: Type.STRING },
                link: { type: Type.STRING },
                source: { type: Type.STRING }
              }
            }
          },
          sellingProfile: {
            type: Type.OBJECT,
            properties: {
              listingTitle: { type: Type.STRING },
              listingDescription: { type: Type.STRING },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedVenue: { type: Type.STRING },
              pricingStrategy: { type: Type.STRING }
            }
          },
          forecast: {
            type: Type.OBJECT,
            properties: {
              liquidityScore: { type: Type.NUMBER, description: "0-100" },
              marketSentiment: { type: Type.STRING, enum: ["Bullish", "Bearish", "Stable"] },
              investmentGrade: { type: Type.STRING, enum: ["AAA", "AA", "A", "B", "C"] },
              fiveYearProjection: {
                type: Type.ARRAY,
                items: {
                   type: Type.OBJECT,
                   properties: {
                       year: { type: Type.STRING },
                       value: { type: Type.NUMBER }
                   }
                }
              }
            }
          },
          restoration: {
             type: Type.OBJECT,
             properties: {
                 restorationPotential: { type: Type.STRING },
                 estimatedCost: { type: Type.STRING },
                 perfectStateDescription: { type: Type.STRING }
             }
          },
          provenance: {
              type: Type.OBJECT,
              properties: {
                  digitalHash: { type: Type.STRING }, // Placeholder, generated client side mostly
                  chainStatus: { type: Type.STRING, enum: ["Unregistered", "Minted"] },
                  trustTier: { type: Type.STRING, enum: ["Level 1 (Snapshot)", "Level 2 (Visual)", "Level 3 (Verified)"] }
              }
          },
          forensicInsight: { type: Type.STRING, description: "Senior Forensic Appraiser analysis of physical tells. No history." },
          insightfulPrompts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3 highly specific, curious questions a sophisticated collector would ask about this exact item."
          },
          confidence: { type: Type.NUMBER }
        },
        required: ["itemName", "valuation", "forecast", "restoration", "insightfulPrompts", "provenance"]
      }
    }
  });

  if (!response.text) throw new Error("Analysis failed to return data.");
  const result = JSON.parse(response.text) as AppraisalResult;
  
  // Client-side enhancement for deterministic fields if AI skips
  result.provenance = {
      digitalHash: '0x' + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join(''),
      chainStatus: 'Unregistered',
      trustTier: result.provenance?.trustTier || (imageBuffers.length >= 3 ? 'Level 3 (Verified)' : 'Level 1 (Snapshot)')
  };

  // Store the evidence chain
  result.images = imageBuffers;

  return result;
};

// Generates new, fresh questions for the cycle button
export const generateDynamicPrompts = async (item: AppraisalResult): Promise<string[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Context: I am looking at a ${item.era} ${item.itemName} (${item.classification}).
      Existing Details: ${item.historicalContext.substring(0, 100)}...
      
      Task: Generate 3 NEW, highly specific, "insider" questions that a wealthy collector or historian would ask to reveal hidden value, manufacturing secrets, or market anomalies.
      Do not repeat generic questions. Focus on materials, specific marks, or obscure history.
      
      Output: JSON array of 3 strings.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    prompts: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    });
    
    if (!response.text) return ["How do I sell this?", "Is it authentic?", "How do I clean it?"];
    const data = JSON.parse(response.text);
    return data.prompts || [];
};

export const executeItemTool = async (item: AppraisalResult, toolId: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let toolPrompt = "";
  if (toolId === 'LISTING_TITLE_ONLY') {
     toolPrompt = `ACT AS: SEO Expert for eBay.
     TASK: Write ONE single string: The best possible eBay title (max 80 chars) for this ${item.itemName}.
     Include Era, Maker, Material, Condition. No fluff. Just the title string.`;
  } else if (toolId === 'LISTING_DESCRIPTION_ONLY') {
     toolPrompt = `ACT AS: Professional Antiques Dealer.
     TASK: Write the body description for an eBay listing.
     Do NOT include the title.
     Include:
     - 2 sentence hook.
     - Bullet points of condition.
     - Dimensions/Materials.
     - "Buy with Confidence" footer.
     Format as clean HTML (using only <p>, <ul>, <li>, <strong> tags). No markdown.`;
  } else if (toolId === 'LISTING') {
      toolPrompt = `
      ACT AS: Expert Auctioneer.
      TASK: Write a high-converting, professional listing title and description for this ${item.itemName}.
      DETAILS: ${item.era}, ${item.classification}, ${item.condition}.
      REQUIREMENTS: 
      - Headline must be catchy but professional.
      - Description must highlight rarity and provenance.
      - Include a list of 5 SEO keywords for eBay/1stDibs.
      Format neatly with Markdown.`;
  } else if (toolId === 'LISTING_BOOST') {
      toolPrompt = `
      ACT AS: High-End E-Commerce Strategist.
      TASK: Optimize the sale strategy for this ${item.itemName} (${item.valuation.mid} value).
      
      REQUIREMENTS:
      1. **Super-Title**: Create 3 title variations (one for SEO, one for Click-Through, one for Luxury Appeal).
      2. **Keyword Injection**: List 15 high-volume, low-competition tags specifically for this niche (e.g. "Mid-Century Modern" vs "MCM").
      3. **Platform Match**: Recommend the EXACT best platform to sell (e.g. Chairish vs eBay vs 1stDibs vs Private Sale) and WHY based on current market trends.
      4. **Pricing Psychology**: Suggest a specific "Buy It Now" price vs "Reserve Price" to maximize bidding war potential.
      
      Format clearly with bold headers.`;
  } else if (toolId === 'CARE') {
      toolPrompt = `
      ACT AS: Museum Conservator.
      TASK: Provide a strict preservation protocol for this ${item.itemName}.
      MATERIALS: ${item.materials}.
      REQUIREMENTS:
      - Cleaning instructions (Do's and Don'ts).
      - Storage requirements (Temperature, Humidity, Light).
      - Handling warnings.
      Format as a checklist.`;
  } else if (toolId === 'BUYERS') {
      toolPrompt = `
      ACT AS: Art Market Strategist.
      TASK: Profile the ideal buyer for this ${item.itemName} and suggest where to sell it.
      DETAILS: ${item.valuation.mid} valuation.
      REQUIREMENTS:
      - Who is the buyer? (Demographics, Psychographics).
      - Best Venues (Auction house names, Platforms, Private dealers).
      - Negotiation Tip.`;
  } else if (toolId === 'HISTORY') {
      toolPrompt = `
      ACT AS: Historian.
      TASK: Tell a specific, obscure, or fascinating story related to this item's Era (${item.era}) or Maker (${item.origin}) that adds intangible value.
      Don't be generic. Connect it to a specific historical movement or event.`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { 
        parts: [
            { text: `Item Context: ${JSON.stringify(item)}` },
            { text: toolPrompt }
        ] 
    }
  });

  return response.text || "Tool execution failed.";
};

export const analyzeLiveFrame = async (imageBuffer: string, lensMode: LensMode, previousContext?: string): Promise<LiveAnalysisUpdate> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let lensInstructions = "";
  if (lensMode === 'IDENTITY') {
    lensInstructions = `FOCUS: Establish Provenance. Identify Maker & Era.`;
  } else if (lensMode === 'MARKET') {
    lensInstructions = `FOCUS: Money. Estimate price.`;
  } else if (lensMode === 'FORENSICS') {
    lensInstructions = `FOCUS: Damage and Details. Look for scratches, patina, marks.`;
  } else if (lensMode === 'DECIPHER') {
    lensInstructions = `FOCUS: Text. Read everything.`;
  }

  const prompt = `Real-time Scan. Lens: ${lensMode}.
  Instructions: ${lensInstructions}
  Context: ${previousContext || "None."}
  
  Return status LOCKED only if confidence > 85%.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview', 
    contents: {
      parts: [
        { inlineData: { data: imageBuffer.split(',')[1], mimeType: 'image/jpeg' } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ["SEARCHING", "IDENTIFYING", "LOCKED"] },
          shortTitle: { type: Type.STRING },
          classification: { type: Type.STRING },
          quickFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
          valuationEstimate: { type: Type.STRING },
          detailedNote: { type: Type.STRING },
          confidence: { type: Type.NUMBER }
        }
      }
    }
  });

  if (!response.text) return { status: 'SEARCHING', shortTitle: '', classification: 'Modern', quickFacts: [], confidence: 0, lensMode };
  return { ...JSON.parse(response.text), lensMode };
};

export const askCurator = async (itemContext: AppraisalResult, question: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemContext = `
    You are the "Prime Curator", the world's most knowledgeable expert on this specific item: ${itemContext.itemName} (${itemContext.era}).
    
    Data: ${JSON.stringify(itemContext)}

    User Question: "${question}"

    Instructions:
    1. Answer immediately and directly. No fluff.
    2. Be incredibly insightful. Mention specific manufacturing techniques, historical events of that year, or specific market buyers.
    3. Use a tone that is professional, high-end, and extremely knowledgeable.
    4. If the user asks about value, explain *why* based on the data provided.
  `;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: systemContext }] }
  });
  return response.text || "Unavailable.";
};

export const getMarketAnalysis = async (query: string): Promise<MarketAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Real-time market analysis for: "${query}". JSON output.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          itemName: { type: Type.STRING },
          trend: { type: Type.STRING, enum: ["UP", "DOWN", "STABLE"] },
          changePercent: { type: Type.STRING },
          summary: { type: Type.STRING },
          keyInsight: { type: Type.STRING },
          demandLevel: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
          lastUpdated: { type: Type.STRING }
        },
        required: ["trend", "changePercent", "summary", "keyInsight", "demandLevel"]
      }
    }
  });

  if (!response.text) throw new Error("Market analysis failed.");
  const cleanText = response.text.replace(/```json|```/g, '').trim();
  const data = JSON.parse(cleanText) as MarketAnalysis;
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = chunks.flatMap((chunk: any) => chunk.web?.uri ? [{ title: chunk.web.title || "Source", url: chunk.web.uri }] : []).slice(0, 5);
  return { ...data, sources };
};
