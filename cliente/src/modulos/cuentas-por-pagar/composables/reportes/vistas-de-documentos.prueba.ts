import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  aplicarVista,
  cantidadDeFiltrosDeDocumentos,
  consultaDeDocumentos,
  consultaParaExportar,
  estadoDeImpresion,
  filtrosDeDocumentosVacios,
  lineasDeImpresionDeDocumentos,
  TOPE_DE_IMPRESION,
} from './vistas-de-documentos';

beforeEach(() => setActivePinia(createPinia()));
const HOY = '2026-11-15';
const vacios = filtrosDeDocumentosVacios(HOY);

describe('vistas de documentos a una fecha', () => {
  it('pendientes no agrega filtros', () => {
    expect(aplicarVista(vacios, 'pendientes', HOY)).toEqual(vacios);
  });

  it('vencidos marca solo vencidos y conserva el corte y el proveedor', () => {
    const base = { ...vacios, corte: '2026-10-31', proveedorId: 'p-1' };
    expect(aplicarVista(base, 'vencidos', HOY)).toMatchObject({
      vista: 'vencidos',
      vencidos: true,
      corte: '2026-10-31',
      proveedorId: 'p-1',
    });
  });

  it('por vencer pone el tope a siete días del corte', () => {
    expect(aplicarVista(vacios, 'por_vencer', HOY).venceHasta).toBe('2026-11-22');
    expect(aplicarVista({ ...vacios, corte: '2026-11-28' }, 'por_vencer', HOY).venceHasta).toBe('2026-12-05');
  });

  it('autorizados sin contraseña y retenciones por practicar usan el corte de hoy', () => {
    const atras = { ...vacios, corte: '2026-09-30' };
    expect(aplicarVista(atras, 'autorizados_sin_contrasena', HOY)).toMatchObject({
      corte: HOY,
      autorizacion: 'autorizados',
      sinContrasena: true,
    });
    expect(aplicarVista(atras, 'retenciones_por_practicar', HOY)).toMatchObject({
      corte: HOY,
      origen: 'saldo_inicial',
      conRetencionesPorPracticar: true,
    });
  });

  it('estado de pago propone el mes en curso', () => {
    expect(aplicarVista(vacios, 'estado_de_pago', HOY)).toMatchObject({
      emitidosDesde: '2026-11-01',
      emitidosHasta: HOY,
      estadoDePago: 'pendiente',
    });
  });

  it('al cambiar de vista se quitan los filtros propios de la anterior', () => {
    const vencidos = aplicarVista(vacios, 'vencidos', HOY);
    expect(aplicarVista(vencidos, 'pendientes', HOY).vencidos).toBe(false);
  });

  it('manda al servidor solo lo elegido, con página y límite', () => {
    expect(consultaDeDocumentos(vacios, 2, 50)).toEqual({ vista: 'pendientes', pagina: 2, limite: 50, corte: HOY });
    const consulta = consultaDeDocumentos(aplicarVista(vacios, 'vencidos', HOY), 1, 2000);
    expect(consulta).toMatchObject({ vencidos: true, limite: 2000 });
    expect(consulta).not.toHaveProperty('autorizacion');
  });

  it('Excel lleva todo lo filtrado, sin página ni límite', () => {
    const consulta = consultaParaExportar(aplicarVista(vacios, 'vencidos', HOY));
    expect(consulta).toMatchObject({ vencidos: true, corte: HOY });
    expect(consulta).not.toHaveProperty('pagina');
    expect(consulta).not.toHaveProperty('limite');
  });

  it('cuenta solo los filtros que se salen de la vista', () => {
    const vista = aplicarVista(vacios, 'vencidos', HOY);
    expect(cantidadDeFiltrosDeDocumentos(vista, HOY)).toBe(0);
    expect(cantidadDeFiltrosDeDocumentos({ ...vista, proveedorId: 'p-1', tipo: 'factura' }, HOY)).toBe(2);
  });

  it('imprime hasta 2,000 filas y con más avisa cuántas son', () => {
    expect(estadoDeImpresion(0).puede).toBe(false);
    expect(estadoDeImpresion(1).puede).toBe(true);
    expect(estadoDeImpresion(TOPE_DE_IMPRESION).puede).toBe(true);
    const sobra = estadoDeImpresion(2500);
    expect(sobra.puede).toBe(false);
    expect(sobra.mensaje).toBe('Son 2500 filas: acote el filtro o use Excel (se imprimen hasta 2000).');
  });

  it('describe la vista y los filtros para el encabezado impreso', () => {
    const lineas = lineasDeImpresionDeDocumentos(aplicarVista(vacios, 'por_vencer', HOY), null);
    expect(lineas).toEqual([
      'Por vencer, saldos al 15/11/2026',
      'Proveedor: todos',
      'Documentos: Todos los documentos',
      'Vencen hasta el 22/11/2026',
    ]);
  });
});
