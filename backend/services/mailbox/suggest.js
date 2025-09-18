/**
 * Mailbox Suggestion Service
 * Analyzes discovered mailbox taxonomy and suggests reuse/create actions
 */

const { CANONICAL_TAXONOMY, TaxonomyUtils } = require('../../config/canonical-taxonomy');

class MailboxSuggestionService {
  constructor() {
    this.canonicalTaxonomy = CANONICAL_TAXONOMY;
  }

  /**
   * Analyze discovered mailbox and suggest mapping actions
   * @param {Object} discoveredData - Data from mailbox discovery
   * @param {string} businessType - Type of business (default, banking, healthcare, etc.)
   * @returns {Object} Suggested mapping with reuse/create recommendations
   */
  suggest(discoveredData, businessType = 'default') {
    try {
      // Get appropriate taxonomy for business type
      const targetTaxonomy = TaxonomyUtils.getTaxonomy(businessType);
      
      // Analyze existing labels/folders
      const existingItems = this.extractExistingItems(discoveredData);
      
      // Find matches between existing and canonical
      const matches = this.findMatches(existingItems, targetTaxonomy);
      
      // Generate suggestions
      const suggestions = this.generateSuggestions(matches, targetTaxonomy, discoveredData.provider);
      
      return {
        provider: discoveredData.provider,
        businessType: businessType,
        analysis: {
          existingCount: existingItems.length,
          canonicalCount: Object.keys(targetTaxonomy).length,
          matchedCount: matches.exact.length + matches.partial.length,
          unmatchedCount: existingItems.length - (matches.exact.length + matches.partial.length)
        },
        matches: matches,
        suggestions: suggestions,
        suggestedMapping: this.buildSuggestedMapping(matches, targetTaxonomy),
        missingCount: suggestions.create.length,
        analyzedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Suggestion analysis error:', error);
      throw new Error(`Failed to analyze mailbox suggestions: ${error.message}`);
    }
  }

  /**
   * Extract existing items from discovered data
   * @param {Object} discoveredData - Discovery results
   * @returns {Array} Array of existing items
   */
  extractExistingItems(discoveredData) {
    if (discoveredData.provider === 'gmail') {
      return discoveredData.labels || [];
    } else if (discoveredData.provider === 'o365') {
      return [
        ...(discoveredData.folders || []),
        ...(discoveredData.categories || [])
      ];
    }
    return [];
  }

  /**
   * Find matches between existing items and canonical taxonomy
   * @param {Array} existingItems - Existing labels/folders/categories
   * @param {Object} targetTaxonomy - Target canonical taxonomy
   * @returns {Object} Match results
   */
  findMatches(existingItems, targetTaxonomy) {
    const matches = {
      exact: [],
      partial: [],
      unmatched: []
    };

    existingItems.forEach(item => {
      const matchResult = this.findBestMatch(item, targetTaxonomy);
      
      if (matchResult.type === 'exact') {
        matches.exact.push({
          existing: item,
          canonical: matchResult.canonical,
          confidence: matchResult.confidence
        });
      } else if (matchResult.type === 'partial') {
        matches.partial.push({
          existing: item,
          canonical: matchResult.canonical,
          confidence: matchResult.confidence,
          reason: matchResult.reason
        });
      } else {
        matches.unmatched.push({
          existing: item,
          reason: 'no_suitable_match'
        });
      }
    });

    return matches;
  }

  /**
   * Find best match for an existing item against canonical taxonomy
   * @param {Object} item - Existing item
   * @param {Object} taxonomy - Canonical taxonomy
   * @returns {Object} Match result
   */
  findBestMatch(item, taxonomy) {
    const itemName = this.normalizeItemName(item);
    let bestMatch = null;
    let bestScore = 0;

    for (const [canonicalKey, canonicalConfig] of Object.entries(taxonomy)) {
      const score = this.calculateMatchScore(itemName, canonicalKey, canonicalConfig);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          key: canonicalKey,
          config: canonicalConfig,
          score: score
        };
      }
    }

