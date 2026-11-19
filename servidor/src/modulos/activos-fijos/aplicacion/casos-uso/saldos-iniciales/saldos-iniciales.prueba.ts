import { beforeEach, describe, expect, it } from 'vitest';
import { ActivoConMovimientos, ActivoInvalido, ComponenteDeUnComponente } from '../../../dominio/errores-de-activo.js';
import {
  CargaInicialCerrada,
  SaldoInicialInvalido,
  SaldoInicialSinFechaDeInicio,
  SaldosConCierres,
} from '../../../dominio/errores-de-saldo-inicial.js';
import { FechaDeUsoInvalida } from '../../../dominio/errores-de-depreciacion.js';
import {
  armarSaldos,
  operador,
  solicitudDeSaldo,
  type EscenarioDeSaldos,
} from '../../../pruebas/escenario-de-saldos.soporte.js';

let e: EscenarioDeSaldos;
let camionesId: string;

const cargar = (cambios: Parameters<typeof solicitudDeSaldo>[1] = {}) =>
  e.guardar.ejecutar(operador, solicitudDeSaldo(camionesId, cambios));
const tramosDe = (activoId: string) => e.tramos.porActivo.get(activoId) ?? [];

beforeEach(async () => {
  e = armarSaldos();
  camionesId = await e.claseDe('maquinaria_y_vehiculos', '20.00');
});

describe('GuardarSaldoInicial: el activo comprado hace años que aún se deprecia', () => {
  it('crea el activo en uso, su costo, su saldo, el traslado del alta y los dos tramos desde el mes de inicio', async () => {
    const saldo = await cargar({ cantidad: 3, enBodega: true });

    expect(saldo).toMatchObject({
      codigo: 'AF-0001',
      enConstruccion: false,
      fechaDeCorte: '2025-12-31',
      costo: '120000.00',
      depreciacionAcumuladaContable: '50000.00',
      valorEnLibros: '70000.00',
      costoFiscal: '120000.00',
      baseFiscal: '120000.00',
      depreciacionAcumuladaFiscal: '72000.00',
      porcentajeFiscal: '20.00',
      vidaUtilRestanteMeses: 36,
      cantidad: 3,
      enBodega: true,
    });
    expect(e.activos.registros.get(saldo.activoId)!.instantanea()).toMatchObject({
      origen: 'saldo_inicial',
      tipoDeRegistro: 'activo',
      estado: 'en_uso',
      fechaDeInicioDeUso: '2024-02-01',
      vidaUtilContableMeses: 36,
      cantidad: 3,
    });
    const [contable, fiscal] = tramosDe(saldo.activoId);
    expect(contable).toMatchObject({ libro: 'contable', causa: 'saldo_inicial', desdePeriodo: '2026-01-01' });
    expect(contable).toMatchObject({ porDepreciarCentavos: 7_000_000, cuotaMensualCentavos: 194_444 });
    expect(fiscal).toMatchObject({ libro: 'fiscal', porDepreciarCentavos: 4_800_000, cuotaMensualCentavos: 200_000 });
  });

  it('el costo del activo es un costo `saldo_inicial` fechado el día de corte', async () => {
    const saldo = await cargar();

    const [costo] = await e.costos.vigentesDeActivo(saldo.activoId);

    expect(costo!.instantanea()).toMatchObject({
      origen: 'saldo_inicial',
      fecha: '2025-12-31',
      montoCentavos: 12_000_000,
      aplicaAlLibroFiscal: true,
    });
  });

  it('el costo fiscal, la base y el porcentaje que no se escriben salen del costo y de la clase', async () => {
    const edificios = await e.claseDe('edificios', '5.00', '0.00');

    const saldo = await e.guardar.ejecutar(
      operador,
      solicitudDeSaldo(edificios, {
        costo: '400000.00',
        valorDeMatricula: '300000.00',
        depreciacionAcumuladaFiscal: '0.00',
      }),
    );

    expect(saldo).toMatchObject({ costoFiscal: '400000.00', baseFiscal: '300000.00', porcentajeFiscal: '5.00' });
  });

  it('el costo fiscal puede ser distinto del contable (revaluación) y lo escrito pesa más que lo propuesto', async () => {
    const saldo = await cargar({
      costoFiscal: '100000.00',
      baseFiscal: '90000.00',
      depreciacionAcumuladaFiscal: '10000.00',
    });

    expect(saldo).toMatchObject({ costo: '120000.00', costoFiscal: '100000.00', baseFiscal: '90000.00' });
    expect(tramosDe(saldo.activoId)[1]).toMatchObject({ porDepreciarCentavos: 8_000_000 });
  });

  it('la vida restante en cero deja solo el tramo fiscal', async () => {
    const saldo = await cargar({ vidaUtilRestanteMeses: 0 });

    expect(tramosDe(saldo.activoId).map((tramo) => tramo.libro)).toEqual(['fiscal']);
    expect(e.activos.registros.get(saldo.activoId)!.instantanea().vidaUtilContableMeses).toBeNull();
  });

  it('un terreno entra en uso sin tramos y una obra sin terminar queda en construcción sin tramos', async () => {
    const terrenos = await e.claseDe('terrenos', '0.00');

    const terreno = await e.guardar.ejecutar(
      operador,
      solicitudDeSaldo(terrenos, {
        depreciacionAcumuladaContable: '0.00',
        depreciacionAcumuladaFiscal: '0.00',
        vidaUtilRestanteMeses: null,
      }),
    );
    const obra = await cargar({
      enConstruccion: true,
      fechaDeInicioDeUso: null,
      depreciacionAcumuladaContable: '0.00',
      depreciacionAcumuladaFiscal: '0.00',
      vidaUtilRestanteMeses: null,
    });

    expect(terreno).toMatchObject({ enConstruccion: false, porcentajeFiscal: '0.00', baseFiscal: '0.00' });
    expect(obra).toMatchObject({ enConstruccion: true, fechaDeInicioDeUso: null });
    expect(tramosDe(terreno.activoId)).toHaveLength(0);
    expect(tramosDe(obra.activoId)).toHaveLength(0);
  });

  it('un componente se cuelga de un activo ya cargado, y no de otro componente', async () => {
    const principal = await cargar();
    const componente = await cargar({ activoPadreId: principal.activoId, descripcion: 'Motor' });

    await expect(cargar({ activoPadreId: componente.activoId })).rejects.toBeInstanceOf(ComponenteDeUnComponente);
    expect(componente.activoPadreId).toBe(principal.activoId);
  });
});

