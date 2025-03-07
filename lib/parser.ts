import type { XMLHandler } from "./common.ts";

export interface ParserAttribute {
  key: string;
  val: string;
}

export interface ParserElement {
  attrs?: ParserAttribute[];
  nodes?: ParserElement[];
  val?: string;
  tag: string;
}

export class Parser implements XMLHandler {
  private root?: ParserElement;
  public readonly emitElementsWhenClosed = new Set<string>();
  public readonly emitElementsWhenEndOfAttributes = new Set<string>();
  private readonly parents: ParserElement[] = [];
  private collectingChildrenOfElement?: ParserElement;

  private attribute?: ParserAttribute;
  private element?: ParserElement;

  private controller!: ReadableStreamDefaultController<ParserElement>;
  public readonly readable = new ReadableStream<ParserElement>({
    start: (c) => this.controller = c,
  });

  public attributeName(key: string): void {
    if (!this.element) {
      throw new Error("cannot-create-attribute");
    }
    this.attribute = { key, val: "" };
    this.element.attrs = this.element.attrs ?? [];
    this.element.attrs.push(this.attribute);
  }

  public attributeValue(value: string): void {
    if (!this.attribute) {
      throw new Error("cannot-update-attribute");
    }
    this.attribute.val = value;
  }

  public cdataNode(text: string): void {
    if (!this.element) {
      throw new Error("cannot-create-text");
    }
    this.element.val = (this.element.val ?? "") + text;
  }

  public closeElement(tag: string): void {
    const closingElement = this.parents.pop();
    if (!closingElement) {
      throw new Error("empty-parents");
    }
    if (closingElement.tag !== tag) {
      throw new Error("unexpected-close-tag");
    }
    if (this.collectingChildrenOfElement === closingElement) {
      this.collectingChildrenOfElement = undefined;
    }
    const parent = this.parents[this.parents.length - 1];
    if (parent && this.collectingChildrenOfElement) {
      parent.nodes = parent.nodes ?? [];
      parent.nodes.push(closingElement);
    }
    this.element = parent;

    if (this.emitElementsWhenClosed.has(tag)) {
      this.controller.enqueue(closingElement);
    }
  }

  public commentNode(): void {
    // nothing
  }

  public endOfAttributes(): void {
    if (this.element === undefined) {
      return;
    }
    if (this.emitElementsWhenEndOfAttributes.has(this.element.tag)) {
      this.controller.enqueue(this.element);
    }
  }

  public endOfFile(): void {
    this.controller.close();
  }

  public startElement(tag: string): void {
    const element: ParserElement = { tag };
    if (this.root === undefined) {
      this.root = element;
    }
    this.parents.push(element);
    this.element = element;
    if (
      this.collectingChildrenOfElement === undefined &&
      this.emitElementsWhenClosed.has(tag)
    ) {
      this.collectingChildrenOfElement = element;
    }
  }

  public textNode(text: string): void {
    if (!this.element) {
      throw new Error("cannot-create-text");
    }
    this.element.val = (this.element.val ?? "") + text;
  }
}
