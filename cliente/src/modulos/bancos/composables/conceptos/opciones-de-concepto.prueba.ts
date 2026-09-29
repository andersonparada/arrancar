import { describe, expect, it } from 'vitest';
import type { Concepto } from '../../servicios/conceptos.api';
import {
  conceptoSinClasificar,
  conceptoVigente,
  opcionesDeConcepto,
  opcionesDeFiltroDeConcepto,
  sugerirConcepto,
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

describe('sugerirConcepto', () => {
  const opciones = opcionesDeConcepto(catalogo, ['debito']);
  const movimientos = [
    { beneficiario: 'Banco Industrial', conceptoId: 'impuestos', fecha: '2026-01-10' },
    { beneficiario: 'banco industrial ', conceptoId: 'planilla', fecha: '2026-02-10' },
    { beneficiario: 'Otro', conceptoId: 'varios', fecha: '2026-03-01' },
  ];

  it('sugiere el último concepto usado con ese beneficiario, sin distinguir mayúsculas ni espacios', () => {
    expect(sugerirConcepto(movimientos, ' BANCO INDUSTRIAL', opciones)).toBe('planilla');
  });

  it('no sugiere sin beneficiario ni si nunca se usó con él', () => {
    expect(sugerirConcepto(movimientos, '', opciones)).toBeNull();
    expect(sugerirConcepto(movimientos, 'Desconocido', opciones)).toBeNull();
  });

  it('no sugiere un concepto que ya no se puede elegir (incompatible o inactivo)', () => {
    const deCredito = opcionesDeConcepto(catalogo, ['credito']);

    expect(sugerirConcepto(movimientos, 'Banco Industrial', deCredito)).toBeNull();
  });
});
