import { closeSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setFlagsFromString } from 'node:v8';

setFlagsFromString('--no-incremental-marking');
const { run } = await import('./solve.js');
const inputDirectory = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const outputDirectory = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const cases = JSON.parse(readFileSync(join(inputDirectory, 'cases.json'), 'utf8')) as
  { input: { text: unknown; header: unknown } }[];

const output = openSync(join(outputDirectory, 'answers.json'), 'w');
try {
  writeFileSync(output, '[');
  for (let index = 0; index < cases.length; index++) {
    const separator = index === 0 ? '' : ',';
    writeFileSync(output, separator + JSON.stringify(run(cases[index].input)));
  }
  writeFileSync(output, ']');
} finally {
  closeSync(output);
}
