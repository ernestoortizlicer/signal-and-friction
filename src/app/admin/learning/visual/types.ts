export type VisualMode = "noticing" | "contrast";

export type VisualPageType =
  | "homepage"
  | "pricing"
  | "signup"
  | "onboarding"
  | "checkout"
  | "dashboard"
  | "other";

export type VisualImage = {
  dataUrl: string;
  fingerprint: string;
  width: number;
  height: number;
  name: string;
};

export type VisualFeedback = {
  coach_metrics: {
    visual_specificity: number;
    observation_interpretation_separation: number;
    salience_coverage_estimate: number;
    false_inference_count: number;
  };
  detected_well: string[];
  reinspect: Array<{
    detail: string;
    category: string;
    why_salient: string;
    image: "A" | "B" | "both";
  }>;
  interpretation_leaks: Array<{
    analyst_phrase: string;
    why_not_observation: string;
  }>;
  contrast_misses: Array<{
    difference: string;
    category: string;
  }>;
  next_drill_focus: string[];
  second_look_prompt: string;
};

export type VisualHistory = {
  profile: {
    reasoningBaseline: string;
    primaryTrainingNeed: string;
    currentStage: string;
    targetVisualMinutes: number;
    rationale: string;
  };
  summary: {
    totalSessions: number;
    sessionsLast14: number;
    visualMinutesLast14: number;
    avgVisualSpecificity: number | null;
    avgObservationInterpretationSeparation: number | null;
    avgSalienceCoverageEstimate: number | null;
    repeatedMissCategories: Array<{ category: string; count: number }>;
  };
};
