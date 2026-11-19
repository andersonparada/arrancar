import { beforeEach, describe, expect, it } from 'vitest';
import { CostoDeActivoNegativo, CostoInvalido, LineaSobrecapitalizada } from '../../../dominio/errores-de-costo.js';
import { MesCerrado } from '../../../dominio/errores-de-depreciacion.js';
import {
  ActivoSinDepreciacionParaMejorar,
  CambioAnteriorAlUltimoTramo,
  MejoraInvalida,
  MejoraSinCostoNeto,
} from '../../../dominio/errores-de-mejora.js';
import {
  armarMejoras,
  solicitudDeMejora,
  type EscenarioDeMejoras,
} from '../../../pruebas/escenario-de-mejoras.soporte.js';
import { lineaDePrueba } from '../../../pruebas/escenario-de-costos.soporte.js';

let e: EscenarioDeMejoras;

beforeEach(() => {
  e = armarMejoras();
});

const notaDeCredito = (costoCentavos: number) =>
  lineaDePrueba({ tipoDeDocumento: 'nota_de_credito', facturaCapitalizada: true, costoCentavos });

describe('RegistrarMejora: tramos y costos', () => {
  it('abre los dos tramos desde junio con los meses que quedaban y deja el costo con su mejora', async () => {
    const activo = await e.activoEnUso();

    const mejora = await e.registrar(activo.id.valor);

    expect(mejora).toMatchObject({
      numero: 1,
      clase: 'mejora',
      monto: '50000.00',
      cantidadDeCostos: 1,
      estado: 'vigente',
    });
    const nuevos = (await e.vigentes(activo.id.valor)).filter((tramo) => tramo.causa === 'mejora');
    expect(nuevos.map((t) => [t.libro, t.desdePeriodo, t.cuotaMensualCentavos])).toEqual([
      ['contable', '2027-06-01', 462_719],
      ['fiscal', '2027-06-01', 479_167],
    ]);
    const costos = await e.costos.vigentesDeActivo(activo.id.valor);
    expect(costos.map((c) => c.instantanea().mejoraId)).toEqual([null, mejora.id]);
    expect(e.publicador.nombres()).toEqual(['activos-fijos.mejora_capitalizada']);
    expect(e.publicador.publicados[0]!.datos).toMatchObject({
      mejoraId: mejora.id,
      montoCentavos: 5_000_000,
      clase: 'mejora',
    });
  });

  it('con una vida nueva el activo guarda su vida total y los meses del tramo son los dichos', async () => {
    const activo = await e.activoEnUso();

    await e.registrar(activo.id.valor, solicitudDeMejora({ vidaUtilRestanteContableMeses: 120 }));

    const contable = (await e.vigentes(activo.id.valor)).find((t) => t.causa === 'mejora' && t.libro === 'contable');
    expect(contable).toMatchObject({ meses: 120 });
    expect(activo.instantanea().vidaUtilContableMeses).toBe(123);
  });

  it('con meses ya cerrados parte de lo cerrado y empieza en el primer mes abierto', async () => {
    const activo = await e.activoEnUso();
    const tramos = await e.vigentes(activo.id.valor);
    e.cierres.ultimoMes = '2027-05-01';
    e.historial.porActivo.set(activo.id.valor, {
      depreciadoPorTramo: new Map(tramos.map((t) => [t.id, t.libro === 'contable' ? 1_125_000 : 1_250_001])),
      acumuladaCentavos: { contable: 1_125_000, fiscal: 1_250_001 },
    });

    await e.registrar(activo.id.valor);

    const nuevos = (await e.vigentes(activo.id.valor)).filter((t) => t.causa === 'mejora');
    expect(nuevos.map((t) => t.porDepreciarCentavos)).toEqual([26_375_000, 28_749_999]);
  });

  it('en el mismo mes del inicio de uso sustituye el tramo, y anularla repone el original', async () => {
    const activo = await e.activoEnUso();

    const mejora = await e.registrar(activo.id.valor, solicitudDeMejora({ fecha: '2027-03-20' }));

    expect((await e.vigentes(activo.id.valor)).map((t) => t.causa)).toEqual(['mejora', 'mejora']);
    await e.anular(mejora.id);
    expect((await e.vigentes(activo.id.valor)).map((t) => t.causa)).toEqual(['inicio_de_uso', 'inicio_de_uso']);
  });
});

