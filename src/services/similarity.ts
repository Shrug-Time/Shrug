import type { Answer, Totem, TotemSuggestion } from '@/types/models';

const SIMILARITY_THRESHOLD = 0.7;
const MIN_WORD_LENGTH = 4;

export class SimilarityService {
  /**
   * Calculate Jaccard similarity between two texts
   */
  static calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(
      text1.toLowerCase()
        .split(/\W+/)
        .filter(word => word.length >= MIN_WORD_LENGTH)
    );
    const words2 = new Set(
      text2.toLowerCase()
        .split(/\W+/)
        .filter(word => word.length >= MIN_WORD_LENGTH)
    );

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Find similar answers based on text similarity
   */
  static findSimilarAnswers(answers: Answer[]): Map<number, number[]> {
    const similarAnswers = new Map<number, number[]>();

    for (let i = 0; i < answers.length; i++) {
      const similarIndices: number[] = [];
      
      for (let j = i + 1; j < answers.length; j++) {
        const similarity = this.calculateTextSimilarity(
          answers[i].text,
          answers[j].text
        );

        if (similarity >= SIMILARITY_THRESHOLD) {
          similarIndices.push(j);
        }
      }

      if (similarIndices.length > 0) {
        similarAnswers.set(i, similarIndices);
      }
    }

    return similarAnswers;
  }

  /**
   * Get totem suggestions based on similar answers
   */
  static getSuggestedTotems(
    answers: Answer[],
    similarAnswerIndices: number[]
  ): TotemSuggestion[] {
    const totemFrequency = new Map<string, number>();
    const totemCategories = new Map<string, string>();

    // Count totem occurrences in similar answers
    for (const idx of similarAnswerIndices) {
      const answer = answers[idx];
      if (!answer?.totems) continue;

      for (const totem of answer.totems) {
        if (!totem?.name) continue; // Skip totems without names
        
        const count = (totemFrequency.get(totem.name) || 0) + 1;
        totemFrequency.set(totem.name, count);
        totemCategories.set(totem.name, totem.category?.name || 'General');
      }
    }

    // Convert to suggestions with confidence scores
    const suggestions: TotemSuggestion[] = [];
    totemFrequency.forEach((frequency, totemName) => {
      const confidence = frequency / similarAnswerIndices.length;
      suggestions.push({
        totemName,
        confidence,
        reason: `Used in ${frequency} similar answers`,
        category: totemCategories.get(totemName) || 'General'
      });
    });

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Group similar answers and get totem suggestions
   */
  static groupSimilarAnswers(answers: Answer[]): {
    groups: Map<number, number[]>;
    suggestions: Map<number, TotemSuggestion[]>;
  } {
    const groups = this.findSimilarAnswers(answers);
    const suggestions = new Map<number, TotemSuggestion[]>();

    groups.forEach((similarIndices, mainIndex) => {
      const suggestedTotems = this.getSuggestedTotems(answers, [mainIndex, ...similarIndices]);
      suggestions.set(mainIndex, suggestedTotems);
    });

    return { groups, suggestions };
  }

  /**
   * Update totem relationships based on similar answers
   */
  static updateTotemRelationships(answers: Answer[], groups: Map<number, number[]>): Totem[] {
    const totemRelationships = new Map<string, Set<string>>();

    // Build relationships from similar answers
    groups.forEach((similarIndices, mainIndex) => {
      const mainAnswer = answers[mainIndex];
      if (!mainAnswer?.totems) return;
      
      const mainTotems = mainAnswer.totems
        .filter(t => t?.name) // Filter out totems without names
        .map(t => t.name);

      for (const idx of similarIndices) {
        const similarAnswer = answers[idx];
        if (!similarAnswer?.totems) continue;
        
        const similarTotems = similarAnswer.totems
          .filter(t => t?.name) // Filter out totems without names
          .map(t => t.name);

        // Update relationships for each totem
        mainTotems.forEach(mainTotem => {
          if (!totemRelationships.has(mainTotem)) {
            totemRelationships.set(mainTotem, new Set());
          }
          similarTotems.forEach(similarTotem => {
            if (mainTotem !== similarTotem) {
              totemRelationships.get(mainTotem)!.add(similarTotem);
            }
          });
        });
      }
    });

    // Convert relationships to updated totems
    const updatedTotems: Totem[] = [];
    totemRelationships.forEach((relatedTotems, totemName) => {
      const existingTotem = answers.flatMap(a => a.totems).find(t => t.name === totemName);
      if (existingTotem) {
        updatedTotems.push({
          ...existingTotem,
          relatedTotems: Array.from(relatedTotems)
        });
      }
    });

    return updatedTotems;
  }
} 