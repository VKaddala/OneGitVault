/**
 * Translation service for README documentation and repository descriptions.
 * Uses free, multi-engine translation (MyMemory + Google Translate client endpoint fallback)
 * with local in-memory caching to ensure instant toggles and zero overhead.
 */

const translationCache = new Map<string, string>();

/**
 * Translates a given text string into English.
 */
export async function translateTextToEnglish(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  // Check cache first
  const cacheKey = `en:${trimmed.slice(0, 80)}:${trimmed.length}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // Engine 1: MyMemory Translated API (high accuracy neural translation, free)
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=autodetect|en`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (translated && typeof translated === 'string' && !translated.startsWith('MYMEMORY WARNING')) {
        translationCache.set(cacheKey, translated);
        return translated;
      }
    }
  } catch (e) {
    console.warn('MyMemory translate error, trying fallback:', e);
  }

  // Engine 2: Google Translate client fallback
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const sentences = data[0].map((item: any) => item[0]).filter(Boolean).join('');
        if (sentences) {
          translationCache.set(cacheKey, sentences);
          return sentences;
        }
      }
    }
  } catch (e) {
    console.warn('Google Translate client error:', e);
  }

  // If all fails, return original text safely
  return text;
}

/**
 * Translates markdown content into English while preserving code blocks,
 * inline code, badges, and image links.
 */
export async function translateMarkdownToEnglish(markdown: string): Promise<string> {
  if (!markdown || !markdown.trim()) return markdown;

  // Temporary placeholders for code blocks to prevent syntax corruption
  const codeBlocks: string[] = [];
  let preservedMarkdown = markdown.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // Preserve inline code
  const inlineCodes: string[] = [];
  preservedMarkdown = preservedMarkdown.replace(/`[^`\n]+`/g, (match) => {
    inlineCodes.push(match);
    return `__INLINE_CODE_${inlineCodes.length - 1}__`;
  });

  // Split into paragraphs / blocks
  const paragraphs = preservedMarkdown.split(/\n\s*\n/);
  const translatedParagraphs: string[] = [];

  // Batch translate paragraphs (max 10 paragraphs at a time to prevent rate limits)
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    if (!p) {
      translatedParagraphs.push('');
      continue;
    }

    // Skip paragraphs that are solely images, badges, or placeholders
    if (
      p.startsWith('__CODE_BLOCK_') ||
      p.startsWith('![') ||
      (p.startsWith('<img') && p.endsWith('>')) ||
      /^\[!\[.*?\]\(.*?\)\]\(.*?\)$/.test(p)
    ) {
      translatedParagraphs.push(p);
      continue;
    }

    try {
      // If paragraph is reasonable length, translate it
      if (p.length < 1500) {
        const translated = await translateTextToEnglish(p);
        translatedParagraphs.push(translated);
      } else {
        // Split very long paragraphs into smaller sentences
        const sentences = p.split(/([。！？.!?\n]+)/);
        const translatedSentences: string[] = [];
        for (let s = 0; s < sentences.length; s += 2) {
          const sent = sentences[s];
          const punct = sentences[s + 1] || '';
          if (sent && sent.trim()) {
            const tr = await translateTextToEnglish(sent);
            translatedSentences.push(tr + punct);
          } else if (sent) {
            translatedSentences.push(sent + punct);
          }
        }
        translatedParagraphs.push(translatedSentences.join(' '));
      }
    } catch {
      translatedParagraphs.push(p);
    }
  }

  let finalMarkdown = translatedParagraphs.join('\n\n');

  // Restore inline code
  finalMarkdown = finalMarkdown.replace(/__INLINE_CODE_(\d+)__/g, (_, idx) => {
    return inlineCodes[parseInt(idx, 10)] || '';
  });

  // Restore code blocks
  finalMarkdown = finalMarkdown.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => {
    return codeBlocks[parseInt(idx, 10)] || '';
  });

  return finalMarkdown;
}