describe('GuardarSaldoInicial: lo que rechaza', () => {
  it.each([
    ['una adquisición igual o posterior a la fecha de inicio', { fechaDeAdquisicion: '2026-01-01' }],
    ['un inicio de uso posterior a la fecha de inicio', { fechaDeInicioDeUso: '2026-02-01' }],
    [
      'una obra con fecha de inicio de uso',
      { enConstruccion: true, depreciacionAcumuladaContable: '0.00', depreciacionAcumuladaFiscal: '0.00' },
    ],
    ['un activo en uso sin fecha de inicio de uso', { fechaDeInicioDeUso: null }],
    ['una depreciación acumulada mayor que el costo', { depreciacionAcumuladaContable: '120000.01' }],
    ['un porcentaje fiscal sobre el máximo de ley', { porcentajeFiscal: '25.00' }],
    ['una vida restante que falta', { vidaUtilRestanteMeses: null }],
  ])('rechaza %s', async (_caso, cambios) => {
    await expect(cargar(cambios)).rejects.toBeInstanceOf(SaldoInicialInvalido);
    expect(e.activos.registros.size).toBe(0);
  });

  it('un inicio de uso anterior a la adquisición no tiene sentido', async () => {
    await expect(cargar({ fechaDeInicioDeUso: '2023-12-01' })).rejects.toBeInstanceOf(FechaDeUsoInvalida);
  });

  it('un código con caracteres no válidos o una clase que no existe se rechazan como en el alta', async () => {
    await expect(cargar({ codigo: 'AF 01' })).rejects.toBeInstanceOf(ActivoInvalido);
    await expect(cargar({ claseId: crypto.randomUUID() })).rejects.toThrow('La clase de activo');
  });

  it('sin fecha de inicio, con la carga cerrada o con meses cerrados no se carga nada', async () => {
    e.carga.estado = { fechaDeInicio: null, cerrada: false };
    await expect(cargar()).rejects.toBeInstanceOf(SaldoInicialSinFechaDeInicio);
    e.carga.estado = { fechaDeInicio: '2026-01-01', cerrada: true };
    await expect(cargar()).rejects.toBeInstanceOf(CargaInicialCerrada);
    e.carga.estado = { fechaDeInicio: '2026-01-01', cerrada: false };
    e.cierres.ultimoMes = '2026-01-01';
    await expect(cargar()).rejects.toBeInstanceOf(SaldosConCierres);
    expect(e.activos.registros.size).toBe(0);
  });
});

