import { describe, expect, it } from 'vitest';
import {
  permisoParaReclasificar,
  sePuedeReclasificar,
  sinElConceptoActual,
  textoDeReclasificacion,
} from './reclasificacion-de-fila';

const fila = {
  tipo: 'debito' as 'credito' | 'debito' | 'cheque',
  puedeReclasificar: true,
  anuladoEn: null as string | null,
};
const todos = () => true;

describe('permisoParaReclasificar', () => {
  it('pide el permiso propio del cheque y el de editar para las notas', () => {
    expect(permisoParaReclasificar({ tipo: 'cheque' })).toBe('bancos.cheques.reclasificar');
    expect(permisoParaReclasificar({ tipo: 'credito' })).toBe('bancos.notas.editar');
    expect(permisoParaReclasificar({ tipo: 'debito' })).toBe('bancos.notas.editar');
  });
});

describe('sePuedeReclasificar', () => {
  it('ofrece la acción con el permiso y la autorización del servidor', () => {
    expect(sePuedeReclasificar(fila, todos)).toBe(true);
  });

  it('no la ofrece si el servidor dice que no (origen de otro módulo, inverso, transferencia)', () => {
    expect(sePuedeReclasificar({ ...fila, puedeReclasificar: false }, todos)).toBe(false);
  });

  it('no la ofrece en un cheque anulado', () => {
    expect(sePuedeReclasificar({ ...fila, tipo: 'cheque', anuladoEn: '2026-01-01' }, todos)).toBe(false);
  });

  it('cada tipo pide su permiso: quien solo edita notas no reclasifica cheques', () => {
    const soloNotas = (permiso: string) => permiso === 'bancos.notas.editar';

    expect(sePuedeReclasificar(fila, soloNotas)).toBe(true);
    expect(sePuedeReclasificar({ ...fila, tipo: 'cheque' }, soloNotas)).toBe(false);
  });
});

describe('sinElConceptoActual', () => {
  it('quita el concepto que la fila ya tiene', () => {
    const opciones = [
      { valor: null, texto: 'Elija' },
      { valor: 'a', texto: 'A' },
      { valor: 'b', texto: 'B' },
    ];

    expect(sinElConceptoActual(opciones, 'a').map((o) => o.valor)).toEqual([null, 'b']);
  });
});

describe('textoDeReclasificacion', () => {
  it('resume el cambio cuando ya se eligió y pide elegir si no', () => {
    expect(textoDeReclasificacion('Sin clasificar', 'Planilla')).toContain('de «Sin clasificar» a «Planilla»');
    expect(textoDeReclasificacion('Sin clasificar', null)).toContain('Elija el nuevo concepto');
  });
});
