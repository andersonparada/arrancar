import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { dependenciasEnMemoria } from '../../../pruebas/dobles-de-anticipos.js';
import { conceptosDeLaEntrega, conceptosDelReembolso } from './desglose-del-anticipo.js';
import { EntregarAnticipo } from './entregar-anticipo.js';
import { LiquidarAnticipo } from './liquidar-anticipo.js';
import type { PeticionDeAnticipo } from './peticion-de-anticipo.js';
import type { PeticionParaLiquidarAnticipo } from './peticion-de-liquidacion.js';

const operador = operadorDePrueba();

const entrega = {
  forma: 'cheque',
  chequeraId: 'chequera-1',
  beneficiarioId: 'tercero-1',
  esEmpleado: true,
  clase: 'viatico',
  descripcion: 'Viaje',
  monto: '1000.00',
  fecha: '2026-11-10',
  puedeConVencidos: false,
} as PeticionDeAnticipo;

let piezas: ReturnType<typeof dependenciasEnMemoria>;
let anticipoId: string;

beforeEach(async () => {
  piezas = dependenciasEnMemoria();
  anticipoId = (await new EntregarAnticipo(piezas.dependencias).ejecutar(operador, entrega)).id;
  piezas.publicadorEventos.publicados.length = 0;
});

/** Lo gastado vigente, con dos documentos del libro y la parte de activo fijo. */
const gastar = (totalCentavos: number, deActivoCentavos = 0) => {
  piezas.consultas.reparto = {
    totalCentavos,
    deActivoCentavos,
    ultimaFecha: '2026-11-14',
    documentosDeCompraIds: ['doc-1', 'doc-2'],
  };
};

const liquidar = (cambios: Partial<PeticionParaLiquidarAnticipo> = {}) =>
  new LiquidarAnticipo(piezas.dependencias).ejecutar(operador, {
    anticipoId,
    devuelto: '0',
    noLiquidado: '0',
    ...cambios,
  });

describe('liquidar con lo que sobró devuelto', () => {
  beforeEach(() => gastar(70_000, 20_000));

  it('deposita lo devuelto con una nota de crédito, fija el reparto de la entrega y marca los documentos', async () => {
    const dto = await liquidar({ devuelto: '300.00', referencia: 'BOL-9' });

    expect(piezas.bancos.notasDeCredito[0]).toMatchObject({
      origen: { modulo: 'cuentas-por-liquidar', documentoId: anticipoId },
      cuentaBancariaId: 'cuenta-1',
      montoCentavos: 30_000,
      beneficiario: 'Ana López',
      referencia: 'BOL-9',
      conceptos: [{ claveDeSistema: 'devolucion_de_anticipo', montoCentavos: 30_000 }],
    });
    expect(dto).toMatchObject({
      estado: 'liquidado',
      porJustificar: '0.00',
      liquidacion: { devuelto: '300.00', reembolsado: '0.00', noLiquidado: '0.00', movimientoDeDevolucionId: 'mov-2' },
      puedeReabrir: true,
      puedeLiquidar: false,
    });
    expect(piezas.bancos.desgloses[0]).toMatchObject({
      movimientoId: 'mov-1',
      conceptos: [
        { claveDeSistema: 'gasto_de_anticipo', montoCentavos: 50_000 },
        { claveDeSistema: 'gasto_de_anticipo_de_activo', montoCentavos: 20_000 },
        { claveDeSistema: 'anticipo_por_liquidar', montoCentavos: 30_000 },
      ],
    });
    expect(piezas.documentos.marcas).toEqual([
      { documentoId: 'doc-1', procesado: true },
      { documentoId: 'doc-2', procesado: true },
    ]);
  });

  it('sin nada no liquidado no se audita; publica el evento con lo devuelto', async () => {
    await liquidar({ devuelto: '300.00' });

    expect(piezas.auditoria.entradas).toEqual([]);
    expect(piezas.publicadorEventos.nombres()).toEqual(['cuentas-por-liquidar.anticipo_liquidado']);
    expect(piezas.publicadorEventos.publicados[0]).toMatchObject({
      datos: { gastadoCentavos: 70_000, devueltoCentavos: 30_000, noLiquidadoCentavos: 0, destinoDeNoLiquidado: null },
    });
  });

  it('si lo devuelto no cuadra con lo que falta, rechaza sin ordenar nada a Bancos', async () => {
    await expect(liquidar({ devuelto: '100.00' })).rejects.toMatchObject({ codigo: 'liquidacion_no_cuadra' });

    expect(piezas.bancos.notasDeCredito).toEqual([]);
    expect(piezas.anticipos.guardados.get(anticipoId)!.estado).toBe('abierto');
  });

  it('si Bancos rechaza el depósito, el anticipo sigue abierto', async () => {
    piezas.bancos.rechazo = new Error('Mes conciliado');

    await expect(liquidar({ devuelto: '300.00' })).rejects.toThrow('Mes conciliado');
    expect(piezas.anticipos.guardados.get(anticipoId)!.estado).toBe('abierto');
    expect(piezas.documentos.marcas).toEqual([]);
  });
});

