import type { XMLHandler } from "./common.ts";
import { unknownToken } from "./lexer-tokens.ts";

export interface LexerOptions {
  /**
   * Dump the token information.
   *
   * Performance will be affected.
   * @default false
   */
  dump?: boolean;

  /**
   * Ignore whitespace.
   * @default true
   * @example
   * ```xml
   * <root>
   *  <child>
   *   text
   *  </child>
   * </root>
   * ```
   * will be treated as
   * ```xml
   * <root><child>text</child></root>
   * ```
   */
  ignoreWhitespace?: boolean;
}

export type Token = (lexer: Lexer, char: string) => Token;

export class Lexer {
  public memo: string = "";
  public token: Token = unknownToken;
  public jumpToken: Token = unknownToken;
  public omitCDataCount: number = 0;
  public comment: string = "";
  public dtdBalance: number = 0;
  public entityHexadecimalMemo: string = "";
  public entityDecimalMemo: string = "";
  public entityPredefinedMemo: string = "";
  public tagName = "";

  public column: number = 0;
  public depth: number = 0;
  public line: number = 0;
  public readonly writable: WritableStream<string> = new WritableStream<string>(this);

  public flushMemo: () => string;
  public dump: (c: string) => void;

  public constructor(
    public readonly handler: XMLHandler,
    options: LexerOptions = {},
  ) {
    this.flushMemo = options.ignoreWhitespace
      ? this.flushTrimmedMemo
      : this.flushRawMemo;
    this.dump = options.dump ? this.dumpChar : () => {};
  }

  public write(chunk: string): void {
    const len = chunk.length;
    for (let i = 0; i < len; i++) {
      const c = chunk[i];
      this.column++;
      this.token = this.token(this, c);
      this.dump(c);
      if (c === "\n") {
        this.line++;
        this.column = 0;
      }
    }
  }

  public close(): void {
    this.handler.endOfFile();
  }

  public closeElement(tag: string): void {
    this.handler.closeElement(tag);
    this.memo = "";
    this.depth--;
    this.tagName = "";
  }

  public startElement(): void {
    const tag = this.memo.trim();
    this.tagName = tag;
    this.handler.startElement(tag);
    this.depth++;
    this.memo = "";
  }

  private flushTrimmedMemo(): string {
    const memo = this.memo.trim();
    this.memo = "";
    return memo;
  }

  private flushRawMemo(): string {
    const memo = this.memo;
    this.memo = "";
    return memo;
  }

  private dumpChar(c: string): void {
    const { column, depth, line, memo, token } = this;
    const code = c.charCodeAt(0).toString(16).padStart(4, "0");
    const char = JSON.stringify(c);
    const len = memo.length;
    const text = JSON.stringify(memo.substring(0, 32));
    console.error(
      `${line}:${column} 0x${code} ${char} => ${token.name} dep=${depth} len=${len} mem=${text}`,
    );
  }
}
