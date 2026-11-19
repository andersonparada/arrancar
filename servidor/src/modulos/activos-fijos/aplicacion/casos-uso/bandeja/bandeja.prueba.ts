import { beforeEach, describe, expect, it } from 'vitest';
import {
  CostoInvalido,
  DescarteNoVigente,
  LineaConCostos,
  LineaDescartada,
  LineaNoCapitalizable,
} from '../../../dominio/errores-de-costo.js';
import {
  activoNuevo,
  armarCostos,
  asignacion,
  lineaDePrueba,
  operador,
  type EscenarioDeCostos,
} from '../../../pruebas/escenario-de-costos.soporte.js';
import { ListarBandeja } from './listar-bandeja.js';
import { AVISO_DE_DESCARTE } from './descartar-linea.js';
import type { FilaDeBandeja } from '../../puertos/consultas-bandeja.js';
import { UmbralFijo } from '../../../pruebas/dobles-de-costos.js';
import { CargaInicialDePrueba } from '../../../pruebas/dobles-de-activos.js';
import { UnidadDeTrabajoEnMemoria } from '../../../../core/compartido/pruebas/dobles-compartidos.js';

let e: EscenarioDeCostos;

beforeEach(async () => {
  e = await armarCostos();
});

describe('descartar una línea', () => {
  it('queda descartada con su motivo, en la auditoría con la línea, y avisa que la marca del libro no se corrige', async () => {
    const linea = lineaDePrueba({ documento: 'A-77', numeroDeLinea: 2 });
    e.lineas.sembrar(linea);

    const resultado = await e.descartar.ejecutar(operador, {
      lineaId: linea.lineaId,
      motivo: '  Era una reparación  ',
    });

    expect(resultado).toEqual({ lineaId: linea.lineaId, avisos: [AVISO_DE_DESCARTE] });
    expect(e.auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'activos-fijos.bandeja',
        accion: 'descartar',
        registroId: linea.lineaId,
        motivo: 'Era una reparación',
        anterior: { lineaId: linea.lineaId, documento: 'A-77', numeroDeLinea: 2, costo: '1000.00' },
      }),
    ]);
    expect(e.costos.lineasBloqueadas).toEqual([linea.lineaId]);
  });

  it('el motivo es obligatorio y no pasa de 300 caracteres', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);

    await expect(e.descartar.ejecutar(operador, { lineaId: linea.lineaId, motivo: '  ' })).rejects.toBeInstanceOf(
      CostoInvalido,
    );
    await expect(
      e.descartar.ejecutar(operador, { lineaId: linea.lineaId, motivo: 'x'.repeat(301) }),
    ).rejects.toBeInstanceOf(CostoInvalido);
  });

  it('no se descarta dos veces, ni una línea que no es de activo fijo', async () => {
    const linea = lineaDePrueba();
    const sinMarca = lineaDePrueba({ esActivoFijo: false });
    e.lineas.sembrar(linea);
    e.lineas.sembrar(sinMarca);
    await e.descartar.ejecutar(operador, { lineaId: linea.lineaId, motivo: 'Gasto' });

    await expect(e.descartar.ejecutar(operador, { lineaId: linea.lineaId, motivo: 'Otra vez' })).rejects.toBeInstanceOf(
      LineaDescartada,
    );
    await expect(e.descartar.ejecutar(operador, { lineaId: sinMarca.lineaId, motivo: 'Gasto' })).rejects.toBeInstanceOf(
      LineaNoCapitalizable,
    );
    await expect(
      e.descartar.ejecutar(operador, { lineaId: crypto.randomUUID(), motivo: 'Gasto' }),
    ).rejects.toBeInstanceOf(LineaNoCapitalizable);
  });

  it('una línea con costos vigentes no se descarta: primero se anulan sus costos', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);
    await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(linea.lineaId, 40_000, { activoNuevo: activoNuevo(e.claseId) })],
    });

    await expect(e.descartar.ejecutar(operador, { lineaId: linea.lineaId, motivo: 'Gasto' })).rejects.toBeInstanceOf(
      LineaConCostos,
    );
  });
});

