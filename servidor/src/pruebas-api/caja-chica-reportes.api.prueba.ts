/**
 * Los reportes de Caja chica (CC-10): CC-R1 pendientes de reponer al corte (también hacia atrás), CC-R2 reposiciones del
 * período por concepto, CC-R3 gastos sin documento fiscal, CC-R4 estado de los fondos al corte y CC-R5 arqueos del
 * período, el alcance por fondo y el aislamiento por empresa. El Excel y los permisos, en `caja-chica-reportes-excel`.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { usuarioIdDe } from './soporte/caja-chica-comprobantes.js';
import { RUTA_DE_ACCESOS } from './soporte/caja-chica-fondos.js';
import { prepararEscenarioDeReportes, RUTA_DE_REPORTES, verReporte } from './soporte/caja-chica-reportes.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: Awaited<ReturnType<typeof prepararEscenarioDeReportes>>['e'];
let fondoA: { id: string };
let fondoB: { id: string };
let anulado: { comprobanteId: string; reposicionId: string };

const ver = (ruta: string, cliente: ClienteApi = e.propietario()) => verReporte(cliente, ruta);
const RUTA = RUTA_DE_REPORTES;

beforeAll(async () => {
  ({ e, fondoA, fondoB, anulado } = await prepararEscenarioDeReportes(entorno, 'cajachicareportes'));
});

const filaDe = (reporte: any, fondoNombre: string) => reporte.fondos.find((f: any) => f.fondoNombre === fondoNombre);

describe('CC-R1: pendientes de reponer al corte', () => {
  it('hoy trae lo que no está en una reposición vigente, por fondo, con deducible y no deducible', async () => {
    const reporte = await ver('pendientes-de-reponer');

    expect(reporte.corte).toBe(HOY);
    const central = filaDe(reporte, 'Caja de reportes A');
    const documentos = central.filas.map((f: any) => f.documento);
    expect(documentos).toHaveLength(central.cantidad);
    expect(central.filas.filter((f: any) => f.clase === 'vale_de_gasto')).toHaveLength(1);
    expect(central.filas.find((f: any) => f.clase === 'vale_de_gasto')).toMatchObject({
      monto: '50.00',
      deducible: false,
      concepto: 'Medicinas',
    });
    expect(central.filas.some((f: any) => f.id === anulado.comprobanteId)).toBe(true);
    expect(central.deducible).toBe('2240.00');
    expect(filaDe(reporte, 'Caja de reportes B').filas).toHaveLength(1);
    expect(reporte.total.cantidad).toBe(reporte.fondos.reduce((s: number, f: any) => s + f.cantidad, 0));
  });

  it('con un corte anterior a la anulación, la reposición vigente ese día cubría el comprobante', async () => {
    const reporte = await ver(`pendientes-de-reponer?corte=${haceDias(1)}&fondoId=${fondoA.id}`);

    expect(reporte.fondos).toEqual([]);
  });

  it('con un corte anterior a la reposición, el comprobante estaba pendiente', async () => {
    const reporte = await ver(`pendientes-de-reponer?corte=${haceDias(4)}&fondoId=${fondoA.id}`);

    expect(reporte.fondos).toHaveLength(1);
    expect(reporte.fondos[0].filas.map((f: any) => f.id)).toEqual([anulado.comprobanteId]);
  });

  it('filtra por fondo y rechaza un corte mal escrito', async () => {
    const soloB = await ver(`pendientes-de-reponer?fondoId=${fondoB.id}`);
    expect(soloB.fondos.map((f: any) => f.fondoNombre)).toEqual(['Caja de reportes B']);
    expect((await e.propietario().get(`${RUTA}/pendientes-de-reponer?corte=ayer`)).estado).toBe(400);
  });
});

describe('CC-R2: reposiciones del período', () => {
  it('trae las vigentes con su cheque y reparte lo repuesto por concepto; las anuladas no cuentan', async () => {
    const reporte = await ver(`reposiciones?desde=${haceDias(10)}&hasta=${HOY}`);

    const central = filaDe(reporte, 'Caja de reportes A');
    expect(central.reposiciones).toHaveLength(1);
    expect(central.reposiciones[0]).toMatchObject({ forma: 'cheque', monto: '1120.00' });
    expect(central.reposiciones[0].respaldo).toMatch(/^Cheque /);
    expect(central.conceptos).toEqual([
      { concepto: 'Medicinas', deducible: '1120.00', noDeducible: '0.00', total: '1120.00' },
    ]);
    expect(reporte.total).toEqual({ cantidad: 1, deducible: '1120.00', noDeducible: '0.00', total: '1120.00' });
  });

  it('por omisión toma el mes de hoy y rechaza un período invertido', async () => {
    const reporte = await ver('reposiciones');
    expect(reporte.hasta).toBe(HOY);
    expect(reporte.desde).toBe(`${HOY.slice(0, 7)}-01`);
    const invertido = await e.propietario().get(`${RUTA}/reposiciones?desde=${HOY}&hasta=${haceDias(3)}`);
    expect(invertido.estado).toBe(400);
    expect(invertido.cuerpo.error.codigo).toBe('periodo_invertido');
  });
});

describe('CC-R3: gastos sin documento fiscal', () => {
  it('trae los vales de gasto y el documento fuera del libro, con su motivo, todo no deducible', async () => {
    const reporte = await ver('sin-documento-fiscal');

    const central = filaDe(reporte, 'Caja de reportes A');
    expect(central.filas.map((f: any) => f.motivo).sort()).toEqual(['El peaje no da factura', 'Es un recibo FEL']);
    expect(central).toMatchObject({ cantidad: 2, deducible: '0.00', noDeducible: '1170.00', total: '1170.00' });
    expect(filaDe(reporte, 'Caja de reportes B')).toMatchObject({ cantidad: 1, total: '50.00' });
    expect(reporte.total).toMatchObject({ cantidad: 3, deducible: '0.00', total: '1220.00' });
  });
});

describe('CC-R4: estado de los fondos al corte', () => {
  it('hoy trae el monto, lo pendiente, los vales y el último arqueo con su diferencia', async () => {
    const reporte = await ver('estado-de-fondos');

    const central = reporte.fondos.find((f: any) => f.nombre === 'Caja de reportes A');
    expect(central).toMatchObject({ monto: '6000.00', custodio: 'Juan Pérez', valesAbiertos: '0.00' });
    expect(central.diferenciaDelArqueo).toMatch(/^-/);
    expect(central.ultimoArqueo).not.toBeNull();
    expect(Number(central.efectivoEsperado)).toBe(Number(central.monto) - Number(central.pendienteDeReponer));
    const bodega = reporte.fondos.find((f: any) => f.nombre === 'Caja de reportes B');
    expect(bodega).toMatchObject({
      monto: '2000.00',
      pendienteDeReponer: '50.00',
      valesAbiertos: '200.00',
      efectivoEsperado: '1750.00',
      ultimoArqueo: null,
    });
  });

  it('antes de abrir los fondos no hay nada', async () => {
    const reporte = await ver(`estado-de-fondos?corte=${haceDias(1)}`);
    expect(reporte.fondos).toEqual([]);
    expect(reporte.total.monto).toBe('0.00');
  });
});

describe('CC-R5: arqueos del período', () => {
  it('trae el arqueo con su faltante, su destino y su motivo', async () => {
    const reporte = await ver(`arqueos?desde=${haceDias(1)}&hasta=${HOY}`);

    const central = filaDe(reporte, 'Caja de reportes A');
    expect(central.filas).toHaveLength(1);
    expect(central.filas[0]).toMatchObject({
      resultado: 'faltante',
      destino: 'perdida',
      motivo: 'Cambio mal dado',
    });
    expect(central.sobrantes).toBe('0.00');
    expect(Number(central.faltantes)).toBeGreaterThan(0);
    expect(reporte.total.cantidad).toBe(1);
  });

  it('un período sin arqueos sale vacío', async () => {
    const reporte = await ver('arqueos?desde=2020-01-01&hasta=2020-01-31');
    expect(reporte.total).toEqual({ cantidad: 0, faltantes: '0.00', sobrantes: '0.00' });
  });
});

describe('alcance por fondo y aislamiento', () => {
  it('quien solo tiene asignado el fondo B ve solo ese fondo en todos los reportes', async () => {
    const lector = await crearUsuarioConPermisos(entorno, e.caja.cuenta, {
      nombres: 'Lector del fondo B',
      apellidos: 'Reportes',
      permisos: ['caja-chica.reportes.ver'],
    });
    const id = await usuarioIdDe(e.caja.cuenta.empresaId, 'Lector del fondo B');
    const acceso = await e.propietario().put(`${RUTA_DE_ACCESOS}/${id}`, { fondoIds: [fondoB.id] });
    expect(acceso.estado, JSON.stringify(acceso.cuerpo)).toBe(200);

    const pendientes = await ver('pendientes-de-reponer', lector);
    const estado = await ver('estado-de-fondos', lector);
    const sinDocumento = await ver('sin-documento-fiscal', lector);

    expect(pendientes.fondos.map((f: any) => f.fondoNombre)).toEqual(['Caja de reportes B']);
    expect(estado.fondos.map((f: any) => f.nombre)).toEqual(['Caja de reportes B']);
    expect(sinDocumento.total.cantidad).toBe(1);
  });

  it('otra empresa no ve nada', async () => {
    const otra = await darDeAltaCuenta(entorno, {
      nombre: 'Otra de reportes de caja',
      usuario: 'cajachicareportesotra',
      modulos: ['terceros', 'libro-de-compras', 'bancos', 'caja-chica'],
    });

    const pendientes = await ver('pendientes-de-reponer', otra.propietario);
    const estado = await ver('estado-de-fondos', otra.propietario);

    expect(pendientes.fondos).toEqual([]);
    expect(estado.fondos).toEqual([]);
  });
});
