import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { findReplacements, reverseHebrew } from '../hebrew';

function check(input: string, expected: string, mode: 'phrase' | 'word' = 'phrase'): void {
  assert.equal(reverseHebrew(input, mode), expected);
  // Reversing twice must give back the original text.
  assert.equal(reverseHebrew(expected, mode), input);
}

test('reverses a single Hebrew word in place', () => {
  check('םולש', 'שלום');
  check('print("םולש")', 'print("שלום")');
  check('  const x = \'םולש\'; // ok', '  const x = \'שלום\'; // ok');
});

test('leaves other scripts and numbers alone', () => {
  const text = 'const hello = "world"; let n = 12345; // привет 3.14';
  assert.equal(reverseHebrew(text), text);
  assert.deepEqual(findReplacements(text), []);
});

test('reverses a whole phrase, including the word order', () => {
  check('"םלוע םולש"', '"שלום עולם"');
  check('// תאזה הרעהה לש רואית', '// תיאור של ההערה הזאת');
});

test('each string literal is reversed on its own', () => {
  check('["םולש", "הדות"]', '["שלום", "תודה"]');
  check('"םולש" + " " + "םלוע"', '"שלום" + " " + "עולם"');
  check('t("םולש") || t(\'הדות\')', 't("שלום") || t(\'תודה\')');
});

test('fields without spaces are separate strings', () => {
  check('םולש,הדות,5', 'שלום,תודה,5');
  check('םולש\tהדות', 'שלום\tתודה');
  check('םולש.txt', 'שלום.txt');
  check('obj.םולש = 1', 'obj.שלום = 1');
});

test('numbers inside a phrase keep their digits', () => {
  check('"םירפס 15 יל שי"', '"יש לי 15 ספרים"');
  check('"12:30 העשב 3.5 ריחמ"', '"12:30 מחיר 3.5 בשעה"');
  check('ןאכ 20 10 םירפסמ', 'מספרים 10 20 כאן');
});

test('a run of Latin words inside a phrase stays intact', () => {
  check('"דואמ Visual Studio Code בהוא ינא"', '"אני אוהב Visual Studio Code מאוד"');
  check('"הדות Windows 10 תסרג"', '"גרסת Windows 10 תודה"');
  check('הדות abc (def) ghi םולש', 'שלום abc (def) ghi תודה');
});

test('Latin text outside the phrase does not move', () => {
  check('return םולש', 'return שלום');
  check('הדות, John', 'תודה, John');
  check('title: םלוע םולש # note', 'title: שלום עולם # note');
});

test('punctuation between words travels with the phrase', () => {
  check('"םלוע ,םולש"', '"שלום, עולם"');
  check('רפס-תיב', 'בית-ספר');
  check('רפס־תיב', 'בית־ספר');
});

test('sentence punctuation at the edge moves to the other edge', () => {
  check('"!םלוע םולש"', '"שלום עולם!"');
  check('// .םלוע םולש', '// שלום עולם.');
  check('"?המ ...זא"', '"אז... מה?"');
});

test('brackets are mirrored and kept paired', () => {
  check('"(םלוע) םולש"', '"שלום (עולם)"');
  check('"םולש (םלוע)"', '"(עולם) שלום"');
  check('"!(םלוע) םולש"', '"שלום (עולם)!"');
  check('foo(םלוע םולש)', 'foo(שלום עולם)');
  check('"הדות (abc) םולש"', '"שלום (abc) תודה"');
});

test('quotes inside a Hebrew word belong to the word', () => {
  check('"ל"הצ"', '"צה"ל"');
  check("ףרי'ג", "ג'ירף");
  check('׳וכו', 'וכו׳');
});

test('niqqud stays on its letter', () => {
  // shin + shin dot + qamats, lamed, vav + holam, final mem
  const shalom = '\u05E9\u05C1\u05B8\u05DC\u05D5\u05B9\u05DD';
  const reversed = '\u05DD\u05D5\u05B9\u05DC\u05E9\u05C1\u05B8';
  check(reversed, shalom);
});

test('never joins text across lines', () => {
  check('םולש\nהדות', 'שלום\nתודה');
  check('םולש\r\nהדות\r\n', 'שלום\r\nתודה\r\n');
  check('.םולש\n.הדות', 'שלום.\nתודה.');
});

test('word mode reverses every Hebrew word where it stands', () => {
  check('"םירפס 15 יל שי"', '"ספרים 15 לי יש"', 'word');
  check('"!םלוע ,םולש"', '"!עולם ,שלום"', 'word');
  check('ל"הצ abc', 'צה"ל abc', 'word');
});

test('replacements carry correct offsets', () => {
  const text = 'a = "םולש"; b = "אבא"; c = "הדות"';
  const reps = findReplacements(text);
  // "אבא" reads the same both ways, so it needs no edit.
  assert.deepEqual(
    reps.map((r) => [text.slice(r.start, r.end), r.text]),
    [
      ['םולש', 'שלום'],
      ['הדות', 'תודה'],
    ],
  );
});

test('random text: applying twice restores it, and only Hebrew phrases change', () => {
  const pieces = [
    'שלום', 'םלוע', 'א', 'צה"ל', "ג'ירף", 'בָּרוּךְ', 'abc', 'Hello', 'x_1', '15', '3.14', '2024-01-01',
    ' ', ' ', ' ', '  ', '\t', '\n', ',', '.', ', ', '. ', '!', '?', ':', ';', '-', '־', '(', ')',
    '"', "'", '`', '=', '+', '/', '{', '}', '[', ']', '<', '>', '…', '😀', 'é',
  ];
  let seed = 12345;
  const rand = (n: number): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % n;
  };
  for (let round = 0; round < 20000; round++) {
    let text = '';
    for (let k = 1 + rand(12); k > 0; k--) {
      text += pieces[rand(pieces.length)];
    }
    // A quote between a Hebrew letter and sentence punctuation can read either
    // as a string delimiter or as part of a word once the punctuation moves.
    if (/[.,!?…]['"][\u0591-\u05F4]|[\u0591-\u05F4]['"][.,!?…]/.test(text)) {
      continue;
    }
    for (const mode of ['phrase', 'word'] as const) {
      const once = reverseHebrew(text, mode);
      assert.equal(reverseHebrew(once, mode), text, JSON.stringify({ text, once, mode }));
      assert.equal(once.length, text.length);
      // Everything outside the reported ranges is untouched, and what is
      // inside holds the same characters apart from mirrored brackets.
      const sortChars = (s: string): string => [...s.replace(/[()]/g, '(')].sort().join('');
      for (const r of findReplacements(text, mode)) {
        const before = text.slice(r.start, r.end);
        assert.equal(sortChars(r.text), sortChars(before));
        assert.match(before, /[֑-״]/);
      }
    }
  }
});
