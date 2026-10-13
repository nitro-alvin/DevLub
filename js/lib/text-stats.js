/** Text statistics used by the Text Counter tool. */

export function countText(text) {
  const characters = [...text].length;
  const charactersNoSpaces = [...text].filter((char) => !/\s/.test(char)).length;
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const lines = text === '' ? 0 : text.split('\n').length;
  const sentences = text
    .split(/[.!?…。！？]+/)
    .filter((part) => part.trim() !== '').length;
  const utf8Bytes = new TextEncoder().encode(text).length;
  return { characters, charactersNoSpaces, words, lines, sentences, utf8Bytes };
}