describe('devolver una línea a la bandeja', () => {
  it('el descarte deja de estar vigente, queda en la auditoría y la línea se puede capitalizar otra vez', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);
    await e.descartar.ejecutar(operador, { lineaId: linea.lineaId, motivo: 'Creí que era gasto' });

    await e.devolver.ejecutar(operador, linea.lineaId);

    expect(e.auditoria.entradas.map((entrada) => entrada.accion)).toEqual(['descartar', 'devolver']);
    expect(e.auditoria.entradas[1]!.anterior).toMatchObject({ motivoDelDescarte: 'Creí que era gasto' });
    await expect(
      e.capitalizar.ejecutar(operador, {
        asignaciones: [asignacion(linea.lineaId, 1_000, { activoNuevo: activoNuevo(e.claseId) })],
      }),
    ).resolves.toMatchObject({ costos: 1 });
  });

  it('una línea que no está descartada no se devuelve', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);

    await expect(e.devolver.ejecutar(operador, linea.lineaId)).rejects.toBeInstanceOf(DescarteNoVigente);
  });

  it('se puede descartar otra vez después de devolverla', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);
    await e.descartar.ejecutar(operador, { lineaId: linea.lineaId, motivo: 'Gasto' });
    await e.devolver.ejecutar(operador, linea.lineaId);

    await expect(
      e.descartar.ejecutar(operador, { lineaId: linea.lineaId, motivo: 'Sí era gasto' }),
    ).resolves.toBeDefined();
  });
});

describe('listar la bandeja', () => {
  const fila = (cambios: Partial<FilaDeBandeja> = {}): FilaDeBandeja => ({
    lineaId: crypto.randomUUID(),
    documentoId: crypto.randomUUID(),
    numeroDeLinea: 1,
    tipoDeDocumento: 'factura',
    documento: 'A-1',
    fechaEmision: '2026-11-01',
    proveedorNombre: 'Agro S.A.',
    conceptoId: crypto.randomUUID(),
    conceptoNombre: 'Maquinaria',
    descripcion: null,
    tipoDeLinea: 'bien',
    costoCentavos: 100_000,
    capitalizadoCentavos: 25_000,
    claseSugeridaId: null,
    claseSugeridaNombre: null,
    activoSugeridoId: null,
    activoSugeridoCodigo: null,
    ...cambios,
  });

  const casosDe = (filas: FilaDeBandeja[], umbralCentavos: number, fechaDeInicio: string | null) =>
    new ListarBandeja({
      unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
      bandeja: { listar: async () => filas },
      umbral: new UmbralFijo(umbralCentavos),
      cargaInicial: new CargaInicialDePrueba({ fechaDeInicio, cerrada: false }),
    });

  it('muestra el pendiente, el umbral y marca lo anterior a la fecha de inicio', async () => {
    const filas = [fila(), fila({ fechaEmision: '2026-10-31', costoCentavos: 20_000, capitalizadoCentavos: 0 })];
    const casos = casosDe(filas, 50_000, '2026-11-01');

    const bandeja = await casos.ejecutar(operador);

    expect(bandeja.umbral).toBe('500.00');
    expect(
      bandeja.lineas.map((l) => [l.costo, l.capitalizado, l.pendiente, l.bajoElUmbral, l.anteriorALaFechaDeInicio]),
    ).toEqual([
      ['1000.00', '250.00', '750.00', false, false],
      ['200.00', '0.00', '200.00', true, true],
    ]);
  });

  it('sin umbral nada queda «bajo el umbral» y una nota de crédito nunca', async () => {
    const casos = casosDe(
      [fila({ costoCentavos: 100, capitalizadoCentavos: 0 }), fila({ costoCentavos: -100, capitalizadoCentavos: 0 })],
      0,
      null,
    );

    const bandeja = await casos.ejecutar(operador);

    expect(bandeja.umbral).toBeNull();
    expect(bandeja.lineas.map((l) => [l.bajoElUmbral, l.pendiente, l.anteriorALaFechaDeInicio])).toEqual([
      [false, '1.00', false],
      [false, '-1.00', false],
    ]);
  });
});
