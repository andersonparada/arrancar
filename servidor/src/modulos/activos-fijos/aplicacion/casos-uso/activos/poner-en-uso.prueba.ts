import { beforeEach, describe, expect, it } from 'vitest';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Costo } from '../../../dominio/costo.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { cuotasDelTramo } from '../../../dominio/depreciacion/cuotas-del-tramo.js';
import {
  ActivoNoEnConstruccion,
  ActivoSinCosto,
  FechaDeUsoInvalida,
  MesCerrado,
  ParametrosDeUsoInvalidos,
} from '../../../dominio/errores-de-depreciacion.js';
import { armarUso, operador, uso, type EscenarioDeUso } from '../../../pruebas/escenario-de-uso.soporte.js';

let e: EscenarioDeUso;

beforeEach(() => {
  e = armarUso();
});

describe('PonerEnUso: parámetros y tramos', () => {
  it('toma de la clase el porcentaje, la vida y el residual, y abre los dos tramos (ejemplo del pick-up)', async () => {
    const activo = await e.activoConCosto(await e.claseDe('maquinaria_y_vehiculos', '20.00'), '250000.00');

    const ficha = await e.poner(activo);

    expect(ficha).toMatchObject({ estado: 'en_uso', fechaDeInicioDeUso: '2027-03-10', porcentajeFiscal: '20.00' });
    expect(activo.instantanea()).toMatchObject({ vidaUtilContableMeses: 60, valorResidual: '25000.00' });
    const [contable, fiscal] = e.tramosDe(activo);
    expect(contable).toMatchObject({ libro: 'contable', desdePeriodo: '2027-03-01', cuotaMensualCentavos: 375000 });
    expect(fiscal).toMatchObject({ libro: 'fiscal', desdePeriodo: '2027-03-01', cuotaMensualCentavos: 416667 });
    expect(cuotasDelTramo(fiscal!)).toHaveLength(60);
  });

  it('con «mes siguiente» los tramos empiezan al mes siguiente', async () => {
    e.primerMes.regla = 'mes_siguiente';
    const activo = await e.activoConCosto(await e.claseDe('maquinaria_y_vehiculos', '20.00'), '1000.00');

    await e.poner(activo);

    expect(e.tramosDe(activo).map((tramo) => tramo.desdePeriodo)).toEqual(['2027-04-01', '2027-04-01']);
  });

  it('lo que el usuario escribe pesa más que lo propuesto, dentro del máximo de ley', async () => {
    const activo = await e.activoConCosto(await e.claseDe('maquinaria_y_vehiculos', '20.00'), '12000.00');

    await e.poner(activo, uso({ porcentajeFiscal: '15.00', vidaUtilContableMeses: 48, valorResidual: '2000.00' }));

    expect(activo.instantanea()).toMatchObject({
      porcentajeFiscal: '15.00',
      vidaUtilContableMeses: 48,
      valorResidual: '2000.00',
    });
    expect(e.tramosDe(activo)[0]).toMatchObject({ meses: 48, cuotaMensualCentavos: 20833 });
  });

  it('rechaza un porcentaje sobre el máximo de ley, una vida fuera de rango y un residual sobre el costo', async () => {
    const activo = await e.activoConCosto(await e.claseDe('maquinaria_y_vehiculos', '20.00'), '1000.00');

    await expect(e.poner(activo, uso({ porcentajeFiscal: '25.00' }))).rejects.toBeInstanceOf(ParametrosDeUsoInvalidos);
    await expect(e.poner(activo, uso({ vidaUtilContableMeses: 2000 }))).rejects.toBeInstanceOf(
      ParametrosDeUsoInvalidos,
    );
    await expect(e.poner(activo, uso({ valorResidual: '1000.01' }))).rejects.toBeInstanceOf(ParametrosDeUsoInvalidos);
    expect(activo.instantanea().estado).toBe('en_construccion');
    expect(e.tramosDe(activo)).toHaveLength(0);
  });

  it('exige costo vigente, salvo en los terrenos, que se ponen en uso sin tramos', async () => {
    const sinCosto = await e.activoConCosto(await e.claseDe('maquinaria_y_vehiculos', '20.00'), null);
    const terreno = await e.activoConCosto(await e.claseDe('terrenos', '0.00'), null);

    await expect(e.poner(sinCosto)).rejects.toBeInstanceOf(ActivoSinCosto);
    const ficha = await e.poner(terreno);

    expect(ficha).toMatchObject({ estado: 'en_uso', porcentajeFiscal: '0.00', vidaUtilContableMeses: null });
    expect(e.tramosDe(terreno)).toHaveLength(0);
  });
});

