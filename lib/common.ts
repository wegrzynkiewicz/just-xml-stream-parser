import { predefinedEntityMap } from "./entities.ts";

export interface XMLHandler {
  attributeName(name: string): void;
  attributeValue(value: string): void;
  cdataNode(text: string): void;
  closeElement(tag: string): void;
  commentNode(comment: string): void;
  endOfAttributes(): void;
  endOfFile(): void;
  startElement(tag: string): void;
  textNode(text: string): void;
}

export function isWhitespace(char: string): boolean {
  return char === " " || char === "\n" || char === "\r" || char === "\t";
}

export function isQuote(char: string): boolean {
  return char === "'" || char === `"`;
}

export function isAlphanumeric(char: string): boolean {
  const c = char.charCodeAt(0);
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
}

export function decodePredefinedEntity(text: string): string {
  const charCode = predefinedEntityMap.get(text);
  if (charCode === undefined) {
    throw new Error(`unknown-entity: ${text}`);
  }
  return String.fromCharCode(charCode);
}
