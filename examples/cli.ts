import { Command } from "@cliffy/command";
import { JsonStringifyStream } from "@std/json";
import { Lexer } from "../lib/lexer.ts";
import { Parser } from "../lib/parser.ts";

await new Command()
  .name("xml-parser")
  .description(
    "CLI for parsing large XML files efficiently in a streaming fashion using Deno and outputting NDJSON",
  )
  .arguments("<input:string> [output:string]")
  .option("-c, --collect <name:string>", "Tags to collect", {
    collect: true,
    required: true,
  })
  .option(
    "-a, --attribute-only <name:string>",
    "Tags to collect only with attributes",
    { collect: true },
  )
  .option("-d, --dump", "Dump the token information")
  .option("--ignore-whitespace", "Ignore whitespace", { default: true })
  .option("--no-ignore-whitespace", "Don't ignore whitespace")
  .action(async (options, source, target) => {
    const { attributeOnly, collect, dump, ignoreWhitespace } = options;

    const parser = new Parser();
    for (const tag of attributeOnly ?? []) {
      parser.emitElementsWhenEndOfAttributes.add(tag);
    }
    for (const tag of collect ?? []) {
      parser.emitElementsWhenClosed.add(tag);
    }
    const lexer = new Lexer(parser, { dump, ignoreWhitespace });

    const input = source === "-" ? Deno.stdin : await Deno.open(source);
    input.readable
      .pipeThrough(new TextDecoderStream())
      .pipeTo(lexer.writable);

    const output = !target
      ? Deno.stdout
      : await Deno.open(target, { write: true, create: true });
    await parser.readable
      .pipeThrough(new JsonStringifyStream())
      .pipeThrough(new TextEncoderStream())
      .pipeTo(output.writable);
  })
  .parse(Deno.args);
