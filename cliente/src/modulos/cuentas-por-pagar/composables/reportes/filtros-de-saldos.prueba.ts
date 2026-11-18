import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  avisoDeCorteFuturo,
  cantidadDeFiltrosDeSaldos,
  consultaDeSaldos,
  errorDeCorte,
  filtrosDeSaldosIniciales,
  lineasDeImpresionDeSaldos,
} from './filtros-de-saldos';

beforeEach(() => setActivePinia(createPinia()));
const HOY = '2026-11-15';

describe('filtros de saldos por proveedor', () => {
  it('abre con el corte de hoy y sin filtros', () => {
    const filtros = filtrosDeSaldosIniciales(HOY);
    expect(filtros).toMatchObject({ corte: HOY, proveedorId: '', autorizacion: 'todos', incluirSinSaldo: false });
    expect(cantidadDeFiltrosDeSaldos(filtros, HOY)).toBe(0);
  });

  it('respeta el proveedor y el corte que pide otro reporte', () => {
    const filtros = filtrosDeSaldosIniciales(HOY, 'p-1', '2026-10-31');
    expect(filtros).toMatchObject({ proveedorId: 'p-1', corte: '2026-10-31' });
    expect(cantidadDeFiltrosDeSaldos(filtros, HOY)).toBe(2);
  });

  it('manda al servidor solo lo que se eligió', () => {
    expect(consultaDeSaldos(filtrosDeSaldosIniciales(HOY))).toEqual({
      corte: HOY,
      proveedorId: undefined,
      autorizacion: undefined,
      incluirSinSaldo: undefined,
      orden: undefined,
    });
    const elegido = {
      ...filtrosDeSaldosIniciales(HOY, 'p-1'),
      autorizacion: 'sin_autorizar' as const,
      incluirSinSaldo: true,
      orden: 'mayor_saldo' as const,
    };
    expect(consultaDeSaldos(elegido)).toMatchObject({
      proveedorId: 'p-1',
      autorizacion: 'sin_autorizar',
      incluirSinSaldo: true,
      orden: 'mayor_saldo',
    });
  });

  it('el corte no sirve vacío, a medias ni antes del día previo a la fecha de inicio', () => {
    expect(errorDeCorte('', null)).toMatch(/fecha de corte completa/);
    expect(errorDeCorte('2026-1', null)).toMatch(/completa/);
    expect(errorDeCorte('2026-10-01', null)).toBeUndefined();
    expect(errorDeCorte('2026-09-29', '2026-10-01')).toMatch(/anterior al 30\/09\/2026/);
    expect(errorDeCorte('2026-09-30', '2026-10-01')).toBeUndefined();
  });

  it('describe el corte y los filtros para el encabezado impreso', () => {
    const filtros = { ...filtrosDeSaldosIniciales(HOY), incluirSinSaldo: true };
    expect(lineasDeImpresionDeSaldos(filtros, 'Ferretería Sur')).toEqual([
      'Saldos al 15/11/2026',
      'Proveedor: Ferretería Sur',
      'Documentos: Todos los documentos',
      'Incluye proveedores sin saldo',
    ]);
  });
});

describe('aviso de un corte futuro', () => {
  it('avisa que son saldos proyectados si el corte es posterior a hoy', () => {
    expect(avisoDeCorteFuturo('2027-06-30', HOY)).toMatch(/saldos proyectados/);
  });

  it('no avisa con el corte de hoy, uno anterior o incompleto', () => {
    expect(avisoDeCorteFuturo(HOY, HOY)).toBeUndefined();
    expect(avisoDeCorteFuturo('2026-10-31', HOY)).toBeUndefined();
    expect(avisoDeCorteFuturo('2027-06', HOY)).toBeUndefined();
  });
});
