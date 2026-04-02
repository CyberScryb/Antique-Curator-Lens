
export type ItemClassification = 'Antique' | 'Vintage' | 'Modern' | 'New' | 'Specialty';

export interface VisualHotspot {
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  label: string;
  description: string;
  type?: 'damage' | 'signature' | 'material' | 'design';
}

export interface AppraisalResult {
  itemName: string;
  category: string;
  classification: ItemClassification;
  era: string;
  origin: string;
  condition: string;
  conditionScore: number; // 1-10
  rarityScore: number; // 1-10
  rarityDescription: string;
  valuation: {
    low: number;
    mid: number;
    high: number;
    currency: string;
  };
  authenticationMarks: string[]; 
  visualHotspots: VisualHotspot[]; 
  historicalContext: string; 
  materials: string;
  careInstructions: string;
  comparableSales: {
    title: string;
    price: string;
    date: string;
    link: string;
    source: string;
  }[];
  sellingProfile: {
    listingTitle: string;
    listingDescription: string;
    keywords: string[];
    recommendedVenue: string;
    pricingStrategy: string;
  };
  forecast: {
    liquidityScore: number; // 1-100
    fiveYearProjection: { year: string; value: number }[];
    marketSentiment: 'Bullish' | 'Bearish' | 'Stable';
    investmentGrade: 'AAA' | 'AA' | 'A' | 'B' | 'C';
  };
  restoration: {
    restorationPotential: string;
    estimatedCost: string;
    perfectStateDescription: string;
  };
  provenance: {
    digitalHash: string;
    chainStatus: 'Unregistered' | 'Minted';
    trustTier: 'Level 1 (Snapshot)' | 'Level 2 (Visual)' | 'Level 3 (Verified)'; // Added Trust Tier
  };
  forensicInsight?: string; // New field for Senior Appraiser analysis
  insightfulPrompts: string[];
  confidence: number;
  images?: string[]; // Added to store the full evidence chain
}

export interface CollectionItem extends AppraisalResult {
  id: string;
  dateScanned: string;
  imageUrl: string; // Primary thumbnail
  images?: string[]; // Full evidence set
  userNotes?: string;
}

export type LensMode = 'IDENTITY' | 'MARKET' | 'FORENSICS' | 'DECIPHER';

export interface LiveAnalysisUpdate {
  status: 'SEARCHING' | 'IDENTIFYING' | 'LOCKED';
  shortTitle: string;
  classification: ItemClassification;
  quickFacts: string[]; 
  valuationEstimate?: string; 
  detailedNote?: string; 
  confidence: number;
  lensMode: LensMode;
  coordinates?: { x: number, y: number }; 
}

export interface MarketAnalysis {
  itemName: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  changePercent: string;
  summary: string;
  keyInsight: string;
  demandLevel: 'High' | 'Medium' | 'Low';
  lastUpdated: string;
  sources?: { title: string; url: string }[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type AppTab = 'SCAN' | 'COLLECTION' | 'MARKET' | 'ACCOUNT';
