const DEFAULT_OPTIONS = {
    fuzzyThreshold: 0.8,
    caseInsensitive: true,
};
/**
 * Score a response against expected concepts
 */
export function scoreResponse(test, response, metrics, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const normalizedResponse = opts.caseInsensitive ? response.toLowerCase() : response;
    const matchedConcepts = [];
    const missedConcepts = [];
    // Check each expected concept
    for (const concept of test.concepts) {
        const normalizedConcept = opts.caseInsensitive ? concept.toLowerCase() : concept;
        if (conceptMatches(normalizedResponse, normalizedConcept, opts.fuzzyThreshold)) {
            matchedConcepts.push(concept);
        }
        else {
            missedConcepts.push(concept);
        }
    }
    // Also check expected patterns from test definition
    for (const expected of test.expected) {
        // Parse checkbox items like "- [ ] Pattern to check"
        const checkboxMatch = expected.match(/^-\s*\[[\sx]\]\s*(.+)$/i);
        const pattern = checkboxMatch ? checkboxMatch[1] : expected;
        const normalizedPattern = opts.caseInsensitive ? pattern.toLowerCase() : pattern;
        // Skip if already in concepts
        if (test.concepts.some((c) => c.toLowerCase() === normalizedPattern)) {
            continue;
        }
        if (conceptMatches(normalizedResponse, normalizedPattern, opts.fuzzyThreshold)) {
            if (!matchedConcepts.includes(pattern)) {
                matchedConcepts.push(pattern);
            }
        }
        else {
            if (!missedConcepts.includes(pattern)) {
                missedConcepts.push(pattern);
            }
        }
    }
    // Calculate accuracy
    const totalConcepts = matchedConcepts.length + missedConcepts.length;
    const accuracy = totalConcepts > 0 ? (matchedConcepts.length / totalConcepts) * 100 : 0;
    // Update metrics with calculated accuracy
    const scoredMetrics = {
        ...metrics,
        accuracy,
    };
    return {
        test,
        metrics: scoredMetrics,
        matchedConcepts,
        missedConcepts,
        response,
        timestamp: new Date().toISOString(),
        passed: accuracy >= 70, // Default passing threshold
    };
}
/**
 * Check if a concept is present in the response
 */
function conceptMatches(response, concept, fuzzyThreshold) {
    // Direct substring match
    if (response.includes(concept)) {
        return true;
    }
    // Word-by-word match for multi-word concepts
    const conceptWords = concept.split(/\s+/).filter((w) => w.length > 2);
    if (conceptWords.length > 1) {
        const matchedWords = conceptWords.filter((word) => response.includes(word));
        const ratio = matchedWords.length / conceptWords.length;
        if (ratio >= fuzzyThreshold) {
            return true;
        }
    }
    // Check for synonyms/variations
    const variations = generateVariations(concept);
    for (const variation of variations) {
        if (response.includes(variation)) {
            return true;
        }
    }
    return false;
}
/**
 * Generate common variations of a concept
 */
function generateVariations(concept) {
    const variations = [];
    // Hyphenated vs spaced
    if (concept.includes('-')) {
        variations.push(concept.replace(/-/g, ' '));
    }
    if (concept.includes(' ')) {
        variations.push(concept.replace(/\s+/g, '-'));
    }
    // Plural/singular
    if (concept.endsWith('s') && concept.length > 3) {
        variations.push(concept.slice(0, -1));
    }
    else {
        variations.push(concept + 's');
    }
    // Common abbreviations
    const abbreviations = {
        'context': ['ctx'],
        'configuration': ['config', 'cfg'],
        'documentation': ['docs', 'doc'],
        'application': ['app'],
        'authentication': ['auth'],
        'authorization': ['authz'],
        'database': ['db'],
        'message': ['msg'],
        'response': ['resp'],
        'request': ['req'],
    };
    for (const [full, abbrs] of Object.entries(abbreviations)) {
        if (concept.includes(full)) {
            for (const abbr of abbrs) {
                variations.push(concept.replace(full, abbr));
            }
        }
        for (const abbr of abbrs) {
            if (concept.includes(abbr)) {
                variations.push(concept.replace(abbr, full));
            }
        }
    }
    return variations;
}
/**
 * Aggregate metrics from multiple test results
 */
export function aggregateMetrics(results) {
    if (results.length === 0) {
        return {
            accuracy: 0,
            tokensTotal: 0,
            tokensInput: 0,
            tokensOutput: 0,
            durationMs: 0,
            toolCount: 0,
            costUsd: 0,
        };
    }
    const sum = results.reduce((acc, r) => ({
        accuracy: acc.accuracy + r.metrics.accuracy,
        tokensTotal: acc.tokensTotal + r.metrics.tokensTotal,
        tokensInput: acc.tokensInput + r.metrics.tokensInput,
        tokensOutput: acc.tokensOutput + r.metrics.tokensOutput,
        durationMs: acc.durationMs + r.metrics.durationMs,
        toolCount: acc.toolCount + r.metrics.toolCount,
        costUsd: acc.costUsd + r.metrics.costUsd,
    }), {
        accuracy: 0,
        tokensTotal: 0,
        tokensInput: 0,
        tokensOutput: 0,
        durationMs: 0,
        toolCount: 0,
        costUsd: 0,
    });
    const count = results.length;
    return {
        accuracy: sum.accuracy / count,
        tokensTotal: Math.round(sum.tokensTotal / count),
        tokensInput: Math.round(sum.tokensInput / count),
        tokensOutput: Math.round(sum.tokensOutput / count),
        durationMs: Math.round(sum.durationMs / count),
        toolCount: Math.round(sum.toolCount / count),
        costUsd: sum.costUsd / count,
    };
}
/**
 * Calculate pass rate from test results
 */
export function calculatePassRate(results) {
    if (results.length === 0)
        return 0;
    const passed = results.filter((r) => r.passed).length;
    return (passed / results.length) * 100;
}
//# sourceMappingURL=concept-accuracy-scorer.js.map