describe('liquidar con lo no liquidado', () => {
  beforeEach(() => gastar(70_000));

  it('lo deja con su destino y cuotas, audita «ajustar» con el motivo y reparte «no liquidado» en el desglose', async () => {
    const dto = await liquidar({
      devuelto: '100.00',
      noLiquidado: '200.00',
      destinoDeNoLiquidado: 'cobrar',
      cuotas: 6,
      motivoDeNoLiquidado: 'No entregó facturas',
    });

    expect(dto.liquidacion).toMatchObject({ noLiquidado: '200.00', destinoDeNoLiquidado: 'cobrar', cuotas: 6 });
    expect(piezas.auditoria.entradas).toMatchObject([
      { recurso: 'cuentas-por-liquidar.anticipos', accion: 'ajustar', motivo: 'No entregó facturas' },
    ]);
    expect((piezas.auditoria.entradas[0]!.anterior as { estado: string }).estado).toBe('abierto');
    expect(piezas.bancos.desgloses[0]!.conceptos).toEqual([
      { claveDeSistema: 'gasto_de_anticipo', montoCentavos: 70_000 },
      { claveDeSistema: 'anticipo_no_liquidado', montoCentavos: 20_000 },
      { claveDeSistema: 'anticipo_por_liquidar', montoCentavos: 10_000 },
    ]);
  });

  it('todo sin liquidar y sin devolver no ordena depósito', async () => {
    await liquidar({
      noLiquidado: '300.00',
      destinoDeNoLiquidado: 'perdida',
      motivoDeNoLiquidado: 'Se extravió',
    });

    expect(piezas.bancos.notasDeCredito).toEqual([]);
  });

  it('la renta del trabajo solo cabe en un empleado', async () => {
    const dependencias = dependenciasEnMemoria();
    const id = (
      await new EntregarAnticipo(dependencias.dependencias).ejecutar(operador, { ...entrega, esEmpleado: false })
    ).id;
    dependencias.consultas.reparto = { ...piezas.consultas.reparto, totalCentavos: 70_000 };

    await expect(
      new LiquidarAnticipo(dependencias.dependencias).ejecutar(operador, {
        anticipoId: id,
        devuelto: '0',
        noLiquidado: '300.00',
        destinoDeNoLiquidado: 'renta_del_trabajo',
        motivoDeNoLiquidado: 'Viáticos sin comprobar',
      }),
    ).rejects.toMatchObject({ codigo: 'renta_del_trabajo_solo_empleados' });
  });
});

