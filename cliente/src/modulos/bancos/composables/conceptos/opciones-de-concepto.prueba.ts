import { describe, expect, it } from 'vitest';
import type { Concepto } from '../../servicios/conceptos.api';
import {
  conceptoSinClasificar,
  conceptoVigente,
  opcionesDeConcepto,
  opcionesDeConceptoDeCheque,
  opcionesDeFiltroDeConcepto,
  opcionesParaClasificar,
} from './opciones-de-concepto';

const concepto = (cambios: Partial<Concepto>): Concepto => ({
  id: 'c-1',
  nombre: 'Concepto',
  aplicaA: 'ambos',
  actividadDeFlujo: 'operacion',
  grupoDeFlujo: null,
  esCargoBancario: false,
  pideDatosDeIntereses: false,
  admiteFactura: false,
  activo: true,
  claveDeSistema: null,
  ...cambios,
});

const catalogo: Concepto[] = [
  concepto({ id: 'planilla', nombre: 'Planilla', aplicaA: 'debito' }),
  concepto({ id: 'ventas', nombre: 'Depósito de ventas', aplicaA: 'credito' }),
  concepto({ id: 'impuestos', nombre: 'Impuestos', aplicaA: 'debito' }),
  concepto({ id: 'varios', nombre: 'Varios', aplicaA: 'ambos' }),
  concepto({ id: 'viejo', nombre: 'Viejo', activo: false }),
  concepto({ id: 'sin', nombre: 'Sin clasificar', claveDeSistema: 'sin_clasificar' }),
  concepto({ id: 'trans', nombre: 'Transferencia entre cuentas', claveDeSistema: 'transferencia' }),
];

const textos = (opciones: { texto: string }[]) => opciones.map((o) => o.texto);

describe('opcionesDeConcepto', () => {
  it('en una nota de crédito: solo activos, propios y de crédito o ambos, por nombre', () => {
    expect(textos(opcionesDeConcepto(catalogo, ['credito']))).toEqual([
      'Elija un concepto',
      'Depósito de ventas',
      'Varios',
    ]);
  });

  it('en una nota de débito y en un cheque (cuenta como débito): los de débito o ambos', () => {
    const esperado = ['Elija un concepto', 'Impuestos', 'Planilla', 'Varios'];

    expect(textos(opcionesDeConcepto(catalogo, ['debito']))).toEqual(esperado);
    expect(textos(opcionesDeConcepto(catalogo, ['cheque']))).toEqual(esperado);
  });

  it('nunca ofrece los de sistema, entre ellos «Sin clasificar», ni los inactivos', () => {
    const todos = textos(opcionesDeConcepto(catalogo, ['credito', 'debito']));

    expect(todos).not.toContain('Sin clasificar');
    expect(todos).not.toContain('Transferencia entre cuentas');
    expect(todos).not.toContain('Viejo');
  });

  it('para varios movimientos a la vez, exige que sirva a todos: con créditos y débitos, solo los «ambos»', () => {
    expect(textos(opcionesDeConcepto(catalogo, ['credito', 'debito']))).toEqual(['Elija un concepto', 'Varios']);
    expect(textos(opcionesDeConcepto(catalogo, ['debito', 'cheque']))).toContain('Planilla');
  });

  it('conserva el concepto que ya tenía la nota aunque hoy esté inactivo, para que se vea lo guardado', () => {
    expect(textos(opcionesDeConcepto(catalogo, ['credito'], 'viejo'))).toContain('Viejo');
  });
});

describe('opcionesDeFiltroDeConcepto', () => {
  it('trae todos, también los de sistema, por nombre y con «Todos» primero', () => {
    const opciones = opcionesDeFiltroDeConcepto(catalogo);

    expect(opciones[0]).toEqual({ valor: null, texto: 'Todos' });
    expect(textos(opciones)).toContain('Sin clasificar');
    expect(textos(opciones).slice(1)).toEqual([...textos(opciones).slice(1)].sort((a, b) => a.localeCompare(b, 'es')));
  });
});

describe('conceptoVigente', () => {
  const opciones = opcionesDeConcepto(catalogo, ['credito']);

  it('conserva el elegido mientras siga entre las opciones', () => {
    expect(conceptoVigente(opciones, 'ventas')).toBe('ventas');
  });

  it('lo limpia si dejó de servir, como al cambiar de crédito a débito', () => {
    expect(conceptoVigente(opcionesDeConcepto(catalogo, ['debito']), 'ventas')).toBeNull();
    expect(conceptoVigente(opciones, null)).toBeNull();
  });
});

describe('conceptoSinClasificar', () => {
  it('lo encuentra por su clave de sistema', () => {
    expect(conceptoSinClasificar(catalogo)?.id).toBe('sin');
    expect(conceptoSinClasificar([])).toBeNull();
  });
});

describe('opcionesDeConceptoDeCheque', () => {
  const pago = concepto({
    id: 'pago',
    nombre: 'Pago a proveedores',
    aplicaA: 'debito',
    claveDeSistema: 'pago_a_proveedor',
  });
  const conPago = [...catalogo, pago];

  it('sin Cuentas por pagar activo incluye «Pago a proveedores», por nombre', () => {
    expect(textos(opcionesDeConceptoDeCheque(conPago, false))).toEqual([
      'Elija un concepto',
      'Impuestos',
      'Pago a proveedores',
      'Planilla',
      'Varios',
    ]);
  });

  it('con Cuentas por pagar activo no lo ofrece', () => {
    expect(textos(opcionesDeConceptoDeCheque(conPago, true))).not.toContain('Pago a proveedores');
  });

  it('si el catálogo no lo trae o está inactivo, no aparece', () => {
    expect(textos(opcionesDeConceptoDeCheque(catalogo, false))).not.toContain('Pago a proveedores');
    expect(textos(opcionesDeConceptoDeCheque([{ ...pago, activo: false }], false))).toEqual(['Elija un concepto']);
  });
});

describe('opcionesParaClasificar', () => {
  const pago = concepto({
    id: 'pago',
    nombre: 'Pago a proveedores',
    aplicaA: 'debito',
    claveDeSistema: 'pago_a_proveedor',
  });
  const conPago = [...catalogo, pago];

  it('solo con cheques ofrece «Pago a proveedores» si Cuentas por pagar no está activo', () => {
    expect(textos(opcionesParaClasificar(conPago, ['cheque'], false))).toContain('Pago a proveedores');
    expect(textos(opcionesParaClasificar(conPago, ['cheque', 'cheque'], true))).not.toContain('Pago a proveedores');
  });

  it('con notas, o notas y cheques juntos, nunca lo ofrece', () => {
    expect(textos(opcionesParaClasificar(conPago, ['debito'], false))).not.toContain('Pago a proveedores');
    expect(textos(opcionesParaClasificar(conPago, ['cheque', 'debito'], false))).not.toContain('Pago a proveedores');
  });
});
