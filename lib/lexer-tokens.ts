import {
  decodePredefinedEntity,
  isAlphanumeric,
  isQuote,
  isWhitespace,
} from "./common.ts";
import type { Lexer, Token } from "./lexer.ts";

export function carriageReturnToken(lexer: Lexer, c: string): Token {
  if (c === "\n") {
    lexer.memo += c;
    return lexer.jumpToken;
  }
  lexer.memo += "\n";
  return lexer.jumpToken(lexer, c);
}

export function cdataCollectToken(lexer: Lexer, c: string): Token {
  if (c === "\r") {
    lexer.jumpToken = cdataCollectToken;
    return carriageReturnToken;
  }
  lexer.memo += c;
  if (c === ">" && lexer.memo.endsWith("]]>")) {
    const text = lexer.memo.substring(0, lexer.memo.length - 3).trim();
    lexer.handler.cdataNode(text);
    lexer.memo = "";
    return unknownToken;
  }
  return cdataCollectToken;
}

export function cdataOmitToken(lexer: Lexer): Token {
  lexer.omitCDataCount--;
  if (lexer.omitCDataCount === 0) {
    return cdataCollectToken;
  }
  return cdataOmitToken;
}

export function cdataStartToken(lexer: Lexer): Token {
  lexer.omitCDataCount = 5;
  return cdataOmitToken;
}

export function commentOmitToken(lexer: Lexer, c: string): Token {
  lexer.comment += c;
  if (c === ">" && lexer.comment.endsWith("-->")) {
    const comment = lexer.comment.substring(0, lexer.comment.length - 3).trim();
    lexer.handler.commentNode(comment);
    return unknownToken;
  }
  return commentOmitToken;
}

export function commentStartToken(lexer: Lexer): Token {
  lexer.comment = "";
  return commentOmitToken;
}

export function dtdToken(lexer: Lexer, c: string): Token {
  if (c === "<") {
    lexer.dtdBalance++;
    return dtdToken;
  }
  if (c === ">") {
    if (lexer.dtdBalance === 0) {
      return waitingForLessThanToken;
    }
    lexer.dtdBalance--;
    return dtdToken;
  }
  return dtdToken;
}

export function exclamationToken(lexer: Lexer, c: string): Token {
  switch (c) {
    case "-":
      return commentStartToken;
    case "[":
      return cdataStartToken;
    default:
      return dtdToken(lexer, c);
  }
}

export function xmlDeclarationToken(_: Lexer, c: string): Token {
  if (c === ">") {
    return waitingForLessThanToken;
  }
  return xmlDeclarationToken;
}

export function entityHexadecimalToken(lexer: Lexer, c: string): Token {
  if (c === ";") {
    const charCode = parseInt(lexer.entityHexadecimalMemo, 16);
    lexer.entityHexadecimalMemo = "";
    lexer.memo += String.fromCharCode(charCode);
    return lexer.jumpToken;
  }
  lexer.entityHexadecimalMemo += c;
  return entityHexadecimalToken;
}

export function entityDecimalToken(lexer: Lexer, c: string): Token {
  if (c === ";") {
    const charCode = parseInt(lexer.entityDecimalMemo, 10);
    lexer.entityDecimalMemo = "";
    lexer.memo += String.fromCharCode(charCode);
    return lexer.jumpToken;
  }
  lexer.entityDecimalMemo += c;
  return entityDecimalToken;
}

export function entityNumericToken(lexer: Lexer, c: string): Token {
  if (c === "x") {
    return entityHexadecimalToken;
  }
  return entityDecimalToken(lexer, c);
}

export function entityPredefinedToken(lexer: Lexer, c: string): Token {
  if (c === ";") {
    lexer.memo += decodePredefinedEntity(lexer.entityPredefinedMemo);
    lexer.entityPredefinedMemo = "";
    return lexer.jumpToken;
  }
  if (!isAlphanumeric(c)) {
    lexer.memo += `&${lexer.entityPredefinedMemo}`;
    lexer.entityPredefinedMemo = "";
    return lexer.jumpToken;
  }
  lexer.entityPredefinedMemo += c;
  return entityPredefinedToken;
}

export function entityToken(lexer: Lexer, c: string): Token {
  if (c === "#") {
    return entityNumericToken;
  }
  return entityPredefinedToken(lexer, c);
}

