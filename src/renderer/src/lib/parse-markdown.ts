import hljs from 'highlight.js/lib/core';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import plaintext from 'highlight.js/lib/languages/plaintext';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml'; // HTML
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';

hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('json', json);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('jsx', javascript);
hljs.registerLanguage('tsx', typescript);
hljs.registerLanguage('plaintext', plaintext);

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }),
);

marked.setOptions({ gfm: true });

// AI models sometimes produce malformed tables: either missing the header separator row
// entirely, or using separator rows as visual row dividers (in the wrong position).
// marked requires the separator at position 1 (immediately after the header).
// This function normalises each table block: if the separator is already at position 1,
// leave it alone; otherwise strip any misplaced separators and insert one after the header.
function fixMalformedTables(text: string): string {
  const isTableRow = (line: string) => /^\s*\|.+\|/.test(line);
  const isSeparatorRow = (line: string) => /^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(line);

  const lines = text.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (!isTableRow(lines[i])) {
      result.push(lines[i]);
      i++;
      continue;
    }

    // Collect the entire consecutive table block
    const start = i;
    while (i < lines.length && isTableRow(lines[i])) {
      i++;
    }
    const block = lines.slice(start, i);

    if (block.length < 2 || isSeparatorRow(block[1])) {
      // Single-row table or already valid — pass through unchanged
      result.push(...block);
      continue;
    }

    // Separator is missing or misplaced — strip all separator rows, insert one after header
    const headerRow = block[0];
    const dataRows = block.slice(1).filter((line) => !isSeparatorRow(line));
    const cols = headerRow.split('|').slice(1, -1).length;
    result.push(headerRow, `| ${Array(cols).fill('---').join(' | ')} |`, ...dataRows);
  }

  return result.join('\n');
}

export function parseMarkdown(text: string): string {
  return marked.parse(fixMalformedTables(text)) as string;
}
