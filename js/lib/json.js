/** JSON parsing/formatting helpers with friendly error messages. */

function lineColumnAt(text, position) {
  let line = 1;
  let lastBreak = -1;
  for (let i = 0; i < position && i < text.length; i += 1) {
    if (text[i] === '\n') {
      line += 1;
      lastBreak = i;
    }
  }
  return { line, column: position - lastBreak };
}

function describeError(error, text) {
  const message = error instanceof Error ? error.message : String(error);
  const positionMatch = message.match(/at position (\d+)/);
  if (positionMatch && !/line/i.test(message)) {
    const { line, column } = lineColumnAt(text, Number(positionMatch[1]));
    return 'Invalid JSON: ' + message + ' (line ' + line + ', column ' + column + ')';
  }
  return 'Invalid JSON: ' + message;
}

function parse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: describeError(error, text) };
  }
}

export function formatJson(text) {
  const result = parse(text);
  if (!result.ok) return result;
  return { ok: true, output: JSON.stringify(result.value, null, 2) };
}

export function minifyJson(text) {
  const result = parse(text);
  if (!result.ok) return result;
  return { ok: true, output: JSON.stringify(result.value) };
}

export function validateJson(text) {
  return parse(text);
}
