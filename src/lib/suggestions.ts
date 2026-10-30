export type SuggestionCategory = "idea" | "bug" | "altro";

export type Suggestion = {
  id: string;
  text: string;
  category: SuggestionCategory;
  createdAt: string;
};
