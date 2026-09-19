export type InterviewQuestion = {
  id: string;
  section: "demographics" | "values" | "purchase" | "category";
  prompt: string;
  kind: "text" | "long" | "choice" | "number";
  options?: string[];
  /** demographics answers are stored on agents.demographics instead of as memories */
  demographicKey?: string;
};

export const CATEGORY = "hair dye";

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  { id: "name", section: "demographics", kind: "text", prompt: "First, what should we call you?", demographicKey: "name" },
  { id: "age", section: "demographics", kind: "number", prompt: "How old are you?", demographicKey: "age" },
  { id: "location", section: "demographics", kind: "text", prompt: "Where do you live?", demographicKey: "location" },
  { id: "occupation", section: "demographics", kind: "text", prompt: "What do you do for work?", demographicKey: "occupation" },
  { id: "household", section: "demographics", kind: "choice", prompt: "Who else is in your household?", options: ["Live alone", "Partner", "Partner + kids", "Roommates", "Family home"], demographicKey: "household" },
  { id: "income", section: "demographics", kind: "choice", prompt: "Roughly what's your household income?", options: ["Under $40k", "$40-70k", "$70-100k", "$100-150k", "$150k+", "Prefer not to say"], demographicKey: "household_income" },

  { id: "values_spend", section: "values", kind: "long", prompt: "Think about the last thing you spent money on that felt worth it. What was it, and why?" },
  { id: "values_tradeoff", section: "values", kind: "long", prompt: "When you're choosing between two similar products, what usually decides it?" },
  { id: "values_trust", section: "values", kind: "long", prompt: "Whose opinion do you actually trust when you're deciding what to buy?" },
  { id: "values_risk", section: "values", kind: "long", prompt: "How do you feel about trying something new versus sticking with what works?" },

  { id: "purchase_recent", section: "purchase", kind: "long", prompt: "Walk me through the last few things you bought for yourself. Where did you buy them?" },
  { id: "purchase_channel", section: "purchase", kind: "choice", prompt: "Where do you usually shop for personal care?", options: ["Drugstore", "Target/Walmart", "Amazon", "Ulta/Sephora", "Salon", "Subscription"] },
  { id: "purchase_price", section: "purchase", kind: "long", prompt: "Tell me about a time you paid more than you meant to, and a time you walked away over price." },
  { id: "purchase_loyalty", section: "purchase", kind: "long", prompt: "Is there a brand you buy without thinking? What earned that?" },

  { id: "cat_current", section: "category", kind: "long", prompt: "How do you handle " + CATEGORY + " right now? Salon, at home, both, or not at all?" },
  { id: "cat_frequency", section: "category", kind: "text", prompt: "How often, and what does one round cost you?" },
  { id: "cat_frustration", section: "category", kind: "long", prompt: "What's the most annoying part of it?" },
  { id: "cat_ingredients", section: "category", kind: "long", prompt: "How much attention do you pay to what's actually in it?" },
  { id: "cat_switch", section: "category", kind: "long", prompt: "What would make you switch to a different brand?" },
  { id: "cat_dealbreaker", section: "category", kind: "long", prompt: "What would make you rule a product out completely?" },
];
