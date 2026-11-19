import { beforeEach, describe, expect, it } from 'vitest';
import {
  CostoDeActivoNegativo,
  CostoInvalido,
  LineaDescartada,
  LineaNoCapitalizable,
  LineaSobrecapitalizada,
  MontoDeCostoInvalido,
} from '../../../dominio/errores-de-costo.js';
import {
  activoNuevo,
  armarCostos,
  asignacion,
  lineaDePrueba,
  operador,
  type EscenarioDeCostos,
} from '../../../pruebas/escenario-de-costos.soporte.js';

let e: EscenarioDeCostos;

beforeEach(async () => {
  e = await armarCostos();
});

const costosDe = (activoId: string) =>
  [...e.costos.registros.values()].map((c) => c.instantanea()).filter((c) => c.activoId === activoId);
const montos = () => [...e.costos.registros.values()].map((c) => c.instantanea().montoCentavos);

describe('capitalizar una línea en un activo nuevo', () => {
  it('crea el activo en construcción con su costo, la fecha del documento y el código propuesto', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);

    const resultado = await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(linea.lineaId, 100_000, { activoNuevo: activoNuevo(e.claseId) })],
    });

    expect(resultado).toMatchObject({
      costos: 1,
      activos: [{ codigo: 'AF-0001', costo: '1000.00' }],
      altaConjuntaIds: [],
    });
    const activo = [...e.activos.registros.values()][0]!.instantanea();
    expect(activo).toMatchObject({ estado: 'en_construccion', fechaDeAdquisicion: '2026-11-01', altaConjuntaId: null });
    expect(costosDe(activo.id.valor)[0]).toMatchObject({
      origen: 'linea_de_compra',
      claseDeCosto: 'adquisicion',
      lineaDeDocumentoId: linea.lineaId,
      documentoDeCompraId: linea.documentoId,
      fecha: '2026-11-01',
      aplicaAlLibroFiscal: true,
    });
  });

  it('publica un evento por activo con sus costos, después de guardar', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);

    await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(linea.lineaId, 100_000, { activoNuevo: activoNuevo(e.claseId) })],
    });

    const [evento] = e.publicador.publicados;
    expect(evento?.nombre).toBe('activos-fijos.activo_capitalizado');
    expect(evento?.datos).toMatchObject({ incisoFiscal: 'maquinaria_y_vehiculos', periodo: '2026-11-01' });
    expect((evento?.datos as { costos: unknown[] }).costos).toHaveLength(1);
  });

  it('puede capitalizar de a partes: lo pendiente baja y el resto se capitaliza después', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);
    await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(linea.lineaId, 60_000, { activoNuevo: activoNuevo(e.claseId) })],
    });
    const primero = [...e.activos.registros.values()][0]!.id.valor;

    await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(linea.lineaId, 40_000, { activoId: primero })],
    });

    expect(costosDe(primero).map((c) => c.montoCentavos)).toEqual([60_000, 40_000]);
  });

  it('una línea se reparte entre varios activos nuevos en la misma operación', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);

    await e.capitalizar.ejecutar(operador, {
      asignaciones: [
        asignacion(linea.lineaId, 70_000, { activoNuevo: activoNuevo(e.claseId, { descripcion: 'Camión' }) }),
        asignacion(linea.lineaId, 30_000, { activoNuevo: activoNuevo(e.claseId, { descripcion: 'Remolque' }) }),
      ],
    });

    expect(montos()).toEqual([70_000, 30_000]);
  });

  it('varias líneas de documentos distintos suman al mismo activo', async () => {
    const factura = lineaDePrueba({ documento: 'A-1' });
    const flete = lineaDePrueba({ documento: 'B-7', costoCentavos: 20_000 });
    e.lineas.sembrar(factura);
    e.lineas.sembrar(flete);
    const creado = await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(factura.lineaId, 100_000, { activoNuevo: activoNuevo(e.claseId) })],
    });

    await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(flete.lineaId, 20_000, { activoId: creado.activos[0]!.id, claseDeCosto: 'flete' })],
    });

    expect(costosDe(creado.activos[0]!.id).map((c) => c.claseDeCosto)).toEqual(['adquisicion', 'flete']);
  });
});

describe('la regla de la línea', () => {
  it('no deja capitalizar más de lo que costó y no guarda nada', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);

    await expect(
      e.capitalizar.ejecutar(operador, {
        asignaciones: [asignacion(linea.lineaId, 100_001, { activoNuevo: activoNuevo(e.claseId) })],
      }),
    ).rejects.toBeInstanceOf(LineaSobrecapitalizada);
    expect(e.activos.registros.size).toBe(0);
    expect(e.costos.registros.size).toBe(0);
    expect(e.publicador.publicados).toHaveLength(0);
  });

  it('cuenta lo que ya estaba capitalizado y lo de las demás asignaciones de la misma operación', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);
    await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(linea.lineaId, 90_000, { activoNuevo: activoNuevo(e.claseId) })],
    });

    await expect(
      e.capitalizar.ejecutar(operador, {
        asignaciones: [
          asignacion(linea.lineaId, 6_000, { activoNuevo: activoNuevo(e.claseId) }),
          asignacion(linea.lineaId, 6_000, { activoNuevo: activoNuevo(e.claseId) }),
        ],
      }),
    ).rejects.toBeInstanceOf(LineaSobrecapitalizada);
    expect(e.costos.registros.size).toBe(1);
  });

  it('toma el candado de las líneas, en orden y sin repetir', async () => {
    const a = lineaDePrueba();
    const b = lineaDePrueba();
    e.lineas.sembrar(a);
    e.lineas.sembrar(b);

    await e.capitalizar.ejecutar(operador, {
      asignaciones: [
        asignacion(b.lineaId, 10_000, { activoNuevo: activoNuevo(e.claseId) }),
        asignacion(a.lineaId, 10_000, { activoNuevo: activoNuevo(e.claseId) }),
        asignacion(a.lineaId, 10_000, { activoNuevo: activoNuevo(e.claseId) }),
      ],
    });

    expect(e.costos.lineasBloqueadas).toEqual([a.lineaId, b.lineaId].sort());
  });

  it('el monto lleva el signo de la línea y no es cero', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);
    const pedir = (monto: number) =>
      e.capitalizar.ejecutar(operador, {
        asignaciones: [asignacion(linea.lineaId, monto, { activoNuevo: activoNuevo(e.claseId) })],
      });

    await expect(pedir(-500)).rejects.toBeInstanceOf(MontoDeCostoInvalido);
    await expect(pedir(0)).rejects.toBeInstanceOf(MontoDeCostoInvalido);
  });
});

