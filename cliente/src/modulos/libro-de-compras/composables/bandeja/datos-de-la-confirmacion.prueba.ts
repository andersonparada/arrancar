import { describe, expect, it } from 'vitest';
import type { ResultadoDeConfirmacion, ResultadoDeVistaPrevia } from '../../servicios/dte-recibidos.api';
import { filaDte } from './bandeja.soporte';
import {
  datosFiscalesContestadosPorNit,
  faltanRespuestas,
  proveedoresConPreguntas,
  separarResultados,
  separarVistaPrevia,
  textoDelError,
} from './datos-de-la-confirmacion';
import { proveedoresNuevosDeLaVistaPrevia } from './datos-de-proveedores-nuevos';

const errorFiscal = (id: string) => ({
  id,
  error: {
    codigo: 'faltan_datos_fiscales_del_proveedor',
    mensaje: 'Faltan datos.',
    detalles: {
      preguntas: [
        { campo: 'regimenIsr', pregunta: '¿Régimen?', opciones: [{ valor: 'utilidades', texto: 'Utilidades' }] },
      ],
    },
  },
});

describe('resultados de confirmar', () => {
  it('separa lo registrado de lo que quedó pendiente', () => {
    const resultados: ResultadoDeConfirmacion[] = [
      { id: 'a', documentoId: 'd1', avisos: [] },
      { id: 'b', error: { codigo: 'x', mensaje: 'Falló.' } },
    ];
    const { registradas, conError } = separarResultados(resultados);
    expect(registradas.map(({ id }) => id)).toEqual(['a']);
    expect(conError.map(({ id }) => id)).toEqual(['b']);
  });

  it('separa la vista previa en lo que se puede confirmar y lo que hay que corregir', () => {
    const resultados = [
      { id: 'a', documento: {}, avisos: [] },
      { id: 'b', error: { codigo: 'dte_sin_concepto', mensaje: 'Falta.' } },
    ] as unknown as ResultadoDeVistaPrevia[];
    const { listas, conError } = separarVistaPrevia(resultados);
    expect(listas.map(({ id }) => id)).toEqual(['a']);
    expect(conError.map(({ id }) => id)).toEqual(['b']);
  });

  it('un DTE de proveedor nuevo queda entre las listas y el que no tiene permiso para crearlo, con error', () => {
    const proveedorNuevo = {
      nit: '111',
      nombreDelDte: 'PEREZ , JUAN',
      accion: 'crear',
      nombreExistente: null,
      usado: { tipoDePersona: 'individual', nombres: 'JUAN', apellidos: 'PEREZ' },
      propuesta: {
        tipoDePersona: 'individual',
        individual: { nombres: 'JUAN', apellidos: 'PEREZ' },
        juridica: { razonSocial: 'PEREZ JUAN' },
      },
    };
    const resultados = [
      { id: 'a', documento: {}, avisos: [], proveedorNuevo },
      { id: 'b', error: { codigo: 'proveedor_nuevo_sin_permiso', mensaje: 'No puede crear proveedores.' } },
    ] as unknown as ResultadoDeVistaPrevia[];
    const { listas, conError } = separarVistaPrevia(resultados);
    expect(listas.map(({ id }) => id)).toEqual(['a']);
    expect(conError.map(({ id }) => id)).toEqual(['b']);
    const grupos = proveedoresNuevosDeLaVistaPrevia(resultados, [filaDte({ id: 'a' })]);
    expect(grupos.map(({ proveedor }) => proveedor.nit)).toEqual(['111']);
  });

  it('dice cómo corregir un proveedor o tercero inactivo', () => {
    for (const codigo of ['proveedor_inactivo', 'tercero_inactivo']) {
      expect(textoDelError({ codigo, mensaje: 'Está inactivo.' })).toBe(
        'Está inactivo. Reactívelo en Proveedores y vuelva a calcular.',
      );
    }
  });

  it('agrega al error lo que el usuario debe hacer, y deja tal cual el que no se conoce', () => {
    expect(textoDelError({ codigo: 'dte_sin_concepto', mensaje: 'No tiene concepto.' })).toBe(
      'No tiene concepto. Use «Completar» para elegir el concepto y confirme de nuevo.',
    );
    expect(textoDelError({ codigo: 'otro', mensaje: 'Otro error.' })).toBe('Otro error.');
  });
});

describe('datos fiscales de proveedores sin guardar', () => {
  const filas = [
    filaDte({ id: 'a', nitEmisor: '1', nombreEmisor: 'Alfa' }),
    filaDte({ id: 'b', nitEmisor: '1', nombreEmisor: 'Alfa' }),
    filaDte({ id: 'c', nitEmisor: '2', nombreEmisor: 'Beta' }),
  ];

  it('agrupa las preguntas por NIT del emisor con las filas que esperan', () => {
    const errores = [errorFiscal('a'), errorFiscal('b'), errorFiscal('c')];
    const proveedores = proveedoresConPreguntas(errores, filas);
    expect(proveedores.map(({ nit, filas: ids }) => [nit, ids])).toEqual([
      ['1', ['a', 'b']],
      ['2', ['c']],
    ]);
    expect(proveedores[0]?.preguntas).toHaveLength(1);
  });

  it('ignora los errores que no son de datos fiscales', () => {
    const otro = { id: 'a', error: { codigo: 'dte_sin_destino', mensaje: 'Falta.' } };
    expect(proveedoresConPreguntas([otro], filas)).toEqual([]);
  });

  it('falta contestar hasta que se responde y luego se arma lo que espera el servidor', () => {
    const proveedores = proveedoresConPreguntas([errorFiscal('a')], filas);
    expect(faltanRespuestas(proveedores, {})).toBe(true);
    const respuestas = { '1': { regimenIsr: 'utilidades', esAgenteDeRetencionIva: 'false' } };
    expect(faltanRespuestas(proveedores, respuestas)).toBe(false);
    expect(datosFiscalesContestadosPorNit(respuestas)).toEqual({
      '1': { regimenIsr: 'utilidades', esAgenteDeRetencionIva: false },
    });
  });

  it('no manda lo que se contestó a medias', () => {
    expect(datosFiscalesContestadosPorNit({ '1': { regimenIsr: 'utilidades' } })).toEqual({});
  });
});
