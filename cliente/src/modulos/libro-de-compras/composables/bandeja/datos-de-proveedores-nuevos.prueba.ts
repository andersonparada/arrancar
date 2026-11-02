import { describe, expect, it } from 'vitest';
import type { ProveedorNuevoDeLaFila, ResultadoDeVistaPrevia } from '../../servicios/dte-recibidos.api';
import { filaDte } from './bandeja.soporte';
import {
  edicionInicial,
  hayProblemas,
  problemasDelProveedorNuevo,
  proveedoresNuevosDeLaVistaPrevia,
  proveedoresNuevosParaEnviar,
} from './datos-de-proveedores-nuevos';

const proveedor = (cambios: Partial<ProveedorNuevoDeLaFila> = {}): ProveedorNuevoDeLaFila => ({
  nit: '111',
  nombreDelDte: 'PEREZ LOPEZ JUAN CARLOS',
  accion: 'crear',
  nombreExistente: null,
  usado: { tipoDePersona: 'individual', nombres: 'JUAN CARLOS', apellidos: 'PEREZ LOPEZ' },
  propuesta: {
    tipoDePersona: 'individual',
    individual: { nombres: 'JUAN CARLOS', apellidos: 'PEREZ LOPEZ' },
    juridica: { razonSocial: 'PEREZ LOPEZ JUAN CARLOS' },
  },
  ...cambios,
});

const resultado = (id: string, proveedorNuevo?: ProveedorNuevoDeLaFila) =>
  ({ id, documento: {}, avisos: [], proveedorNuevo }) as unknown as ResultadoDeVistaPrevia;

describe('proveedores nuevos de la vista previa', () => {
  it('agrupa por NIT, cuenta las filas y toma la propuesta de la emisión más reciente', () => {
    const filas = [
      filaDte({ id: 'a', fechaEmision: '2026-10-01' }),
      filaDte({ id: 'b', fechaEmision: '2026-10-20' }),
      filaDte({ id: 'c', fechaEmision: '2026-10-05' }),
    ];
    const grupos = proveedoresNuevosDeLaVistaPrevia(
      [
        resultado('a', proveedor({ nombreDelDte: 'VIEJO' })),
        resultado('b', proveedor({ nombreDelDte: 'NUEVO' })),
        resultado('c'),
      ],
      filas,
    );
    expect(grupos).toHaveLength(1);
    expect(grupos[0]?.filas).toBe(2);
    expect(grupos[0]?.proveedor.nombreDelDte).toBe('NUEVO');
  });

  it('una fila con error no cuenta', () => {
    const error = { id: 'x', error: { codigo: 'proveedor_nuevo_sin_permiso', mensaje: 'No puede.' } };
    expect(proveedoresNuevosDeLaVistaPrevia([error], [])).toEqual([]);
  });
});

describe('edición de un proveedor nuevo', () => {
  const grupos = proveedoresNuevosDeLaVistaPrevia([resultado('a', proveedor())], [filaDte({ id: 'a' })]);

  it('arranca con la propuesta y no pisa lo escrito al recalcular', () => {
    const inicial = edicionInicial(grupos, {});
    expect(inicial['111']).toMatchObject({ tipo: 'individual', nombres: 'JUAN CARLOS', apellidos: 'PEREZ LOPEZ' });
    const editada = { '111': { ...inicial['111']!, nombres: 'JUAN' } };
    expect(edicionInicial(grupos, editada)['111']?.nombres).toBe('JUAN');
    expect(edicionInicial([], editada)).toEqual({});
  });

  it('pide revisar contra el RTU solo a la persona individual cuyo nombre no traía coma', () => {
    expect(edicionInicial(grupos, {})['111']?.revisarContraElRtu).toBe(true);
    const conComa = proveedoresNuevosDeLaVistaPrevia(
      [resultado('a', proveedor({ nombreDelDte: 'PEREZ , JUAN' }))],
      [filaDte({ id: 'a' })],
    );
    expect(edicionInicial(conComa, {})['111']?.revisarContraElRtu).toBe(false);
  });

  it('cada tipo guarda su edición y se manda la del tipo elegido', () => {
    const edicion = { ...edicionInicial(grupos, {})['111']!, razonSocial: 'Ferretería La Paz, S. A.' };
    expect(proveedoresNuevosParaEnviar({ '111': edicion })['111']).toEqual({
      tipoDePersona: 'individual',
      nombres: 'JUAN CARLOS',
      apellidos: 'PEREZ LOPEZ',
    });
    expect(proveedoresNuevosParaEnviar({ '111': { ...edicion, tipo: 'juridica' } })['111']).toEqual({
      tipoDePersona: 'juridica',
      razonSocial: 'Ferretería La Paz, S. A.',
    });
    expect(
      proveedoresNuevosParaEnviar({ '111': { ...edicion, tipo: 'individual', nombres: 'JUAN CARLOS' } })['111'],
    ).toBeDefined();
  });

  it('no manda apellidos vacíos', () => {
    const edicion = { ...edicionInicial(grupos, {})['111']!, apellidos: '  ' };
    expect(proveedoresNuevosParaEnviar({ '111': edicion })['111']).toEqual({
      tipoDePersona: 'individual',
      nombres: 'JUAN CARLOS',
    });
  });

  it('avisa qué campo corregir: vacío o demasiado largo, según el tipo elegido', () => {
    const base = edicionInicial(grupos, {})['111']!;
    expect(problemasDelProveedorNuevo({ ...base, nombres: ' ' }).nombres).toMatch(/Escriba los nombres/);
    expect(problemasDelProveedorNuevo({ ...base, apellidos: 'x'.repeat(81) }).apellidos).toMatch(/Máximo 80/);
    expect(problemasDelProveedorNuevo({ ...base, tipo: 'juridica', razonSocial: '' }).razonSocial).toMatch(
      /razón social/,
    );
    expect(problemasDelProveedorNuevo({ ...base, tipo: 'juridica', nombres: '' })).toEqual({});
    expect(problemasDelProveedorNuevo({ ...base, tipo: 'juridica', razonSocial: 'x'.repeat(151) }).razonSocial).toMatch(
      /150/,
    );
  });

  it('lo que tiene problemas no se manda y bloquea la confirmación', () => {
    const malo = { ...edicionInicial(grupos, {})['111']!, nombres: '' };
    expect(hayProblemas({ '111': malo })).toBe(true);
    expect(proveedoresNuevosParaEnviar({ '111': malo })).toEqual({});
  });

  it('un tercero que solo recibe el papel manda lo que usó el servidor y nunca tiene problemas', () => {
    const existente = proveedoresNuevosDeLaVistaPrevia(
      [
        resultado(
          'a',
          proveedor({
            accion: 'agregar_papel',
            nombreExistente: 'Juan Pérez',
            usado: { tipoDePersona: 'juridica', razonSocial: 'Juan Pérez' },
          }),
        ),
      ],
      [filaDte({ id: 'a' })],
    );
    const edicion = edicionInicial(existente, {});
    expect(hayProblemas(edicion)).toBe(false);
    expect(proveedoresNuevosParaEnviar(edicion)['111']).toEqual({
      tipoDePersona: 'juridica',
      razonSocial: 'Juan Pérez',
    });
  });
});
