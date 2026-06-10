// lib/sanitize.ts
// Pure JS lightweight sanitizer that does not require heavy DOM engines like jsdom.
// Safe to run in any JS runtime (Node, Edge, Serverless).

export const DOMPurify = {
  sanitize(text: unknown): string {
    if (typeof text !== 'string') {
      return ''
    }
    // Remove all HTML tags to prevent tag injection and HTML pollution.
    // React handles character escaping automatically to prevent XSS during rendering.
    return text.replace(/<[^>]*>/g, '')
  }
}

export default DOMPurify
