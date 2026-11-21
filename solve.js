const COMMA = 44;
const LF = 10;
const CR = 13;
const QUOTE = 34;

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const rows = [];
  const errors = [];
  const quoteSpecial = /["\r\n]/g;
  const end = text.length;
  let columns = null;
  let width = 0;
  let offset = text.charCodeAt(0) === 0xFEFF ? 1 : 0;
  let line = 1;
  let recordLine;
  let recordRow;

  function report(code) {
    errors.push({ code, line: recordLine, row: recordRow });
  }

  function bare() {
    let start = offset;
    let prefix = '';
    while (offset < end) {
      const code = text.charCodeAt(offset);
      if (code === COMMA || code === LF) break;
      if (code === CR) {
        if (text.charCodeAt(offset + 1) === LF) break;
        report('stray_cr');
        prefix += text.slice(start, offset);
        start = offset + 1;
      }
      offset++;
    }
    return prefix + text.slice(start, offset);
  }

  function quoted() {
    const start = offset + 1;
    let spanStart = start;
    let converted = '';
    let lineBreaks = 0;
    quoteSpecial.lastIndex = start;
    while (quoteSpecial.test(text)) {
      const special = quoteSpecial.lastIndex - 1;
      const code = text.charCodeAt(special);
      if (code === QUOTE) {
        if (text.charCodeAt(special + 1) !== QUOTE) {
          const value = converted + text.slice(spanStart, special);
          offset = special + 1;
          line += lineBreaks;
          const next = text.charCodeAt(offset);
          const atLineEnd = next === LF || (next === CR && text.charCodeAt(offset + 1) === LF);
          if (offset === end || next === COMMA || atLineEnd) return value;
          const tail = bare();
          if (tail.length !== 0) report('quote_junk');
          return value + tail;
        }
        converted += text.slice(spanStart, special + 1);
        spanStart = special + 2;
        quoteSpecial.lastIndex = spanStart;
      } else {
        lineBreaks++;
        if (code === CR) {
          converted += text.slice(spanStart, special) + '\n';
          spanStart = special + (text.charCodeAt(special + 1) === LF ? 2 : 1);
          quoteSpecial.lastIndex = spanStart;
        }
      }
    }

    // A missing closing quote cancels the quoted scan and its tentative line count.
    offset = start;
    report('unterminated_quote');
    return '"' + bare();
  }

  while (offset < end) {
    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let wasQuoted;
    let delimiter;

    do {
      wasQuoted = text.charCodeAt(offset) === QUOTE;
      fields.push(wasQuoted ? quoted() : bare());
      delimiter = text.charCodeAt(offset);
      if (delimiter === COMMA) offset++;
    } while (delimiter === COMMA);

    if (delimiter === LF || delimiter === CR) {
      offset += delimiter === CR ? 2 : 1;
      line++;
    }
    if (fields.length === 1 && fields[0] === '' && !wasQuoted) continue;

    const count = fields.length;
    if (width === 0) width = count;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (count < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: count });
      while (fields.length < width) fields.push('');
    } else if (count > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }

  return { columns: header ? columns ?? [] : null, rows, errors };
}