describe('liquidar si se gastó de más', () => {
  beforeEach(() => gastar(130_000, 50_000));

  it('reembolsa con un cheque a nombre del beneficiario, con el reparto de lo gastado de más', async () => {
    const dto = await liquidar({ reembolso: { forma: 'cheque', chequeraId: 'chequera-2' } });

    expect(piezas.bancos.cheque).toMatchObject({
      chequeraId: 'chequera-2',
      montoCentavos: 30_000,
      beneficiario: 'Ana López',
      noNegociable: true,
      conceptos: [{ claveDeSistema: 'gasto_de_anticipo', montoCentavos: 30_000 }],
    });
    expect(dto.liquidacion).toMatchObject({
      reembolsado: '300.00',
      movimientoDeReembolsoId: 'mov-2',
      devuelto: '0.00',
    });
  });

  it('con nota de débito, la deja con su referencia', async () => {
    await liquidar({ reembolso: { forma: 'nota_de_debito', cuentaBancariaId: 'cuenta-9', referencia: 'TRF-1' } });

    expect(piezas.bancos.nota).toMatchObject({
      cuentaBancariaId: 'cuenta-9',
      referencia: 'TRF-1',
      montoCentavos: 30_000,
    });
  });

  it('sin decir cómo reembolsar, se rechaza', async () => {
    await expect(liquidar()).rejects.toMatchObject({ codigo: 'reembolso_sin_medio_de_pago' });
  });

  it('lo devuelto no cabe si se gastó de más', async () => {
    await expect(liquidar({ devuelto: '10.00' })).rejects.toMatchObject({ codigo: 'liquidacion_no_cuadra' });
  });
});

describe('reglas generales', () => {
  beforeEach(() => gastar(100_000));

  it('un anticipo liquidado o anulado no se liquida otra vez', async () => {
    await liquidar();

    await expect(liquidar()).rejects.toMatchObject({ codigo: 'anticipo_liquidado' });
  });

  it('la fecha no puede ser futura ni anterior al último gasto', async () => {
    await expect(liquidar({ fecha: '2026-11-19' })).rejects.toMatchObject({ codigo: 'fecha_de_liquidacion_invalida' });
    await expect(liquidar({ fecha: '2026-11-12' })).rejects.toMatchObject({ codigo: 'fecha_de_liquidacion_invalida' });
    expect((await liquidar({ fecha: '2026-11-14' })).liquidacion!.fecha).toBe('2026-11-14');
  });

  it('avisa si liquida el propio beneficiario (no bloquea)', async () => {
    const propio = operadorDePrueba();
    piezas.anticipos.guardados.set(anticipoId, {
      ...piezas.anticipos.guardados.get(anticipoId)!,
      beneficiarioUsuarioId: propio.usuarioId,
    });

    const dto = await new LiquidarAnticipo(piezas.dependencias).ejecutar(propio, {
      anticipoId,
      devuelto: '0',
      noLiquidado: '0',
    });

    expect(dto.avisos.join(' ')).toContain('Usted es el beneficiario');
  });

  it('un anticipo sin gastos se devuelve entero', async () => {
    gastar(0);
    piezas.consultas.reparto.documentosDeCompraIds = [];

    const dto = await liquidar({ devuelto: '1000.00' });

    expect(dto.liquidacion).toMatchObject({ devuelto: '1000.00' });
    expect(piezas.bancos.desgloses[0]!.conceptos).toEqual([
      { claveDeSistema: 'anticipo_por_liquidar', montoCentavos: 100_000 },
    ]);
  });
});

describe('el reparto por concepto', () => {
  const gastos = (totalCentavos: number, deActivoCentavos: number) => ({
    totalCentavos,
    deActivoCentavos,
    ultimaFecha: null,
    documentosDeCompraIds: [],
  });

  it('lo gastado de más se reparte entre la entrega (hasta el monto) y el reembolso, con el activo fijo primero en la entrega', () => {
    const anticipo = { montoCentavos: 100_000, noLiquidadoCentavos: 0 };
    const reparto = gastos(130_000, 120_000);

    expect(conceptosDeLaEntrega(anticipo, reparto)).toEqual([
      { claveDeSistema: 'gasto_de_anticipo_de_activo', montoCentavos: 100_000 },
    ]);
    expect(conceptosDelReembolso(100_000, reparto)).toEqual([
      { claveDeSistema: 'gasto_de_anticipo', montoCentavos: 10_000 },
      { claveDeSistema: 'gasto_de_anticipo_de_activo', montoCentavos: 20_000 },
    ]);
  });
});
