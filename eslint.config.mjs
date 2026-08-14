import nextPlugin from '@next/eslint-plugin-next';
import tseslint from 'typescript-eslint';

const eslintConfig = tseslint.config(
    {
        ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'vitest.config.mts', 'vitest.setup.ts', '**/*.test.ts', '**/*.test.tsx'],
    },
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
        plugins: {
            '@next/next': nextPlugin,
        },
        rules: {
            ...nextPlugin.configs['core-web-vitals'].rules,
        },
    },
    {
        rules: {
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    }
);

export default eslintConfig;
