import { describe, expect, it } from 'vitest';
import type { DocumentoPorPagar } from '../servicios/tipos';
import {
  cantidadDeFiltrosDeNotas,
  consultaDeNotas,
  detallesDeNota,
  filtrosInicialesDeNotas,
  saldosAFavorPorProveedor,
} from './notas-de-credito';

const nota = (cambios: Partial<DocumentoPorPagar>): DocumentoPorPagar =>
  ({
    id: 'n',
    proveedorId: 'p1',
    proveedorNombre: 'Zeta',
    estado: 'autorizado',
    saldo: '10.00',
    total: '10.00',
    aplicado: '0.00',
    ajustado: '0.00',
    ...cambios,
  }) as DocumentoPorPagar;

describe('consulta de notas de crédito', () => {
  it('al abrir pide notas de crédito vigentes con saldo', () => {
    expect(consultaDeNotas(filtrosInicialesDeNotas(), 1)).toMatchObject({
      tipo: 'nota_de_credito',
      estado: 'vigente',
      conSaldo: true,
      pagina: 1,
      proveedorId: undefined,
    });
  });

  it('apagar «con saldo» no manda el filtro y cuenta como filtro puesto', () => {
    const filtros = { ...filtrosInicialesDeNotas(), conSaldo: false, proveedorId: 'p1' };
    expect(consultaDeNotas(filtros, 2).conSaldo).toBeUndefined();
    expect(cantidadDeFiltrosDeNotas(filtros)).toBe(2);
    expect(cantidadDeFiltrosDeNotas(filtrosInicialesDeNotas())).toBe(0);
  });
});

describe('saldos a favor por proveedor', () => {
  it('suma por proveedor, ordena por nombre y deja fuera anuladas y sin saldo', () => {
    const resumen = saldosAFavorPorProveedor([
      nota({ id: '1', saldo: '10.10' }),
      nota({ id: '2', saldo: '0.20' }),
      nota({ id: '3', proveedorId: 'p2', proveedorNombre: 'Alfa', saldo: '5.00' }),
      nota({ id: '4', saldo: '50.00', estado: 'anulado' }),
      nota({ id: '5', saldo: '0.00' }),
    ]);
    expect(resumen).toEqual([
      { proveedorId: 'p2', proveedorNombre: 'Alfa', saldo: '5.00', notas: 1 },
      { proveedorId: 'p1', proveedorNombre: 'Zeta', saldo: '10.30', notas: 2 },
    ]);
  });
});

it('los detalles de la tarjeta traen total, aplicado y ajustado', () => {
  expect(detallesDeNota(nota({ aplicado: '3.00', ajustado: '2.00' })).map((d) => d.monto)).toEqual([
    '10.00',
    '3.00',
    '2.00',
  ]);
});
