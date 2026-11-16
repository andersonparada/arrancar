import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import { DocumentosPorPagarDePrueba, MODULOS_DE_CUENTAS_POR_PAGAR } from './cuentas-por-pagar.js';
import {
  fecharAjuste,
  fecharPago,
  fecharReintegro,
  sembrarContrasenaEnLaBase,
  sembrarDocumento,
} from './cuentas-por-pagar-reportes.js';
import { sembrarAjuste } from './cuentas-por-pagar-notas.js';
import { sembrarPago, sembrarReintegro } from './cuentas-por-pagar-pagos.js';
import type { EntornoApi } from './entorno-api.js';
import {
  consultar,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  type EscenarioDeDocumentos,
} from './escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './escenarios.js';

/** El corte de las pruebas: el fin de octubre de 2026, con la empresa iniciada el 2026-01-01. */
export const CORTE = '2026-10-31';
export const PERMISOS_DE_SALDOS = 'cuentas-por-pagar.reportes-de-saldos';

/** Los ids que las pruebas necesitan para consultar y para anular después del corte. */
export interface MundoDeSaldos {
  escenario: EscenarioDeDocumentos;
  soloVer: ClienteApi;
  soloExportar: ClienteApi;
  proveedores: Record<'alfa' | 'beta' | 'gama' | 'delta' | 'epsilon', string>;
  /** Q100, Q200, Q300, Q400 y Q600 de Alfa, con vencimientos de «por vencer» a «más de 90 días». */
  facturas: Record<'f1' | 'f2' | 'f3' | 'f4' | 'f5', string>;
  notaDeAlfa: string;
  notaDeBeta: string;
  deDelta: string;
  deEpsilon: string;
  /** El único del libro (sin NIT), emitido antes de la fecha de inicio. */
  delLibro: string;
  pagoQueSeAnula: string;
  ajusteQueSeAnula: string;
  reintegroQueSeAnula: string;
}

const proveedor = async (escenario: EscenarioDeDocumentos, nombre: string, cuerpo: string) =>
  (await registrarProveedor(escenario.cuenta, nombre, { nit: nitValido(cuerpo) })).proveedorId;

async function sembrarFacturasDeAlfa(escenario: EscenarioDeDocumentos, alfa: string) {
  const factura = (
    numero: string,
    vencimiento: string,
    datos: { monto: string; total?: string; autorizado?: boolean },
  ) => sembrarDocumento(escenario, { proveedorId: alfa, numero, emision: '2025-12-01', vencimiento, ...datos });
  const f1 = await factura('F1', '2026-11-15', { monto: '100', autorizado: true });
  const f2 = await factura('F2', '2026-10-10', { monto: '200', autorizado: true });
  const f3 = await factura('F3', '2026-09-10', { monto: '300' });
  const f4 = await factura('F4', '2026-08-10', { monto: '400' });
  const f5 = await factura('F5', '2026-06-30', { monto: '500', total: '600' });
  return { f1, f2, f3, f4, f5 };
}

/** Los pagos de Alfa: uno ya hecho, uno posfechado (comprometido) y uno que las pruebas anulan después. */
async function sembrarPagosDeAlfa(escenario: EscenarioDeDocumentos, alfa: string, f: MundoDeSaldos['facturas']) {
  const contrasena = await sembrarContrasenaEnLaBase(escenario, alfa, [f.f2, f.f3, f.f4]);
  const pago = (cargoPropio: string, monto: string) =>
    sembrarPago(escenario, { contrasenaId: contrasena, lineas: [{ cargoPropio, monto }] });
  const hecho = await pago(f.f2, '50.00');
  await fecharPago(hecho.id, '2026-10-25', '2026-10-25');
  const posfechado = await pago(f.f3, '100.00');
  await fecharPago(posfechado.id, '2090-01-01', '2026-10-20');
  const queSeAnula = await pago(f.f4, '40.00');
  await fecharPago(queSeAnula.id, '2026-10-05', '2026-10-05');
  return queSeAnula.id;
}

