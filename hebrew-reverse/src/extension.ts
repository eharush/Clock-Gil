import * as vscode from 'vscode';
import { findReplacements, Mode } from './hebrew';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand('hebrewReverse.reverse', reverseInEditor),
  );
}

export function deactivate(): void {}

async function reverseInEditor(editor: vscode.TextEditor): Promise<void> {
  const document = editor.document;
  const mode = vscode.workspace
    .getConfiguration('hebrewReverse', document)
    .get<Mode>('mode', 'phrase');

  // With a selection, only the selected text is processed. Otherwise the whole file.
  const selected = editor.selections.filter((s) => !s.isEmpty);
  const ranges: vscode.Range[] =
    selected.length > 0
      ? selected
      : [new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length))];

  const edits: { range: vscode.Range; text: string }[] = [];
  for (const range of ranges) {
    const base = document.offsetAt(range.start);
    for (const r of findReplacements(document.getText(range), mode)) {
      edits.push({
        range: new vscode.Range(
          document.positionAt(base + r.start),
          document.positionAt(base + r.end),
        ),
        text: r.text,
      });
    }
  }

  if (edits.length === 0) {
    void vscode.window.showInformationMessage(
      selected.length > 0
        ? vscode.l10n.t('No Hebrew text to reverse in the selection.')
        : vscode.l10n.t('No Hebrew text to reverse in this file.'),
    );
    return;
  }

  // One edit, so a single undo restores the file.
  const applied = await editor.edit((builder) => {
    for (const e of edits) {
      builder.replace(e.range, e.text);
    }
  });
  if (applied) {
    vscode.window.setStatusBarMessage(
      edits.length === 1
        ? vscode.l10n.t('Reversed 1 Hebrew string.')
        : vscode.l10n.t('Reversed {0} Hebrew strings.', edits.length),
      4000,
    );
  }
}
