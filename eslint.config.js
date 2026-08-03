import toreda from '@toreda/eslint-config';

export default [
	{
		ignores: ['dist/**', 'coverage/**', 'docs/**', 'node_modules/**']
	},
	...toreda
];
