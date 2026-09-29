import { readdirSync } from 'node:fs';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Código pequeño que se explica solo: pasarse de estos límites no deja hacer commit (`revisar` falla). */
const LIMITES_DE_TAMANO = {
  'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['error', { max: 25, skipBlankLines: true, skipComments: true, IIFEs: true }],
  complexity: ['error', 8],
  'max-params': ['error', 3],
  'max-depth': ['error', 3],
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

/**
 * Módulos base: otros módulos pueden leer sus tablas (y poner llaves foráneas hacia ellas)
 * solo desde su `infraestructura`, importando únicamente sus `*.tablas.js`.
 */
const MODULOS_BASE = ['empresas'];

/** Cualquier importación de `otro` salvo `infraestructura/persistencia/<archivo>.tablas.js`. */
const SOLO_TABLAS_DEL_MODULO_BASE = (otro) => `(^|/)${otro}(/(?!infraestructura/persistencia/[^/]+\\.tablas\\.js$)|$)`;

function prohibirOtrosModulos(modulo, { permitirTablasBase = false } = {}) {
  return modulos
    .filter((otro) => otro !== modulo && otro !== 'core')
    .map((otro) =>
      permitirTablasBase && MODULOS_BASE.includes(otro)
        ? {
            regex: SOLO_TABLAS_DEL_MODULO_BASE(otro),
            message: `De ${otro} (módulo base) solo se importan sus *.tablas.js, y solo desde infraestructura.`,
          }
        : {
            group: [`**/modulos/${otro}/**`, `../${otro}/**`, `../../${otro}/**`, `../../../${otro}/**`],
            message: `Los módulos no se importan entre sí: ${modulo} se comunica con ${otro} por eventos o a través del core.`,
          },
    );
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
 * Los componentes no llaman a la API: reciben datos por props y avisan con eventos.
 * Sí pueden usar los tipos de los servicios (son el contrato de los datos).
 */
const COMPONENTES_SIN_SERVICIOS = {
  files: ['cliente/src/modulos/**/componentes/**/*.vue'],
  rules: {
    '@typescript-eslint/no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/servicios/**', '**/servicios'],
            allowTypeImports: true,
            message:
              'Los componentes reciben datos por props y avisan con eventos; la página o su composable llama a la API.',
          },
        ],
      },
    ],
  },
};

/**
 * Excepción del módulo base: la `infraestructura` de un módulo de negocio puede importar las
 * tablas de `empresas`. Va después de las reglas por capa (en flat config gana la última).
 */
function excepcionDelModuloBase(modulo) {
  if (modulo === 'core' || MODULOS_BASE.includes(modulo)) return [];
  return [
    restringirImportaciones(
      [`servidor/src/modulos/${modulo}/infraestructura/**/*.ts`],
      prohibirOtrosModulos(modulo, { permitirTablasBase: true }),
    ),
  ];
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
    ...excepcionDelModuloBase(modulo),
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
    files: ['servidor/**/*.ts', '*.js', 'servidor/scripts/**', 'generador/**/*.ts'],
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
      'generador/src/principal.ts',
    ],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['cliente/src/modulos/**/paginas/*.vue'],
    rules: {
      'max-lines': ['error', { max: 120, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Las preguntas y los avisos se ven igual en toda la app: `usarAvisos().confirmar`, no los del navegador.
    files: ['cliente/src/**/*.{ts,vue}'],
    rules: { 'no-alert': 'error' },
  },
  {
    files: ['**/*.prueba.ts', 'servidor/src/pruebas-api/**'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  ...reglasDeDependencias(),
  COMPONENTES_SIN_SERVICIOS,

  prettier,
);
