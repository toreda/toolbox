export {CliParser} from './cli/parser';
export type {CliParserInit} from './cli/parser/init';
export {Outcome} from './outcome';
export type {OutcomeInit} from './outcome/init';
export {ParserCore} from './parser/core';
export type {ParserInit} from './parser/init';
export type {ParserOption} from './parser/option';
export type {ParserSchema} from './parser/schema';
export {type ParserTypeId, parserTypeIds} from './parser/type/id';
export {type ParserTypeInfo, parserTypeInfo} from './parser/type/info';
export type {ParserTypeMember} from './parser/type/member';
export {QueryParser} from './query/parser';
export type {QueryParserInit} from './query/parser/init';

export function hello(name: string): string {
	return `Hello, ${name}!`;
}
