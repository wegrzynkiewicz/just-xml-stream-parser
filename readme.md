# JUST XML Stream Parser

## Overview

This project is a simple XML parser written in TypeScript, designed to be used
with Deno. It provides a command-line interface (CLI) for parsing large XML
files and outputting the results in NDJSON format. The parser supports various
options for customizing the parsing behavior, such as collecting specific tags,
ignoring whitespace. The main feature of this parser is its ability to handle
large XML files efficiently by processing them in a stream, which helps in
utilizing memory effectively.

## Features

- Parse large XML files and output NDJSON.
- Collect specific elements and attributes.
- Ignore or include whitespace.
- Supports predefined XML entities.
- Works in a streaming fashion.
- High performance.
- Handles malformed HTML entities.
- Detects comments.
- Ignores DTD definitions.

## Installation

To use this project, you need to have [Deno](https://deno.land/) installed. You
can install Deno by following the instructions on the
[official website](https://deno.land/#installation).

## Usage

### Command-Line Interface

The CLI provides various options for parsing XML files. Here is the basic usage:

```sh
deno run --allow-read --allow-write jsr:@wegrzynkiewicz/just-xml-stream-parser/examples/cli.ts -c book -c author -a library input.xml
```

### Options

- `-c, --collect <name:string>`: Tags to collect (required, can be used multiple
  times).
- `-a, --attribute-only <name:string>`: Tags to collect only with attributes
  (can be used multiple times).
- `--ignore-whitespace`: Ignore whitespace (default: true).
- `--no-ignore-whitespace`: Don't ignore whitespace.

### Examples

Here is an example of an XML file:

```xml
<library version="4.21" last_update="2025-03-07T23:05:57">
  <authors>
    <author id="1">
      <name>Author 1</name>
    </author>
    <author id="2">
      <name>Author 2</name>
    </author>
  </authors>
  <books>
    <book id="1" author_id="1">
      <title>Example Book 1</title>
      <year>2021</year>
      <malformed_url>https://example.com?p1=v1&p2=v2</malformed_url>
      <url>https://example.com?p1=v1&amp;p2=v2</url>
    </book>
    <book id="2" author_id="2">
      <title>Example Book 2</title>
      <year>2022</year>
      <malformed_url>https://example.com?p1=v1&p2=v2</malformed_url>
      <url>https://example.com?p1=v1&amp;p2=v2</url>
    </book>
  </books>
</library>
```

### Example NDJSON

The output of the parser is an NDJSON file. Here is an example of what the
output might look like:

```json
{
  "tag": "library",
  "attrs": [
    { "key": "version", "val": "4.21" },
    { "key": "last_update", "val": "2025-03-07T23:05:57" }
  ]
}
{
  "tag": "book",
  "attrs": [
    { "key": "id", "val": "1" },
    { "key": "author_id", "val": "1" }
  ],
  "nodes": [
    { "tag": "title", "val": "Example Book 1" },
    { "tag": "year", "val": "2021" },
    { "tag": "malformed_url", "val": "https://example.com?p1=v1&p2=v2" },
    { "tag": "url", "val": "https://example.com?p1=v1&p2=v2" }
  ]
}
{
  "tag": "book",
  "attrs": [
    { "key": "id", "val": "2" },
    { "key": "author_id", "val": "2" }
  ],
  "nodes": [
    { "tag": "title", "val": "Example Book 2" },
    { "tag": "year", "val": "2022" },
    { "tag": "malformed_url", "val": "https://example.com?p1=v1&p2=v2" },
    { "tag": "url", "val": "https://example.com?p1=v1&p2=v2" }
  ]
}
{
  "tag": "author",
  "attrs": [
    { "key": "id", "val": "1" }
  ],
  "nodes": [
    { "tag": "name", "val": "Author 1" }
  ]
}
{
  "tag": "author",
  "attrs": [
    { "key": "id", "val": "2" }
  ],
  "nodes": [
    { "tag": "name", "val": "Author 2" }
  ]
}
```

### Programmatic Usage

You can also use the parser programmatically in your TypeScript code:

```typescript
import { Lexer, Parser } from "@wegrzynkiewicz/just-xml-stream-parser";

const parser = new Parser();
parser.emitElementsWhenClosed.add("book");
parser.emitElementsWhenClosed.add("author");
parser.emitElementsWhenEndOfAttributes.add("library");

(async function () {
  const reader = parser.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    console.log(value);
  }
})();

const lexer = new Lexer(parser, { ignoreWhitespace: true });
lexer.write('<library version="4.21" last_up');
lexer.write('date="2025-03-07T23:05:57"><authors><author');
// ...
lexer.close();
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on
GitHub.

## Acknowledgments

- [Deno](https://deno.land/)
- [Cliffy](https://deno.land/x/cliffy)