    // Determine match type based on score
    if (bestScore >= 0.9) {
      return {
        type: 'exact',
        canonical: bestMatch,
        confidence: bestScore
      };
    } else if (bestScore >= 0.6) {
      return {
        type: 'partial',
        canonical: bestMatch,
        confidence: bestScore,
        reason: 'similar_name'
      };
    } else {
      return {
        type: 'none',
        confidence: bestScore
      };
    }
  }

  /**
   * Calculate match score between existing item and canonical item
   * @param {string} itemName - Normalized existing item name
   * @param {string} canonicalKey - Canonical taxonomy key
   * @param {Object} canonicalConfig - Canonical configuration
   * @returns {number} Match score (0-1)
   */
  calculateMatchScore(itemName, canonicalKey, canonicalConfig) {
    // Exact name match
    if (itemName === canonicalKey.toLowerCase()) {
      return 1.0;
    }

    // Check if item name contains canonical key
    if (itemName.includes(canonicalKey.toLowerCase())) {
      return 0.8;
    }

    // Check if canonical key contains item name
    if (canonicalKey.toLowerCase().includes(itemName)) {
      return 0.7;
    }

    // Check examples for matches
    if (canonicalConfig.examples) {
      for (const example of canonicalConfig.examples) {
        const normalizedExample = example.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (itemName.includes(normalizedExample) || normalizedExample.includes(itemName)) {
          return 0.6;
        }
      }
    }

    // Fuzzy string matching for similar names
    const similarity = this.calculateStringSimilarity(itemName, canonicalKey.toLowerCase());
    return similarity > 0.5 ? similarity : 0;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateStringSimilarity(str1, str2) {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;

    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Normalize item name for comparison
   * @param {Object} item - Item to normalize
   * @returns {string} Normalized name
   */
  normalizeItemName(item) {
    let name = item.name || item.path?.[item.path.length - 1] || '';
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Generate suggestions based on match analysis
   * @param {Object} matches - Match results
   * @param {Object} taxonomy - Target taxonomy
   * @param {string} provider - Email provider
   * @returns {Object} Suggestions
   */
  generateSuggestions(matches, taxonomy, provider) {
    const suggestions = {
      reuse: [],
      create: [],
      ignore: []
    };

    // Items to reuse (exact matches)
    matches.exact.forEach(match => {
      suggestions.reuse.push({
        canonicalKey: match.canonical.key,
        existingItem: match.existing,
        confidence: match.confidence,
        action: 'reuse_existing'
      });
    });

    // Items to potentially reuse (partial matches)
    matches.partial.forEach(match => {
      if (match.confidence >= 0.7) {
        suggestions.reuse.push({
          canonicalKey: match.canonical.key,
          existingItem: match.existing,
          confidence: match.confidence,
          action: 'reuse_with_confirmation',
          reason: match.reason
        });
      }
    });

    // Find canonical items that need to be created
    const matchedCanonicalKeys = [
      ...matches.exact.map(m => m.canonical.key),
      ...matches.partial.filter(m => m.confidence >= 0.7).map(m => m.canonical.key)
    ];

    Object.entries(taxonomy).forEach(([key, config]) => {
      if (!matchedCanonicalKeys.includes(key)) {
        suggestions.create.push({
          canonicalKey: key,
          path: config.path,
          color: config.color,
          description: config.description,
          priority: config.priority,
          action: 'create_new'
        });
      }
    });

    // Sort create suggestions by priority
    suggestions.create.sort((a, b) => a.priority - b.priority);

    return suggestions;
  }

  /**
   * Build suggested mapping structure
   * @param {Object} matches - Match results
   * @param {Object} taxonomy - Target taxonomy
   * @returns {Object} Suggested mapping
   */
  buildSuggestedMapping(matches, taxonomy) {
    const mapping = {};

    // Add exact matches
    matches.exact.forEach(match => {
      mapping[match.canonical.key] = {
        canonicalKey: match.canonical.key,
        path: match.canonical.config.path,
        color: match.canonical.config.color,
        existingId: match.existing.id,
        existingName: match.existing.name,
        action: 'reuse',
        confidence: match.confidence
      };
    });

    // Add high-confidence partial matches
    matches.partial.forEach(match => {
      if (match.confidence >= 0.7) {
        mapping[match.canonical.key] = {
          canonicalKey: match.canonical.key,
          path: match.canonical.config.path,
          color: match.canonical.config.color,
          existingId: match.existing.id,
          existingName: match.existing.name,
          action: 'reuse_partial',
          confidence: match.confidence,
          reason: match.reason
        };
      }
    });

    // Add items that need to be created
    Object.entries(taxonomy).forEach(([key, config]) => {
      if (!mapping[key]) {
        mapping[key] = {
          canonicalKey: key,
          path: config.path,
          color: config.color,
          action: 'create',
          priority: config.priority
        };
      }
    });

    return mapping;
  }
}

module.exports = MailboxSuggestionService;
