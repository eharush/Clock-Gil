/**
 * Finds Hebrew text and reverses it in place. Pure string logic, no VS Code
 * dependency, so it can be tested with plain Node.
 */

export type Mode = 'phrase' | 'word';

export interface Replacement {
  /** Offset of the first replaced UTF-16 unit in the input text. */
  start: number;
  /** Offset just past the last replaced UTF-16 unit. */
  end: number;
  text: string;
}

type Kind = 'heb' | 'ltr' | 'other';

interface Token {
  kind: Kind;
  text: string;
  start: number;
}

// Hebrew letters, niqqud and cantillation marks, geresh and gershayim, and the
// presentation forms. The maqaf (U+05BE) is left out: it separates words.
const HEB = '\\u0591-\\u05BD\\u05BF-\\u05C7\\u05D0-\\u05EA\\u05EF-\\u05F4\\uFB1D-\\uFB4F';
const NON_HEB_WORD_CHAR = `(?:(?![${HEB}])[\\p{L}\\p{N}\\p{M}_])`;

const TOKEN = new RegExp(
  // 1: a Hebrew word. A lone quote between letters is part of it (צה"ל, ג'ירף).
  `([${HEB}]+(?:['"][${HEB}]+)*)` +
    // 2: a word or number in any other script, with inner connectors (3.14, 12:30, don't).
    `|(${NON_HEB_WORD_CHAR}+(?:[.,:/\\-']${NON_HEB_WORD_CHAR}+)*)` +
    // 3: any other single character.
    `|([\\s\\S])`,
  'gu',
);

/** Characters that may sit between the words of one phrase. */
const SOFT_CHAR = /^[  ,.;:!?()\-–—־…]$/;
const SPACE = /[  ]/;
const WORD_JOINER = /^[-–—־]$/;
/** Sentence punctuation that belongs to a phrase when it touches its edge. */
const EDGE_PUNCT = /^[.,!?…]$/;
const CLUSTER = /\P{M}\p{M}*|\p{M}+/gu;
const HAS_LETTER = /\p{L}/u;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(text)) !== null) {
    const kind: Kind = m[1] !== undefined ? 'heb' : m[2] !== undefined ? 'ltr' : 'other';
    tokens.push({ kind, text: m[0], start: m.index });
  }
  return tokens;
}

/** Reverses a Hebrew word, keeping each letter together with its marks. */
function reverseWord(word: string): string {
  return (word.match(CLUSTER) ?? []).reverse().join('');
}

function mirror(ch: string): string {
  return ch === '(' ? ')' : ch === ')' ? '(' : ch;
}

function isSoftChar(token: Token | undefined): boolean {
  return token !== undefined && token.kind === 'other' && SOFT_CHAR.test(token.text);
}

/**
 * Whether the tokens in [from, to) may sit between two words of one phrase.
 * Punctuation only joins words when a space comes with it, so that "א,ב" and
 * "א.ב" (CSV fields, member access) stay two separate strings.
 */
function isSoftGap(tokens: Token[], from: number, to: number): boolean {
  if (from === to) {
    return true;
  }
  let hasSpace = false;
  for (let i = from; i < to; i++) {
    if (!SOFT_CHAR.test(tokens[i].text)) {
      return false;
    }
    hasSpace = hasSpace || SPACE.test(tokens[i].text);
  }
  return hasSpace || (to - from === 1 && WORD_JOINER.test(tokens[from].text));
}

/** Count of "(" minus count of ")" among the tokens in [first, last]. */
function parenBalance(tokens: Token[], first: number, last: number): number {
  let balance = 0;
  for (let i = first; i <= last; i++) {
    if (tokens[i].text === '(') {
      balance++;
    } else if (tokens[i].text === ')') {
      balance--;
    }
  }
  return balance;
}

/**
 * Whether the text next to the phrase edge at `edge` (walking in direction
 * `step`) carries on with a word in another script, as in "תודה, John" or
 * "שלום.txt". Such a phrase is part of a longer left-to-right line, so
 * punctuation around it is not moved.
 */
function continuesPast(tokens: Token[], edge: number, step: 1 | -1): boolean {
  let outer = edge + step;
  while (isSoftChar(tokens[outer])) {
    outer += step;
  }
  return tokens[outer] !== undefined && tokens[outer].kind !== 'other';
}

/**
 * Returns the phrase edge after taking in the sentence punctuation that
 * touches it at `edge`, walking in direction `step`.
 */
