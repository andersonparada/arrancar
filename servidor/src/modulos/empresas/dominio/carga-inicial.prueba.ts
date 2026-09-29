import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { CargaInicial } from './carga-inicial.js';
import type { EmpresaId } from './empresa.js';
import {
  CargaInicialAbierta,
  CargaInicialCerrada,
  FechaDeInicioInvalida,
  MotivoDeReaperturaInvalido,
} from './errores.js';

const empresaId: EmpresaId = Identificador.nuevo();
const cierre = { cerradaEn: new Date('2026-09-29T15:00:00Z'), cerradaPor: crypto.randomUUID() };

function cargaCerrada(): CargaInicial {
  const carga = CargaInicial.iniciar(empresaId, '2026-01-01');
  carga.cerrar(cierre);
  return carga;
}

describe('fecha de inicio', () => {
  it('nace abierta con la fecha indicada', () => {
    const carga = CargaInicial.iniciar(empresaId, '2026-01-01');

    expect(carga.instantanea()).toEqual({ empresaId, fechaDeInicio: '2026-01-01', cierre: null });
    expect(carga.estaCerrada).toBe(false);
  });

  it.each(['2026-02-30', '2026-13-01', '01/01/2026', '', '2026-1-1'])('rechaza la fecha %j', (fecha) => {
    expect(() => CargaInicial.iniciar(empresaId, fecha)).toThrow(FechaDeInicioInvalida);
  });

  it('acepta el 29 de febrero solo en año bisiesto', () => {
    expect(() => CargaInicial.iniciar(empresaId, '2028-02-29')).not.toThrow();
    expect(() => CargaInicial.iniciar(empresaId, '2027-02-29')).toThrow(FechaDeInicioInvalida);
  });

  it('se puede cambiar mientras la carga está abierta', () => {
    const carga = CargaInicial.iniciar(empresaId, '2026-01-01');

    carga.cambiarFechaDeInicio('2026-02-01');

    expect(carga.instantanea().fechaDeInicio).toBe('2026-02-01');
  });

  it('no se puede cambiar con la carga cerrada', () => {
    expect(() => cargaCerrada().cambiarFechaDeInicio('2026-02-01')).toThrow(CargaInicialCerrada);
  });
});

describe('cerrar la carga inicial', () => {
  it('anota quién y cuándo', () => {
    const carga = cargaCerrada();

    expect(carga.estaCerrada).toBe(true);
    expect(carga.instantanea().cierre).toEqual(cierre);
  });

  it('no se cierra dos veces', () => {
    expect(() => cargaCerrada().cerrar(cierre)).toThrow(CargaInicialCerrada);
  });
});

describe('reabrir la carga inicial', () => {
  it('la deja abierta y devuelve el motivo sin espacios sobrantes', () => {
    const carga = cargaCerrada();

    const motivo = carga.reabrir('  Faltó un saldo de bancos  ');

    expect(motivo).toBe('Faltó un saldo de bancos');
    expect(carga.estaCerrada).toBe(false);
    expect(carga.instantanea().cierre).toBeNull();
  });

  it('exige un motivo', () => {
    expect(() => cargaCerrada().reabrir('   ')).toThrow(MotivoDeReaperturaInvalido);
    expect(() => cargaCerrada().reabrir('x'.repeat(501))).toThrow(MotivoDeReaperturaInvalido);
  });

  it('no hay nada que reabrir si está abierta', () => {
    expect(() => CargaInicial.iniciar(empresaId, '2026-01-01').reabrir('motivo')).toThrow(CargaInicialAbierta);
  });
});
