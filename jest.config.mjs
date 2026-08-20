import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

/**
 * Jest config lives in an .mjs file because ts-node (which jest uses to
 * load .ts configs) does not support the TypeScript 7 native compiler
 * this repo builds with.
 *
 * `rootDir` is set explicitly (ESM equivalent of `__dirname`) so paths stay
 * anchored to this directory when the config runs as a project of a parent
 * repo's multi-project jest run — without it, `roots: ['./']` and the
 * `src/*` moduleNameMapper can resolve against the parent's root instead.
 *
 * @type {import('jest').Config}
 */
const config = {
	displayName: 'toolbox',
	rootDir: dirname(fileURLToPath(import.meta.url)),
	roots: ['<rootDir>'],
	coverageDirectory: './coverage',
	coveragePathIgnorePatterns: [
		'tests/',
		'node_modules/',
		'.node/',
		'jest/',
		'gulpfile.ts',
		'coverage/',
		'webpack.config.ts',
		'.github',
		'docs'
	],
	moduleFileExtensions: ['ts', 'js', 'json'],
	moduleNameMapper: {'^src/(.*)': '<rootDir>/src/$1'},
	testEnvironment: 'node',
	testPathIgnorePatterns: ['node_modules'],
	testRegex: '(/__tests__/.*|(\\.|/)(spec))\\.ts$',
	transform: {'^.+\\.(t|j)sx?$': '@swc/jest'},
	transformIgnorePatterns: ['node_modules/(?!@ngrx|(?!core-js/)|(?!deck.gl)|ng-dynamic)']
};

export default config;