function extendOverPunct(tokens: Token[], edge: number, step: 1 | -1): number {
  let p = edge;
  while (tokens[p + step]?.kind === 'other' && EDGE_PUNCT.test(tokens[p + step].text)) {
    p += step;
  }
  return p;
}

/** Reverses the phrase made of tokens [first, last]. */
function reversePhrase(tokens: Token[], first: number, last: number): string {
  const units: string[] = [];
  let i = first;
  while (i <= last) {
    const token = tokens[i];
    if (token.kind === 'heb') {
      units.push(reverseWord(token.text));
      i++;
    } else if (token.kind === 'other') {
      units.push(mirror(token.text));
      i++;
    } else {
      // A run of words in another script reads left to right as a whole
      // ("Visual Studio Code"), so it moves as one unit. Bare numbers each
      // move on their own.
      let end = i;
      let hasLetter = HAS_LETTER.test(token.text);
      for (let k = i + 1; k <= last && tokens[k].kind !== 'heb'; k++) {
        if (tokens[k].kind === 'ltr') {
          end = k;
          hasLetter = hasLetter || HAS_LETTER.test(tokens[k].text);
        }
      }
      if (!hasLetter) {
        end = i;
      }
      let run = '';
      for (let k = i; k <= end; k++) {
        run += tokens[k].text;
      }
      units.push(run);
      i = end + 1;
    }
  }
  return units.reverse().join('');
}

function phraseReplacements(text: string, tokens: Token[]): Replacement[] {
  const result: Replacement[] = [];
  const n = tokens.length;
  let i = 0;
  while (i < n) {
    if (tokens[i].kind !== 'heb') {
      i++;
      continue;
    }

    // The phrase runs from this Hebrew word to the last Hebrew word that can
    // be reached through soft gaps. Words in other scripts may sit in between.
    let first = i;
    let last = i;
    let j = i;
    for (;;) {
      let k = j + 1;
      while (k < n && tokens[k].kind === 'other') {
        k++;
      }
      if (k >= n || !isSoftGap(tokens, j + 1, k)) {
        break;
      }
      j = k;
      if (tokens[j].kind === 'heb') {
        last = j;
      }
    }

    // Take in what belongs to the phrase but lies just outside its first and
    // last word: the other half of a bracket pair, and sentence punctuation.
    const takePunct = !continuesPast(tokens, first, -1) && !continuesPast(tokens, last, 1);
    for (let changed = true; changed; ) {
      changed = false;
      const balance = parenBalance(tokens, first, last);
      if (balance < 0 && tokens[first - 1]?.text === '(') {
        first--;
        changed = true;
      } else if (balance > 0 && tokens[last + 1]?.text === ')') {
        last++;
        changed = true;
      }
      const newFirst = takePunct ? extendOverPunct(tokens, first, -1) : first;
      const newLast = takePunct ? extendOverPunct(tokens, last, 1) : last;
      if (newFirst !== first || newLast !== last) {
        first = newFirst;
        last = newLast;
        changed = true;
      }
    }

    const start = tokens[first].start;
    const end = tokens[last].start + tokens[last].text.length;
    const reversed = reversePhrase(tokens, first, last);
    if (reversed !== text.slice(start, end)) {
      result.push({ start, end, text: reversed });
    }
    i = last + 1;
  }
  return result;
}

function wordReplacements(tokens: Token[]): Replacement[] {
  const result: Replacement[] = [];
  for (const token of tokens) {
    if (token.kind !== 'heb') {
      continue;
    }
    const reversed = reverseWord(token.text);
    if (reversed !== token.text) {
      result.push({ start: token.start, end: token.start + token.text.length, text: reversed });
    }
  }
  return result;
}

/**
 * Returns the edits that reverse the Hebrew text in `text`, in document order
 * and without overlaps. Text in other scripts and numbers is never rewritten.
 */
export function findReplacements(text: string, mode: Mode = 'phrase'): Replacement[] {
  const tokens = tokenize(text);
  return mode === 'word' ? wordReplacements(tokens) : phraseReplacements(text, tokens);
}

/** Returns `text` with its Hebrew text reversed. */
export function reverseHebrew(text: string, mode: Mode = 'phrase'): string {
  let out = '';
  let pos = 0;
  for (const r of findReplacements(text, mode)) {
    out += text.slice(pos, r.start) + r.text;
    pos = r.end;
  }
  return out + text.slice(pos);
}
