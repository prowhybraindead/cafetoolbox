export interface AIAnalysisResponse {
  analysis: string;
  suggestions: string[];
  fixed_code: string;
  diff_summary: string;
  security_score: number;
  test_cases?: string;
}

export interface EditorTheme {
  name: string;
  value: string;
}
