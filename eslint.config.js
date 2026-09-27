import { readdirSync } from 'node:fs';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const LIMITES_DE_TAMANO = {
  'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['warn', { max: 25, skipBlankLines: true, skipComments: true, IIFEs: true }],
  complexity: ['warn', 8],
  'max-params': ['warn', 3],
  'max-depth': ['warn', 3],
};

const LIBRERIAS_DE_INFRAESTRUCTURA = ['drizzle-orm', 'drizzle-orm/*', 'pg', 'fastify', '@fastify/*', 'sharp'];

/**
 * Qué no puede importar cada capa de la arquitectura limpia (ver docs/ARQUITECTURA.md).
 * Las dependencias solo apuntan hacia adentro: http → aplicación → dominio.
 */
const RESTRICCIONES_POR_CAPA = {
  dominio: {
    capas: ['aplicacion', 'infraestructura', 'http'],
    librerias: [...LIBRERIAS_DE_INFRAESTRUCTURA, 'zod'],
    motivo: 'El dominio no depende de nada externo: ni de otras capas ni de librerías de infraestructura.',
  },
  aplicacion: {
    capas: ['infraestructura', 'http'],
    librerias: LIBRERIAS_DE_INFRAESTRUCTURA,
    motivo: 'La aplicación usa puertos (interfaces); la infraestructura los implementa.',
  },
  http: {
    capas: ['infraestructura'],
    librerias: ['drizzle-orm', 'drizzle-orm/*', 'pg'],
    motivo: 'La capa HTTP habla con los casos de uso, nunca con la base de datos.',
  },
};

const modulos = readdirSync('servidor/src/modulos', { withFileTypes: true })
  .filter((entrada) => entrada.isDirectory())
  .map((entrada) => entrada.name);

function prohibirOtrosModulos(modulo) {
  return modulos
    .filter((otro) => otro !== modulo && otro !== 'core')
    .map((otro) => ({
      group: [`**/modulos/${otro}/**`, `../${otro}/**`, `../../${otro}/**`, `../../../${otro}/**`],
      message: `Los módulos no se importan entre sí: ${modulo} se comunica con ${otro} por eventos o a través del core.`,
    }));
}

function prohibirCapa(nombreCapa) {
  const { capas, librerias, motivo } = RESTRICCIONES_POR_CAPA[nombreCapa];
  return [
    ...capas.map((capa) => ({ group: [`**/${capa}/**`, `**/${capa}`], message: motivo })),
    ...librerias.map((libreria) => ({ group: [libreria], message: motivo })),
  ];
}

function restringirImportaciones(archivos, patrones) {
  return {
    files: archivos,
    ignores: ['**/*.prueba.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: patrones }] },
  };
}

/**
 * ESLint no combina dos `no-restricted-imports` sobre el mismo archivo (la última
 * gana), así que cada combinación módulo × capa lleva todas sus prohibiciones juntas.
 */
function reglasDeDependencias() {
  return modulos.flatMap((modulo) => [
    restringirImportaciones([`{servidor,cliente}/src/modulos/${modulo}/**/*.{ts,vue}`], prohibirOtrosModulos(modulo)),
    ...Object.keys(RESTRICCIONES_POR_CAPA).map((capa) =>
      restringirImportaciones(
        [`servidor/src/modulos/${modulo}/**/${capa}/**/*.ts`],
        [...prohibirOtrosModulos(modulo), ...prohibirCapa(capa)],
      ),
    ),
  ]);
}

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/dev-dist/**', 'servidor/almacenamiento*/**', 'infra/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],

  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] } },
  },
  {
    files: ['servidor/**/*.ts', '*.js', 'servidor/scripts/**'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['cliente/**/*.{ts,vue}'],
    languageOptions: { globals: globals.browser },
  },

  {
    files: ['**/*.{ts,vue}'],
    rules: {
      ...LIMITES_DE_TAMANO,
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-restricted-syntax': [
        'error',
        { selector: 'ExportDefaultDeclaration', message: 'Use exportaciones con nombre: se buscan y renombran mejor.' },
      ],
    },
  },
  {
    files: ['**/*.vue', '**/*.config.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: [
      'servidor/src/modulos/core/base-datos/migrar.ts',
      'servidor/src/modulos/core/base-datos/sembrar.ts',
      'servidor/scripts/**',
    ],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/*.prueba.ts', 'servidor/src/pruebas-api/**'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': ['warn', { max: 250, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  ...reglasDeDependencias(),

  prettier,
);
