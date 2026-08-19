/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "novel",

  extras: () => [],

  rules: {
    source_file: ($) => seq(
      repeat($._newline),
      repeat(seq(choice($.metadata_block, $.chapter_block, $.bookmark), repeat($._newline)))
    ),

    metadata_block: ($) => seq(
      "/**",
      $._newline,
      repeat1($.metadata_entry),
      $._block_end
    ),

    metadata_entry: ($) => seq(
      $._line_prefix,
      field("key", $.metadata_key),
      /[ \t]+/,
      field("value", $.metadata_value),
      $._newline
    ),

    metadata_key: () => choice("@novel-title", "@format-version"),
    metadata_value: () => /[^\r\n]+/,

    chapter_block: ($) => seq(
      "/**",
      $._newline,
      $._line_prefix,
      field("title", $.chapter_title),
      $._newline,
      $._blank_line,
      repeat($.paragraph),
      $._line_prefix,
      "@chapter-id",
      /[ \t]+/,
      field("id", $.chapter_id),
      $._newline,
      $._block_end
    ),

    chapter_title: () => /[^@* \t\r\n][^\r\n]*/,

    paragraph: ($) => prec.left(seq(repeat1($.text_line), repeat1($._blank_line))),
    text_line: ($) => seq($._line_prefix, /[^@* \t\r\n][^\r\n]*/, $._newline),
    _line_prefix: () => /[ \t]*\*[ \t]+/,
    _blank_line: ($) => seq(/[ \t]*\*[ \t]*/, $._newline),
    _block_end: () => /[ \t]*\*\/[ \t]*/,

    chapter_id: () => /[A-Za-z0-9][A-Za-z0-9_-]*/,

    bookmark: ($) => seq(
      "/**",
      /[ \t]+/,
      "@bookmark",
      /[ \t]+/,
      field("attributes", $.bookmark_attributes),
      /[ \t]+\*\//
    ),
    bookmark_attributes: () => /[^* \t\r\n]+([ \t]+[^* \t\r\n]+)*/,

    _newline: () => /\r?\n/
  }
});