describe('RegistrarMejora: costos posteriores desde el libro', () => {
  it('suma una nota de crédito de una línea (costo posterior) y el fiscal sigue sobre la base corregida', async () => {
    const activo = await e.activoEnUso();
    const linea = notaDeCredito(100_000);
    e.lineas.sembrar(linea);

    const mejora = await e.registrar(
      activo.id.valor,
      solicitudDeMejora({
        clase: 'costo_posterior',
        costosManuales: [],
        lineas: [{ lineaId: linea.lineaId, montoCentavos: -100_000, claseDeCosto: null }],
      }),
    );

    expect(mejora).toMatchObject({ clase: 'costo_posterior', monto: '-1000.00' });
    const fiscal = (await e.vigentes(activo.id.valor)).find(
      (t) => t.causa === 'costo_posterior' && t.libro === 'fiscal',
    );
    expect(fiscal).toMatchObject({ baseDelPorcentajeCentavos: 24_900_000, cuotaMensualCentavos: 415_000 });
    expect(e.costos.lineasBloqueadas).toEqual([linea.lineaId]);
  });

  it('respeta la regla de la línea: no se capitaliza más de lo que costó', async () => {
    const activo = await e.activoEnUso();
    const linea = lineaDePrueba({ costoCentavos: 100_000 });
    e.lineas.sembrar(linea);

    const registrar = e.registrar(
      activo.id.valor,
      solicitudDeMejora({
        costosManuales: [],
        lineas: [{ lineaId: linea.lineaId, montoCentavos: 100_001, claseDeCosto: null }],
      }),
    );

    await expect(registrar).rejects.toBeInstanceOf(LineaSobrecapitalizada);
  });

  it('una nota de crédito mayor que el costo del activo lo dejaría negativo', async () => {
    const activo = await e.activoEnUso();
    const linea = notaDeCredito(30_000_000);
    e.lineas.sembrar(linea);

    const registrar = e.registrar(
      activo.id.valor,
      solicitudDeMejora({
        clase: 'costo_posterior',
        costosManuales: [],
        lineas: [{ lineaId: linea.lineaId, montoCentavos: -30_000_000, claseDeCosto: null }],
      }),
    );

    await expect(registrar).rejects.toBeInstanceOf(CostoDeActivoNegativo);
  });
});

describe('RegistrarMejora: lo que se rechaza', () => {
  it('un activo en construcción y un terreno no reciben mejoras', async () => {
    const enConstruccion = await e.activoConCosto(await e.claseDe('maquinaria_y_vehiculos', '20.00'), '1000.00');
    const terreno = await e.activoConCosto(await e.claseDe('terrenos', '0.00'), '1000.00');
    await e.poner(terreno);

    await expect(e.registrar(enConstruccion.id.valor)).rejects.toBeInstanceOf(ActivoSinDepreciacionParaMejorar);
    await expect(e.registrar(terreno.id.valor)).rejects.toBeInstanceOf(ActivoSinDepreciacionParaMejorar);
  });

  it('la fecha no es futura, ni anterior al uso, ni de un mes cerrado', async () => {
    const activo = await e.activoEnUso();
    e.cierres.ultimoMes = '2027-05-01';

    await expect(e.registrar(activo.id.valor, solicitudDeMejora({ fecha: '2027-07-01' }))).rejects.toBeInstanceOf(
      MejoraInvalida,
    );
    await expect(e.registrar(activo.id.valor, solicitudDeMejora({ fecha: '2027-03-01' }))).rejects.toBeInstanceOf(
      MejoraInvalida,
    );
    await expect(e.registrar(activo.id.valor, solicitudDeMejora({ fecha: '2027-05-20' }))).rejects.toBeInstanceOf(
      MesCerrado,
    );
  });

  it('«no es edificación» solo se marca en los edificios', async () => {
    const activo = await e.activoEnUso();

    const registrar = e.registrar(activo.id.valor, solicitudDeMejora({ noEsEdificacion: true }));

    await expect(registrar).rejects.toBeInstanceOf(CostoInvalido);
  });

  it('exige al menos un costo y que una mejora sume', async () => {
    const activo = await e.activoEnUso();
    const linea = notaDeCredito(1_000);
    e.lineas.sembrar(linea);

    await expect(e.registrar(activo.id.valor, solicitudDeMejora({ costosManuales: [] }))).rejects.toBeInstanceOf(
      CostoInvalido,
    );
    const soloNota = solicitudDeMejora({
      costosManuales: [],
      lineas: [{ lineaId: linea.lineaId, montoCentavos: -1_000, claseDeCosto: null }],
    });
    await expect(e.registrar(activo.id.valor, soloNota)).rejects.toBeInstanceOf(MejoraSinCostoNeto);
  });

  it('no empieza antes del último cambio de depreciación del activo', async () => {
    const activo = await e.activoEnUso();
    await e.registrar(activo.id.valor);

    const registrar = e.registrar(activo.id.valor, solicitudDeMejora({ fecha: '2027-04-10' }));

    await expect(registrar).rejects.toBeInstanceOf(CambioAnteriorAlUltimoTramo);
  });

  it('una mejora no lleva la vida restante en un costo posterior', async () => {
    const activo = await e.activoEnUso();

    const registrar = e.registrar(
      activo.id.valor,
      solicitudDeMejora({ clase: 'costo_posterior', vidaUtilRestanteContableMeses: 12 }),
    );

    await expect(registrar).rejects.toBeInstanceOf(MejoraInvalida);
  });
});
