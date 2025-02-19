import type { Inputs, Outputs } from '../index.js';
import * as Rivet from '../exports.js';

export interface CodeRunnerOptions {
  includeRequire: boolean;
  includeFetch: boolean;
  includeRivet: boolean;
  includeProcess: boolean;
}

/** An object that can run arbitrary code (evals it). */
export interface CodeRunner {
  runCode: (code: string, inputs: Inputs, options: CodeRunnerOptions) => Promise<Outputs>;
}

export class IsomorphicCodeRunner implements CodeRunner {
  async runCode(code: string, inputs: Inputs, options: CodeRunnerOptions): Promise<Outputs> {
    const argNames = ['inputs'];
    const args: any[] = [inputs];

    if (options.includeRequire) {
      throw new Error('require() requires the Node executor.');
    }

    if (options.includeProcess) {
      throw new Error('process requires the Node executor.');
    }

    if (options.includeFetch) {
      argNames.push('fetch');
      args.push(fetch);
    }

    if (options.includeRivet) {
      argNames.push('Rivet');
      args.push(Rivet);
    }

    argNames.push(code);

    const AsyncFunction = async function () {}.constructor as new (...args: string[]) => Function;
    const codeFunction = new AsyncFunction(...argNames);
    const outputs = await codeFunction(...args);

    return outputs;
  }
}

export class NotAllowedCodeRunner implements CodeRunner {
  async runCode(_code: string, _inputs: Inputs, _options: CodeRunnerOptions): Promise<Outputs> {
    throw new Error('Dynamic code execution is disabled.');
  }
}
