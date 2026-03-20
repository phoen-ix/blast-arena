import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../../',
  testMatch: ['<rootDir>/tests/backend/**/*.test.ts', '<rootDir>/tests/shared/**/*.test.ts'],
  moduleNameMapper: {
    '^@blast-arena/shared$': '<rootDir>/shared/src',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'backend/tsconfig.json',
      diagnostics: {
        ignoreDiagnostics: [1378],
      },
    }],
  },
};

export default config;
