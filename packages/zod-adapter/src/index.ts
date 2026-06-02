import { z } from 'zod'
import type { ValidatorAdapter } from '@tanstack/react-router'

export interface ZodTypeLike {
  _input: any
  _output: any
  parse: (input: any) => any
}

export type InputOutputOption = 'input' | 'output'

export interface zodValidatorOptions {
  readonly schema: ZodTypeLike
  readonly input?: InputOutputOption
  readonly output?: InputOutputOption
}

export type zodValidatorInput<
  TOptions extends ZodTypeLike | zodValidatorOptions,
> = TOptions extends zodValidatorOptions
  ? 'input' extends TOptions['input']
    ? TOptions['schema']['_input']
    : TOptions['schema']['_output']
  : TOptions extends ZodTypeLike
    ? TOptions['_input']
    : never

export type zodValidatorOutput<
  TOptions extends ZodTypeLike | zodValidatorOptions,
> = TOptions extends zodValidatorOptions
  ? 'output' extends TOptions['output']
    ? TOptions['schema']['_output']
    : TOptions['schema']['_input']
  : TOptions extends ZodTypeLike
    ? TOptions['_output']
    : never

export type zodValidatorAdapter<
  TOptions extends ZodTypeLike | zodValidatorOptions,
> = ValidatorAdapter<zodValidatorInput<TOptions>, zodValidatorOutput<TOptions>>

export const zodValidator = <
  TOptions extends ZodTypeLike | zodValidatorOptions,
>(
  options: TOptions,
): zodValidatorAdapter<TOptions> => {
  const input = 'input' in options ? options.input : 'input'
  const output = 'output' in options ? options.output : 'output'
  const _input = 'schema' in options ? options.schema._input : options._input
  const _output = 'schema' in options ? options.schema._output : options._output
  // Zod 4 schemas (codecs in particular) expose an `encode` instance method
  // that runs the output -> input transformation. Forward it through the
  // adapter so the router can encode rich runtime values back into URL-safe
  // representations when stringifying search params. Older Zod versions don't
  // have `encode`, in which case we leave the adapter without one.
  const schema = ('schema' in options ? options.schema : options) as unknown as {
    encode?: (value: any) => any
  }
  return {
    types: {
      input: input === 'output' ? _output : _input,
      output: output === 'input' ? _input : _output,
    },
    parse: (input) =>
      'schema' in options ? options.schema.parse(input) : options.parse(input),
    ...(typeof schema.encode === 'function'
      ? { encode: (value: any) => schema.encode!.call(schema, value) }
      : {}),
  }
}

export const fallback = <TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  fallback: TSchema['_input'],
): z.ZodPipeline<
  z.ZodType<TSchema['_input'], z.ZodTypeDef, TSchema['_input']>,
  z.ZodCatch<TSchema>
> => {
  return z.custom<TSchema['_input']>().pipe(schema.catch(fallback))
}