describe('PonerEnUso: base fiscal', () => {
  it('el reproductor toma su valor como ganado común como residual y no lo deprecia en el fiscal (V-9)', async () => {
    const clase = await e.claseDe('reproductores', '25.00', '0.00');
    const activo = await e.activoConCosto(clase, '20000.00', { valorComoGanadoComun: '8000.00' });

    await e.poner(activo);

    expect(activo.instantanea().valorResidual).toBe('8000.00');
    const [contable, fiscal] = e.tramosDe(activo);
    expect(contable!.porDepreciarCentavos).toBe(1200000);
    expect(fiscal).toMatchObject({ porDepreciarCentavos: 1200000, baseDelPorcentajeCentavos: 1200000 });
  });

  it('el edificio deprecia con el tope del inmueble; lo que no es edificación suma aparte', async () => {
    const clase = await e.claseDe('edificios', '5.00', '0.00');
    const activo = await e.activoConCosto(clase, '1500000.00', {
      valorDeMatricula: '1000000.00',
      valorCatastral: '1200000.00',
      valoresDelInmuebleCompleto: true,
    });
    await e.agregarCosto(activo, '100000.00', { noEsEdificacion: true });

    await e.poner(activo);

    const [contable, fiscal] = e.tramosDe(activo);
    expect(contable!.porDepreciarCentavos).toBe(160000000);
    expect(fiscal).toMatchObject({ porDepreciarCentavos: 94000000, cuotaMensualCentavos: 391667 });
  });

  it('un costo fuera del libro fiscal suma al contable pero no a la base fiscal', async () => {
    const activo = await e.activoConCosto(await e.claseDe('maquinaria_y_vehiculos', '20.00'), '10000.00');
    await e.agregarCosto(activo, '2000.00', { aplicaAlLibroFiscal: false, motivoFueraDelLibroFiscal: 'Sin factura' });

    await e.poner(activo);

    const [contable, fiscal] = e.tramosDe(activo);
    expect(contable!.porDepreciarCentavos + contable!.valorResidualCentavos).toBe(1200000);
    expect(fiscal!.porDepreciarCentavos).toBe(1000000);
  });
});

describe('PonerEnUso: obra de saldo inicial', () => {
  const cargarObra = async (costoFiscal: string, baseFiscal: string) => {
    const activo = await e.activoConCosto(await e.claseDe('maquinaria_y_vehiculos', '20.00'), null);
    const { empresaId } = operador;
    await e.costos.agregarVarios([
      Costo.deSaldoInicial({
        empresaId: Identificador.desde(empresaId),
        activoId: activo.id.valor,
        fecha: '2026-12-31',
        montoCentavos: 50_000_000,
      }),
    ]);
    await e.saldos.agregar({
      empresaId,
      activoId: activo.id.valor,
      fechaDeCorte: '2026-12-31',
      datos: {
        costoCentavos: 50_000_000,
        acumuladaContableCentavos: 0,
        costoFiscalCentavos: aCentavos(costoFiscal),
        baseFiscalCentavos: aCentavos(baseFiscal),
        acumuladaFiscalCentavos: 0,
        valorResidualCentavos: 0,
        porcentajeFiscal: '20.00',
        vidaUtilRestanteMeses: null,
      },
    });
    return activo;
  };

  it('la base fiscal sale del costo fiscal cargado, no del costo contable', async () => {
    const activo = await cargarObra('400000.00', '400000.00');

    await e.poner(activo);

    const [contable, fiscal] = e.tramosDe(activo);
    expect(contable!.porDepreciarCentavos + contable!.valorResidualCentavos).toBe(50_000_000);
    expect(fiscal).toMatchObject({ causa: 'inicio_de_uso', porDepreciarCentavos: 40_000_000 });
  });

  it('respeta la base fiscal guardada cuando es menor que el costo fiscal', async () => {
    const activo = await cargarObra('400000.00', '350000.00');

    await e.poner(activo);

    expect(e.tramosDe(activo)[1]!.porDepreciarCentavos).toBe(35_000_000);
  });

  it('un costo posterior suma a la base fiscal del saldo', async () => {
    const activo = await cargarObra('400000.00', '400000.00');
    await e.agregarCosto(activo, '10000.00', { fecha: '2027-01-10' });

    await e.poner(activo);

    expect(e.tramosDe(activo)[1]!.porDepreciarCentavos).toBe(41_000_000);
  });
});

describe('PonerEnUso: fechas y estados', () => {
  it('la fecha no puede ser anterior a la adquisición ni caer en un mes cerrado', async () => {
    const activo = await e.activoConCosto(await e.claseDe('maquinaria_y_vehiculos', '20.00'), '1000.00');

    await expect(e.poner(activo, uso({ fechaDeInicioDeUso: '2027-01-15' }))).rejects.toBeInstanceOf(FechaDeUsoInvalida);
    e.cierres.ultimoMes = '2027-03-01';
    await expect(e.poner(activo)).rejects.toBeInstanceOf(MesCerrado);
    await expect(e.poner(activo, uso({ fechaDeInicioDeUso: '2027-04-02' }))).resolves.toMatchObject({
      estado: 'en_uso',
    });
  });

  it('solo un activo en construcción se pone en uso; uno de control o inexistente no', async () => {
    const clase = await e.claseDe('maquinaria_y_vehiculos', '20.00');
    const enUso = await e.activoConCosto(clase, '1000.00');
    await e.poner(enUso);
    const deControl = await e.activoConCosto(clase, null, { tipoDeRegistro: 'bien_de_control' });

    await expect(e.poner(enUso)).rejects.toBeInstanceOf(ActivoNoEnConstruccion);
    await expect(e.poner(deControl)).rejects.toBeInstanceOf(ActivoNoEnConstruccion);
    await expect(
      e.ponerEnUso.ejecutar(operador, { activoId: crypto.randomUUID(), solicitud: uso() }),
    ).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });

  it('marcarlo ocioso no toca los parámetros ni los tramos: sigue depreciándose (V-4)', async () => {
    const activo = await e.activoConCosto(await e.claseDe('maquinaria_y_vehiculos', '20.00'), '1000.00');
    await e.poner(activo);
    const antes = structuredClone(e.tramosDe(activo));

    activo.marcarOcioso({ fecha: '2027-04-01', motivo: 'Sin operador' }, '2027-04-02');

    expect(activo.instantanea()).toMatchObject({ ocioso: true, porcentajeFiscal: '20.00', vidaUtilContableMeses: 60 });
    expect(e.tramosDe(activo)).toEqual(antes);
  });
});
