// Convert Quill HTML content to plain text for SMS/WhatsApp
export const htmlToPlainText = (input: string): string => {
     if (!input) return '';
     const brNormalized = input.replace(/<br\s*\/?>(\s*)/gi, '\n');
     const pNormalized = brNormalized.replace(/<\/p>\s*<p>/gi, '\n\n');
     const noTags = pNormalized.replace(/<[^>]*>/g, '');
     const entitiesDecoded = noTags
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&quot;/gi, '"')
          .replace(/&#39;/gi, "'");
     return entitiesDecoded
          .replace(/[ \t\xA0]+/g, ' ')
          .replace(/[\r\f]+/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
}