export function textToken(lexer: Lexer, c: string): Token {
  if (c === "<") {
    const text = lexer.flushMemo();
    if (text.length > 0) {
      lexer.handler.textNode(text);
    }
    return lessThanToken;
  }
  if (c === "&") {
    lexer.jumpToken = textToken;
    return entityToken;
  }
  if (c === "\r") {
    lexer.jumpToken = textToken;
    return carriageReturnToken;
  }
  lexer.memo += c;
  return textToken;
}

export function attributeValueNakedToken(lexer: Lexer, c: string): Token {
  if (isWhitespace(c)) {
    const value = lexer.flushMemo();
    lexer.handler.attributeValue(value);
    return attributeSpaceToken;
  }
  lexer.memo += c;
  return attributeValueNakedToken;
}

export function attributeValueQuotedToken(lexer: Lexer, c: string): Token {
  if (isQuote(c)) {
    const value = lexer.flushMemo();
    lexer.handler.attributeValue(value);
    return attributeSpaceToken;
  }
  if (c === "&") {
    lexer.jumpToken = attributeValueQuotedToken;
    return entityToken;
  }
  lexer.memo += c;
  return attributeValueQuotedToken;
}

export function attributeEqualsToken(lexer: Lexer, c: string): Token {
  if (isQuote(c)) {
    return attributeValueQuotedToken;
  }
  if (isWhitespace(c)) {
    return attributeEqualsToken;
  }
  return attributeValueNakedToken(lexer, c);
}

export function attributeNameWithoutValueToken(lexer: Lexer, c: string): Token {
  if (isWhitespace(c)) {
    return attributeNameWithoutValueToken;
  }
  const value = lexer.flushMemo();
  lexer.handler.attributeName(value);
  if (c === "=") {
    return attributeEqualsToken;
  }
  return attributeNameToken(lexer, c);
}

export function attributeNameToken(lexer: Lexer, c: string): Token {
  if (isWhitespace(c)) {
    return attributeNameWithoutValueToken;
  }
  if (c === ">") {
    const value = lexer.flushMemo();
    lexer.handler.attributeName(value);
    lexer.handler.endOfAttributes();
    return greaterThanToken;
  }
  if (c === "=") {
    const value = lexer.flushMemo();
    lexer.handler.attributeName(value);
    return attributeEqualsToken;
  }
  lexer.memo += c;
  return attributeNameToken;
}

export function attributeSpaceToken(lexer: Lexer, c: string): Token {
  if (isWhitespace(c)) {
    return attributeSpaceToken;
  }
  if (c === ">") {
    lexer.handler.endOfAttributes();
    return greaterThanToken;
  }
  if (c === "/") {
    lexer.memo = "";
    return elementSelfClosingToken;
  }
  return attributeNameToken(lexer, c);
}

export function greaterThanToken(lexer: Lexer, c: string): Token {
  if (lexer.depth <= 1) {
    return waitingForLessThanToken;
  }
  return unknownToken(lexer, c);
}

export function elementSelfClosingToken(lexer: Lexer, c: string): Token {
  if (c === ">") {
    const tag = lexer.tagName;
    lexer.handler.endOfAttributes();
    lexer.closeElement(tag);
    return greaterThanToken;
  }
  return elementSelfClosingToken;
}

export function elementCloseToken(lexer: Lexer, c: string): Token {
  if (c === ">") {
    const tag = lexer.flushMemo();
    lexer.closeElement(tag);
    return greaterThanToken;
  }
  lexer.memo += c;
  return elementCloseToken;
}

export function elementStartToken(lexer: Lexer, c: string): Token {
  if (c === ">") {
    lexer.startElement();
    lexer.handler.endOfAttributes();
    return greaterThanToken;
  }
  if (isWhitespace(c)) {
    lexer.startElement();
    return attributeSpaceToken;
  }
  if (c === "/") {
    lexer.startElement();
    return elementSelfClosingToken;
  }
  lexer.memo += c;
  return elementStartToken;
}

export function lessThanToken(lexer: Lexer, c: string): Token {
  switch (c) {
    case "!":
      return exclamationToken;
    case "/":
      return elementCloseToken;
    case "?":
      return xmlDeclarationToken;
    default: {
      return elementStartToken(lexer, c);
    }
  }
}

export function waitingForLessThanToken(_: Lexer, c: string): Token {
  if (c === "<") {
    return lessThanToken;
  }
  return waitingForLessThanToken;
}

export function unknownToken(lexer: Lexer, c: string): Token {
  if (c === "<") {
    return lessThanToken;
  }
  return textToken(lexer, c);
}
