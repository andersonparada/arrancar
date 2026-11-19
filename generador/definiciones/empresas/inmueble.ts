import {
  decimal,
  definirRecurso,
  entero,
  lista,
  referencia,
  siNo,
  texto,
  textoLargo,
} from '../../src/definicion/indice.js';

/**
 * Inmueble registral de la empresa (finca, folio, libro, matrícula fiscal; `docs/modulos/diseno-parcelas.md` §5.1):
 * dato único que usan Parcelas, el IUSI y el tope de la base fiscal de Activos fijos. Con alcance por localidad
 * opcional (sin localidad, lo ven todos). Las reglas del registro, el departamento registral, la ubicación, la
 * eliminación con 409 y la auditoría permanente se completan a mano sobre lo generado. Genere su código con:
 *   npm run generar -- recurso empresas/inmueble
 */
export const recurso = definirRecurso({
  modulo: 'empresas',
  entidad: 'Inmueble',
  plural: 'Inmuebles',
  textos: { singular: 'inmueble', plural: 'inmuebles' },
  genero: 'masculino',
  alcance: 'empresa',
  pantalla: 'completa',
  seccion: 'administracion',
  icono: 'Landmark',
  baja: 'inactivar',
  mostrar: 'nombre',
  campos: {
    nombre: texto({ requerido: true, unico: true, largoMaximo: 120 }),
    situacionRegistral: lista(
      { inscrito: 'Inscrito en el registro', posesorio: 'Posesorio (sin inscribir)' },
      { requerido: true },
    ),
    registro: lista({ general: 'Registro General de la Propiedad', segundo: 'Segundo Registro (Quetzaltenango)' }),
    numeroDeFinca: texto({ largoMaximo: 20, etiqueta: 'Número de finca' }),
    folio: texto({ largoMaximo: 20 }),
    libro: texto({ largoMaximo: 20 }),
    departamentoRegistral: texto({ largoMaximo: 2, etiqueta: 'Departamento del libro' }),
    documentoPosesorio: texto({ largoMaximo: 300, etiqueta: 'Documento de derechos posesorios' }),
    titulacionSupletoriaEnTramite: siNo({ etiqueta: 'Titulación supletoria en trámite' }),
    titularidad: lista(
      { propia: 'Propia', copropiedad: 'Copropiedad', de_tercero: 'De un tercero' },
      { requerido: true },
    ),
    porcentajeDeCopropiedad: decimal({ etiqueta: 'Porcentaje de copropiedad' }),
    titular: texto({ largoMaximo: 150, etiqueta: 'Titular registral' }),
    matriculaFiscal: texto({ largoMaximo: 30, etiqueta: 'Matrícula fiscal' }),
    administraIusi: lista(
      { dicabi: 'DICABI', municipalidad: 'Municipalidad' },
      { etiqueta: 'Quién administra el IUSI' },
    ),
    codigoCatastral: texto({ largoMaximo: 40, etiqueta: 'Código catastral' }),
    departamentoCodigo: texto({ largoMaximo: 2, etiqueta: 'Departamento' }),
    municipioCodigo: texto({ largoMaximo: 2, etiqueta: 'Municipio' }),
    direccion: texto({ largoMaximo: 300 }),
    superficieRegistralM2: decimal({ etiqueta: 'Superficie registral (m²)' }),
    cantidadOriginal: decimal({ decimales: 4, etiqueta: 'Cantidad de la escritura' }),
    unidadOriginal: lista(
      {
        m2: 'Metros cuadrados',
        hectarea: 'Hectáreas',
        manzana: 'Manzanas',
        cuerda: 'Cuerdas',
        vara_cuadrada: 'Varas cuadradas',
        caballeria: 'Caballerías',
      },
      { etiqueta: 'Unidad de la escritura' },
    ),
    varasPorLadoDeCuerda: entero({ minimo: 1, maximo: 100, etiqueta: 'Varas por lado de la cuerda' }),
    localidad: referencia('Localidad'),
    observaciones: textoLargo(),
  },
});
