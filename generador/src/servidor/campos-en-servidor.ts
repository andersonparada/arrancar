import type { Campo, TipoDeCampo } from '../definicion/campos.js';
import type { DefinicionDeRecurso } from '../definicion/definir-recurso.js';
import { ErrorDelGenerador } from '../definicion/errores.js';

/** Un objeto de valor del core: `Correo` en `objetos-valor/correo.js`. */
export interface ObjetoDeValor {
  clase: string;
  archivo: string;
}

/** Cómo se escribe un tipo de campo en cada capa del servidor. */
export interface CampoEnServidor {
  /** Tipo en el dominio, sin `| null` (puede ser un objeto de valor). */
  tipoDominio: string;
  /** Tipo en la solicitud, el DTO y la tabla, sin `| null`. */
  tipoPrimitivo: string;
  /** Columna de Drizzle, sin `.notNull()`. */
  columna: string;
  /** Funciones de `drizzle-orm/pg-core` que usa la columna. */
  funcionesPg: string[];
  zodObligatorio: string;
  zodOpcional: string;
  objetoDeValor?: ObjetoDeValor;
  /** Dos valores válidos, como código: para crear y para cambiar en las pruebas. */
  valoresDePrueba: [string, string];
}

type Traductor = (campo: Campo, referida?: DefinicionDeRecurso) => CampoEnServidor;

const LARGO_DE_TEXTO_LARGO = 2000;
const comillas = (texto: string) => `'${texto.replaceAll("'", "\\'")}'`;
const conDecimales = (entero: number, decimales: number) => `'${entero}.${'5'.padEnd(decimales, '0')}'`;

function texto(largo: number, valores: [string, string]): CampoEnServidor {
  return {
    tipoDominio: 'string',
    tipoPrimitivo: 'string',
    columna: 'text()',
    funcionesPg: ['text'],
    zodObligatorio: `textoObligatorio(${largo})`,
    zodOpcional: `textoOpcional(${largo})`,
    valoresDePrueba: valores,
  };
}

function decimal(precision: number, decimales: number): CampoEnServidor {
  return {
    tipoDominio: 'string',
    tipoPrimitivo: 'string',
    columna: `numeric({ precision: ${precision}, scale: ${decimales} })`,
    funcionesPg: ['numeric'],
    zodObligatorio: `decimalObligatorio(${decimales})`,
    zodOpcional: `decimalOpcional(${decimales})`,
    valoresDePrueba: [conDecimales(12, decimales), conDecimales(13, decimales)],
  };
}

/** Correo, teléfono, NIT y DPI: texto en la API y en la tabla, objeto de valor en el dominio. */
function conObjetoDeValor(clase: string, zodOpcional: string, valores: [string, string]): CampoEnServidor {
  return {
    ...texto(150, valores),
    tipoDominio: clase,
    zodOpcional,
    objetoDeValor: { clase, archivo: clase.toLowerCase() },
  };
}

function lista(campo: Campo): CampoEnServidor {
  const valores = Object.keys(campo.tipo === 'lista' ? campo.opciones : {});
  const union = valores.map(comillas).join(' | ');
  const tupla = `[${valores.map(comillas).join(', ')}]`;
  return {
    tipoDominio: union,
    tipoPrimitivo: union,
    columna: `text().$type<${union}>()`,
    funcionesPg: ['text'],
    zodObligatorio: `opcionObligatoria(${tupla})`,
    zodOpcional: `opcionOpcional(${tupla})`,
    valoresDePrueba: [comillas(valores[0]!), comillas(valores[1] ?? valores[0]!)],
  };
}

function siNo(campo: Campo): CampoEnServidor {
  const predeterminado = campo.tipo === 'siNo' && campo.predeterminado;
  return {
    tipoDominio: 'boolean',
    tipoPrimitivo: 'boolean',
    columna: `boolean().default(${predeterminado})`,
    funcionesPg: ['boolean'],
    zodObligatorio: `z.boolean().default(${predeterminado})`,
    zodOpcional: `z.boolean().default(${predeterminado})`,
    valoresDePrueba: [String(predeterminado), String(!predeterminado)],
  };
}

const TRADUCTORES: Record<TipoDeCampo, Traductor> = {
  texto: (campo) =>
    texto(campo.tipo === 'texto' ? campo.largoMaximo : 150, ["'Registro de prueba'", "'Registro cambiado'"]),
  textoLargo: () => texto(LARGO_DE_TEXTO_LARGO, ["'Una nota de prueba.'", "'Una nota cambiada.'"]),
  entero: () => ({
    tipoDominio: 'number',
    tipoPrimitivo: 'number',
    columna: 'integer()',
    funcionesPg: ['integer'],
    zodObligatorio: 'enteroObligatorio()',
    zodOpcional: 'enteroOpcional()',
    valoresDePrueba: ['7', '8'],
  }),
  decimal: (campo) => decimal(12, campo.tipo === 'decimal' ? campo.decimales : 2),
  dinero: () => decimal(14, 2),
  fecha: () => ({
    tipoDominio: 'string',
    tipoPrimitivo: 'string',
    columna: 'date()',
    funcionesPg: ['date'],
    zodObligatorio: 'fechaObligatoria()',
    zodOpcional: 'fechaOpcional()',
    valoresDePrueba: ["'2026-01-15'", "'2026-02-20'"],
  }),
  siNo,
  lista,
  correo: () => conObjetoDeValor('Correo', 'correoOpcional', ["'ana@ejemplo.com'", "'luis@ejemplo.com'"]),
  telefono: () => conObjetoDeValor('Telefono', 'textoOpcional(30)', ["'55551234'", "'55559876'"]),
  nit: () => conObjetoDeValor('Nit', 'nitOpcional', ["'576937K'", "'12345679'"]),
  dpi: () => conObjetoDeValor('Dpi', 'dpiOpcional', ["'1234567890101'", "'0000000002217'"]),
  referencia,
};

/** El id de otro registro: llave foránea a su tabla (que puede ser la misma). */
function referencia(campo: Campo, referida?: DefinicionDeRecurso): CampoEnServidor {
  if (!referida) throw new ErrorDelGenerador(`Falta cargar la entidad a la que apunta un campo de ${campo.tipo}.`);
  return {
    tipoDominio: 'string',
    tipoPrimitivo: 'string',
    columna: `uuid().references((): AnyPgColumn => ${referida.plural.camel}.id)`,
    funcionesPg: ['uuid', 'index', 'type AnyPgColumn'],
    zodObligatorio: 'idObligatorio()',
    zodOpcional: 'idOpcional()',
    valoresDePrueba: ["'00000000-0000-4000-8000-000000000001'", "'00000000-0000-4000-8000-000000000002'"],
  };
}

export const enServidor = (campo: Campo, referida?: DefinicionDeRecurso): CampoEnServidor =>
  TRADUCTORES[campo.tipo](campo, referida);