describe('qué líneas se pueden capitalizar', () => {
  it('rechaza una línea que no existe, de un documento anulado o sin la marca de activo fijo', async () => {
    const anulada = lineaDePrueba({ documentoVigente: false });
    const sinMarca = lineaDePrueba({ esActivoFijo: false });
    e.lineas.sembrar(anulada);
    e.lineas.sembrar(sinMarca);
    const intentar = (lineaId: string) =>
      e.capitalizar.ejecutar(operador, {
        asignaciones: [asignacion(lineaId, 1_000, { activoNuevo: activoNuevo(e.claseId) })],
      });

    await expect(intentar(crypto.randomUUID())).rejects.toBeInstanceOf(LineaNoCapitalizable);
    await expect(intentar(anulada.lineaId)).rejects.toBeInstanceOf(LineaNoCapitalizable);
    await expect(intentar(sinMarca.lineaId)).rejects.toBeInstanceOf(LineaNoCapitalizable);
  });

  it('una línea descartada espera a que la devuelvan', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);
    await e.descartar.ejecutar(operador, { lineaId: linea.lineaId, motivo: 'Era gasto' });

    await expect(
      e.capitalizar.ejecutar(operador, {
        asignaciones: [asignacion(linea.lineaId, 1_000, { activoNuevo: activoNuevo(e.claseId) })],
      }),
    ).rejects.toBeInstanceOf(LineaDescartada);
  });

  it('cada parte lleva uno y solo un destino', async () => {
    const linea = lineaDePrueba();
    e.lineas.sembrar(linea);

    await expect(
      e.capitalizar.ejecutar(operador, { asignaciones: [asignacion(linea.lineaId, 1_000)] }),
    ).rejects.toBeInstanceOf(CostoInvalido);
    await expect(
      e.capitalizar.ejecutar(operador, {
        asignaciones: [
          asignacion(linea.lineaId, 1_000, { activoNuevo: activoNuevo(e.claseId), activoId: crypto.randomUUID() }),
        ],
      }),
    ).rejects.toBeInstanceOf(CostoInvalido);
    await expect(e.capitalizar.ejecutar(operador, { asignaciones: [] })).rejects.toBeInstanceOf(CostoInvalido);
  });
});

describe('notas de crédito y el total del activo', () => {
  it('una nota de crédito de una factura capitalizada resta del activo aunque su línea no esté marcada', async () => {
    const factura = lineaDePrueba();
    e.lineas.sembrar(factura);
    const creado = await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(factura.lineaId, 100_000, { activoNuevo: activoNuevo(e.claseId) })],
    });
    const nota = lineaDePrueba({
      tipoDeDocumento: 'nota_de_credito',
      esActivoFijo: false,
      facturaCapitalizada: true,
      costoCentavos: 30_000,
    });
    e.lineas.sembrar(nota);

    await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(nota.lineaId, -30_000, { activoId: creado.activos[0]!.id })],
    });

    expect(costosDe(creado.activos[0]!.id).map((c) => [c.claseDeCosto, c.montoCentavos])).toEqual([
      ['adquisicion', 100_000],
      ['nota_de_credito', -30_000],
    ]);
  });

  it('una nota mayor que lo capitalizado se rechaza: el costo del activo nunca es negativo (V-6)', async () => {
    const factura = lineaDePrueba({ costoCentavos: 20_000 });
    e.lineas.sembrar(factura);
    const creado = await e.capitalizar.ejecutar(operador, {
      asignaciones: [asignacion(factura.lineaId, 20_000, { activoNuevo: activoNuevo(e.claseId) })],
    });
    const nota = lineaDePrueba({ tipoDeDocumento: 'nota_de_credito', costoCentavos: 50_000 });
    e.lineas.sembrar(nota);

    await expect(
      e.capitalizar.ejecutar(operador, {
        asignaciones: [asignacion(nota.lineaId, -50_000, { activoId: creado.activos[0]!.id })],
      }),
    ).rejects.toBeInstanceOf(CostoDeActivoNegativo);
    expect(e.costos.registros.size).toBe(1);
  });

  it('una nota no crea un activo nuevo: quedaría con costo negativo', async () => {
    const nota = lineaDePrueba({ tipoDeDocumento: 'nota_de_credito', costoCentavos: 5_000 });
    e.lineas.sembrar(nota);

    await expect(
      e.capitalizar.ejecutar(operador, {
        asignaciones: [asignacion(nota.lineaId, -5_000, { activoNuevo: activoNuevo(e.claseId) })],
      }),
    ).rejects.toBeInstanceOf(CostoDeActivoNegativo);
  });
});
