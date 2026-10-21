import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { DteRecibido, MotivoDeDescarteInvalido, type DatosDelDte } from './dte-recibido.js';
import {
  ESTADOS_DE_DTE,
  TransicionDeDteInvalida,
  exigirTransicion,
  transicionValida,
  type EstadoDeDte,
} from './estado-de-dte.js';

const DATOS: DatosDelDte = {
  autorizacionFel: '6f1f3b0e-1c1a-4b57-9d33-0a1b2c3d4e5f',
  tipoDte: 'FACT',
  serie: 'A',
  numero: '1',
  fechaEmision: '2026-03-10',
  nitEmisor: '1234567',
  nombreEmisor: 'Proveedor',
  nitReceptor: '7654321',
  total: '112.00',
  iva: '12.00',
  idp: '0',
  otrosImpuestos: '0',
  otrosImpuestosDetalle: {},
  filaOriginal: {},
  estadoSat: 'vigente',
  anuladoEnLaSatEl: null,
};

const nuevo = () =>
  DteRecibido.crear({ empresaId: Identificador.nuevo<'Empresa'>(), loteId: crypto.randomUUID(), datos: DATOS });
const descarte = { motivo: 'No es de la empresa', por: crypto.randomUUID(), en: new Date('2026-03-11T10:00:00Z') };

describe('transiciones de estado de un DTE', () => {
  const permitidas: [EstadoDeDte, EstadoDeDte][] = [
    ['pendiente', 'registrado'],
    ['pendiente', 'descartado'],
    ['pendiente', 'bloqueado'],
    ['registrado', 'pendiente'],
    ['descartado', 'pendiente'],
    ['descartado', 'registrado'],
    ['bloqueado', 'pendiente'],
    ['bloqueado', 'registrado'],
    ['bloqueado', 'descartado'],
  ];

  it('permite solo las transiciones del diseño', () => {
    const todas = ESTADOS_DE_DTE.flatMap((desde) => ESTADOS_DE_DTE.map((hacia) => [desde, hacia] as const));
    const validas = todas.filter(([desde, hacia]) => transicionValida(desde, hacia));

    expect(validas).toHaveLength(permitidas.length);
    for (const [desde, hacia] of permitidas) expect(transicionValida(desde, hacia)).toBe(true);
  });

  it('un estado no pasa a sí mismo ni un registrado a descartado o bloqueado', () => {
    expect(() => exigirTransicion('pendiente', 'pendiente')).toThrow(TransicionDeDteInvalida);
    expect(() => exigirTransicion('registrado', 'descartado')).toThrow(TransicionDeDteInvalida);
    expect(() => exigirTransicion('registrado', 'bloqueado')).toThrow(TransicionDeDteInvalida);
  });
});

describe('DteRecibido', () => {
  it('entra pendiente, con el borrador vacío y el mismo lote como primero y último', () => {
    const { estado, documentoId, proveedorId, loteId, primerLoteId, noVinculado } = nuevo().instantanea();

    expect(estado).toBe('pendiente');
    expect([documentoId, proveedorId, noVinculado]).toEqual([null, null, false]);
    expect(loteId).toBe(primerLoteId);
  });

  it('se registra con su documento y vuelve a pendiente soltándolo', () => {
    const dte = nuevo();
    const documentoId = crypto.randomUUID();

    dte.registrar(documentoId);
    expect(dte.instantanea()).toMatchObject({ estado: 'registrado', documentoId });

    dte.devolverAPendiente();
    expect(dte.instantanea()).toMatchObject({ estado: 'pendiente', documentoId: null });
  });

  it('no se registra dos veces', () => {
    const dte = nuevo();
    dte.registrar(crypto.randomUUID());

    expect(() => dte.registrar(crypto.randomUUID())).toThrow(TransicionDeDteInvalida);
  });

  it('se descarta con motivo (sin espacios sobrantes) y se restaura limpiando el descarte', () => {
    const dte = nuevo();

    dte.descartar({ ...descarte, motivo: '  No es de la empresa  ' });
    expect(dte.instantanea()).toMatchObject({ estado: 'descartado', motivoDeDescarte: 'No es de la empresa' });

    dte.devolverAPendiente();
    expect(dte.instantanea()).toMatchObject({ estado: 'pendiente', motivoDeDescarte: null, descartadoEn: null });
  });

  it('no se descarta sin motivo o con uno de más de 300 letras', () => {
    expect(() => nuevo().descartar({ ...descarte, motivo: '   ' })).toThrow(MotivoDeDescarteInvalido);
    expect(() => nuevo().descartar({ ...descarte, motivo: 'x'.repeat(301) })).toThrow(MotivoDeDescarteInvalido);
  });

  it('se bloquea con su motivo y, al registrarse a mano, lo pierde', () => {
    const dte = nuevo();

    dte.bloquear('registrado_en_otra_empresa');
    expect(dte.instantanea()).toMatchObject({ estado: 'bloqueado', motivoDeBloqueo: 'registrado_en_otra_empresa' });

    dte.registrar(crypto.randomUUID());
    expect(dte.instantanea()).toMatchObject({ estado: 'registrado', motivoDeBloqueo: null });
  });

  it('una fila descartada puede registrarse (el usuario decidió registrarla)', () => {
    const dte = nuevo();
    dte.descartar(descarte);

    dte.registrar(crypto.randomUUID());

    expect(dte.estado).toBe('registrado');
    expect(dte.instantanea().motivoDeDescarte).toBeNull();
  });
});