describe('CorregirSaldoInicial', () => {
  it('rehace el activo, el costo, el saldo y los tramos, y audita `corregir` con cómo estaba', async () => {
    const saldo = await cargar({ descripcion: 'Camión', cantidad: 2 });

    const corregido = await e.corregir.ejecutar(operador, {
      activoId: saldo.activoId,
      solicitud: solicitudDeSaldo(camionesId, {
        descripcion: 'Camión de carga',
        costo: '150000.00',
        depreciacionAcumuladaContable: '30000.00',
        vidaUtilRestanteMeses: 48,
        depreciacionAcumuladaFiscal: '60000.00',
      }),
    });

    expect(corregido).toMatchObject({ activoId: saldo.activoId, codigo: saldo.codigo, descripcion: 'Camión de carga' });
    expect(corregido).toMatchObject({ costo: '150000.00', valorEnLibros: '120000.00', cantidad: 1 });
    const [costo] = await e.costos.vigentesDeActivo(saldo.activoId);
    expect(costo!.instantanea().montoCentavos).toBe(15_000_000);
    expect(tramosDe(saldo.activoId)).toHaveLength(2);
    expect(tramosDe(saldo.activoId)[0]).toMatchObject({ meses: 48, porDepreciarCentavos: 12_000_000 });
    expect(e.auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'activos-fijos.saldos-iniciales',
        accion: 'corregir',
        registroId: saldo.activoId,
      }),
    ]);
    expect(e.auditoria.entradas[0]!.anterior).toMatchObject({ descripcion: 'Camión', costo: '120000.00' });
  });

  it('puede pasar de obra en construcción a activo en uso y conserva su código si no se escribe otro', async () => {
    const obra = await cargar({
      enConstruccion: true,
      fechaDeInicioDeUso: null,
      depreciacionAcumuladaContable: '0.00',
      depreciacionAcumuladaFiscal: '0.00',
      vidaUtilRestanteMeses: null,
    });

    const enUso = await e.corregir.ejecutar(operador, {
      activoId: obra.activoId,
      solicitud: solicitudDeSaldo(camionesId),
    });

    expect(enUso).toMatchObject({ codigo: obra.codigo, enConstruccion: false });
    expect(tramosDe(obra.activoId)).toHaveLength(2);
  });

  it('con la carga cerrada o con meses cerrados ya no se corrige, y un activo que no es saldo inicial no existe aquí', async () => {
    const saldo = await cargar();
    const pedido = { activoId: saldo.activoId, solicitud: solicitudDeSaldo(camionesId) };

    e.carga.estado = { fechaDeInicio: '2026-01-01', cerrada: true };
    await expect(e.corregir.ejecutar(operador, pedido)).rejects.toBeInstanceOf(CargaInicialCerrada);
    e.carga.estado = { fechaDeInicio: '2026-01-01', cerrada: false };
    e.cierres.ultimoMes = '2026-01-01';
    await expect(e.corregir.ejecutar(operador, pedido)).rejects.toBeInstanceOf(SaldosConCierres);
    e.cierres.ultimoMes = null;
    await expect(e.corregir.ejecutar(operador, { ...pedido, activoId: crypto.randomUUID() })).rejects.toThrow(
      'El saldo inicial',
    );
  });
});

describe('EliminarSaldoInicial', () => {
  it('elimina el activo con su saldo y audita `eliminar` con el saldo como estaba', async () => {
    const saldo = await cargar();

    await e.eliminar.ejecutar(operador, saldo.activoId);

    expect(e.activos.registros.size).toBe(0);
    expect(e.auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'activos-fijos.saldos-iniciales',
        accion: 'eliminar',
        registroId: saldo.activoId,
      }),
    ]);
    expect(e.auditoria.entradas[0]!.anterior).toMatchObject({ costo: '120000.00', codigo: saldo.codigo });
  });

  it('no elimina uno con componentes o movimientos, ni con la carga cerrada o meses cerrados', async () => {
    const principal = await cargar();
    await cargar({ activoPadreId: principal.activoId, descripcion: 'Motor' });
    const conTraslado = await cargar({ descripcion: 'Otro' });
    e.activos.conTraslados.add(conTraslado.activoId);
    const libre = await cargar({ descripcion: 'Libre' });

    await expect(e.eliminar.ejecutar(operador, principal.activoId)).rejects.toBeInstanceOf(ActivoConMovimientos);
    await expect(e.eliminar.ejecutar(operador, conTraslado.activoId)).rejects.toBeInstanceOf(ActivoConMovimientos);
    e.carga.estado = { fechaDeInicio: '2026-01-01', cerrada: true };
    await expect(e.eliminar.ejecutar(operador, libre.activoId)).rejects.toBeInstanceOf(CargaInicialCerrada);
    e.carga.estado = { fechaDeInicio: '2026-01-01', cerrada: false };
    e.cierres.ultimoMes = '2026-01-01';
    await expect(e.eliminar.ejecutar(operador, libre.activoId)).rejects.toBeInstanceOf(SaldosConCierres);
    expect(e.auditoria.entradas).toHaveLength(0);
  });
});