async function sembrarCuentasDeLosDemas(escenario: EscenarioDeDocumentos, p: MundoDeSaldos['proveedores']) {
  const otro = (proveedorId: string, numero: string, datos: Partial<Parameters<typeof sembrarDocumento>[1]>) =>
    sembrarDocumento(escenario, {
      proveedorId,
      numero,
      emision: '2025-12-10',
      vencimiento: '2026-09-20',
      monto: '800',
      ...datos,
    });
  const gama = await otro(p.gama, 'G1', { vencimiento: '2026-04-01' });
  const contrasena = await sembrarContrasenaEnLaBase(escenario, p.gama, [gama]);
  const pagoDeGama = await sembrarPago(escenario, {
    contrasenaId: contrasena,
    lineas: [{ cargoPropio: gama, monto: '800.00' }],
  });
  await fecharPago(pagoDeGama.id, '2026-03-01', '2026-03-01');
  return {
    deDelta: await otro(p.delta, 'D1', {}),
    deEpsilon: await otro(p.epsilon, 'E1', {
      emision: '2025-12-20',
      vencimiento: '2026-11-15',
      monto: '70',
      total: '80',
      retenciones: '10',
      porPracticar: '5',
      registradoEl: '2026-11-10',
    }),
  };
}

/** El documento del libro de Q1,120.00 con Q120.00 retenidos, emitido antes de la fecha de inicio (factura vieja que llegó después). */
async function sembrarDocumentoDelLibro(escenario: EscenarioDeDocumentos): Promise<string> {
  const libroId = await new DocumentosPorPagarDePrueba(escenario, '2026-03-10').registrar();
  const [fila] = await consultar<{ id: string }>(
    `update cuentas_por_pagar.documentos set fecha_emision = '2025-11-20', vencimiento = '2026-02-15', total = 1120,
            retenciones = 120, creado_en = '2026-02-01' where documento_id = $1 returning id`,
    [libroId],
  );
  return fila!.id;
}

/**
 * Una empresa iniciada el 2026-01-01 con saldos iniciales de seis proveedores, un documento del libro anterior a la fecha de
 * inicio, pagos (hecho, posfechado y por anular), un ajuste y un reintegro. Lo sembrado en la base lleva fechas fijas.
 */
export async function prepararMundoDeSaldos(entorno: EntornoApi, usuario: string): Promise<MundoDeSaldos> {
  const escenario = await prepararEscenario(entorno, usuario, MODULOS_DE_CUENTAS_POR_PAGAR);
  const inicio = await escenario.cuenta.propietario.put(`/api/empresas/${escenario.cuenta.empresaId}/carga-inicial`, {
    fechaDeInicio: '2026-01-01',
  });
  expect(inicio.estado, JSON.stringify(inicio.cuerpo)).toBe(200);
  const conPermiso = (nombres: string, permiso: string) =>
    crearUsuarioConPermisos(entorno, escenario.cuenta, {
      nombres,
      apellidos: 'Saldos',
      permisos: [`${PERMISOS_DE_SALDOS}.${permiso}`],
    });
  const proveedores = {
    alfa: await proveedor(escenario, 'Alfa S.A.', '5900001'),
    beta: await proveedor(escenario, 'Beta S.A.', '5900002'),
    gama: await proveedor(escenario, 'Gama S.A.', '5900003'),
    delta: await proveedor(escenario, 'Delta S.A.', '5900004'),
    epsilon: await proveedor(escenario, 'Épsilon S.A.', '5900005'),
  };
  const facturas = await sembrarFacturasDeAlfa(escenario, proveedores.alfa);
  const notaDeAlfa = await sembrarDocumento(escenario, {
    proveedorId: proveedores.alfa,
    numero: 'N1',
    emision: '2025-12-01',
    vencimiento: null,
    monto: '250',
    tipo: 'nota_de_credito',
  });
  const notaDeBeta = await sembrarDocumento(escenario, {
    proveedorId: proveedores.beta,
    numero: 'N2',
    emision: '2025-12-01',
    vencimiento: null,
    monto: '300',
    tipo: 'nota_de_credito',
  });
  const pagoQueSeAnula = await sembrarPagosDeAlfa(escenario, proveedores.alfa, facturas);
  const ajusteQueSeAnula = await sembrarAjuste(escenario, notaDeAlfa, { monto: '50.00' });
  await fecharAjuste(ajusteQueSeAnula, '2026-10-15');
  const reintegroQueSeAnula = await sembrarReintegro(escenario, { notaPropia: notaDeBeta, monto: '100.00' });
  await fecharReintegro(reintegroQueSeAnula, '2026-10-20');
  const { deDelta, deEpsilon } = await sembrarCuentasDeLosDemas(escenario, proveedores);
  return {
    escenario,
    soloVer: await conPermiso('Solo ve', 'ver'),
    soloExportar: await conPermiso('Solo exporta', 'exportar'),
    proveedores,
    facturas,
    notaDeAlfa,
    notaDeBeta,
    deDelta,
    deEpsilon,
    delLibro: await sembrarDocumentoDelLibro(escenario),
    pagoQueSeAnula,
    ajusteQueSeAnula,
    reintegroQueSeAnula,
  };
}
