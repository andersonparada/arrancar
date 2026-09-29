import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { conceptoGeneral, crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA_CHEQUES = '/api/bancos/cheques';
const RUTA_REPORTE = '/api/bancos/cheques-caducos';
const VARIABLE = 'bancos.cheques.meses_de_vencimiento';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let autoriza: ClienteApi;
let cuentaPrincipalId: string;
let cuentaAparteId: string;
let conceptoId = '';

interface FilaDelReporte {
  numero: number;
  beneficiario: string;
  cuentaBancariaId: string;
  mesConciliado: boolean;
  origen: string;
  diasDeAntiguedad: number;
  monto: string;
}

const hoy = (): string => new Date().toISOString().slice(0, 10);

/** Una fecha de hace `meses` meses, sin salirse del rango que Bancos acepta (después del saldo inicial). */
function haceMeses(meses: number): string {
  const fecha = new Date();
  fecha.setUTCMonth(fecha.getUTCMonth() - meses, 15);
  return fecha.toISOString().slice(0, 10);
}

async function emitir(cuentaBancariaId: string, datos: { fecha: string; beneficiario: string; monto?: string }) {
  const siguiente = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/siguiente-cheque`);
  const emitido = await cuenta.propietario.post(`${RUTA_CHEQUES}/${siguiente.cuerpo.id}/emitir`, {
    fecha: datos.fecha,
    monto: datos.monto ?? '10.00',
    beneficiario: datos.beneficiario,
    noNegociable: true,
    conceptoId,
    referencia: null,
    observaciones: null,
  });
  expect(emitido.estado).toBe(200);
  return { chequeId: siguiente.cuerpo.id as string, movimientoId: emitido.cuerpo.id as string };
}

async function reporte(consulta = '', usuario: ClienteApi = cuenta.propietario) {
  const respuesta = await usuario.get(`${RUTA_REPORTE}${consulta}`);
  expect(respuesta.estado).toBe(200);
  return respuesta.cuerpo as {
    cheques: FilaDelReporte[];
    mesesDeAntiguedad: number;
    totalDeCheques: number;
    montoTotal: string;
  };
}

const beneficiariosDe = (cheques: FilaDelReporte[]) => cheques.map((c) => c.beneficiario).sort();

/** Concilia y autoriza enero de 2026 marcando solo lo indicado: lo demás queda en circulación. */
async function conciliarEnero(cuentaBancariaId: string, marcados: string[]): Promise<void> {
  const iniciada = await cuenta.propietario.post('/api/bancos/conciliaciones', {
    cuentaBancariaId,
    anio: 2026,
    mes: 1,
  });
  const ruta = `/api/bancos/conciliaciones/${iniciada.cuerpo.id}`;
  const saldoInicial = (iniciada.cuerpo.candidatos as Array<{ id: string; saldoInicial: boolean }>).find(
    (m) => m.saldoInicial,
  )!.id;
  await cuenta.propietario.put(`${ruta}/marcas`, { movimientoIds: [saldoInicial, ...marcados] });
  await cuenta.propietario.post(`${ruta}/terminar`, {});
  expect((await autoriza.post(`${ruta}/autorizar`, {})).estado).toBe(200);
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Cheques caducos',
    usuario: 'propietariochequescaducos',
    modulos: ['bancos'],
  });
  autoriza = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Autoriza',
    apellidos: 'Caducos',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
  });
  conceptoId = await conceptoGeneral(cuenta.propietario);
  cuentaPrincipalId = await crearCuentaBancaria(cuenta.propietario, 'Caducos principal');
  cuentaAparteId = await crearCuentaBancaria(cuenta.propietario, 'Caducos aparte');
  for (const id of [cuentaPrincipalId, cuentaAparteId]) {
    await cuenta.propietario.post(`/api/bancos/cuentas-bancarias/${id}/chequeras`, {
      serie: null,
      desde: 1,
      hasta: 30,
    });
  }
});

describe('reporte de cheques caducos por API', () => {
  beforeAll(async () => {
    await emitir(cuentaPrincipalId, { fecha: '2026-01-10', beneficiario: 'Viejo Proveedor', monto: '25.50' });
    const cobrado = await emitir(cuentaPrincipalId, { fecha: '2026-01-12', beneficiario: 'Cobrado' });
    const anulado = await emitir(cuentaPrincipalId, { fecha: '2026-01-14', beneficiario: 'Anulado' });
    await cuenta.propietario.post(`${RUTA_CHEQUES}/${anulado.chequeId}/anular`, { motivo: 'Se perdió' });
    const revertido = await emitir(cuentaPrincipalId, { fecha: '2026-01-16', beneficiario: 'Revertido' });
    await emitir(cuentaPrincipalId, { fecha: hoy(), beneficiario: 'Reciente' });
    await emitir(cuentaPrincipalId, { fecha: haceMeses(3), beneficiario: 'De tres meses' });
    await emitir(cuentaAparteId, { fecha: '2026-01-20', beneficiario: 'Otra Cuenta', monto: '4.50' });
    await conciliarEnero(cuentaPrincipalId, [cobrado.movimientoId]);
    // El cheque revertido estaba en circulación en un mes conciliado: se anula con su nota inversa.
    const anulacion = await cuenta.propietario.post(`${RUTA_CHEQUES}/${revertido.chequeId}/anular`, {
      motivo: 'Caduco',
    });
    expect(anulacion.estado).toBe(200);
  });

  it('solo entra el cheque emitido, sin cobrar y viejo: no el cobrado, el anulado, el revertido, el reciente ni el disponible', async () => {
    const { cheques } = await reporte(`?cuentaBancariaId=${cuentaPrincipalId}`);

    expect(beneficiariosDe(cheques)).toEqual(['Viejo Proveedor']);
    expect(cheques[0]).toMatchObject({ monto: '25.50', origen: 'suelto', mesConciliado: true });
    expect(cheques[0]!.diasDeAntiguedad).toBeGreaterThan(200);
  });

  it('informa si el mes está conciliado y suma el total de todas las cuentas', async () => {
    const todo = await reporte();

    expect(todo.mesesDeAntiguedad).toBe(7);
    expect(todo.totalDeCheques).toBe(2);
    expect(todo.montoTotal).toBe('30.00');
    const aparte = todo.cheques.find((c) => c.beneficiario === 'Otra Cuenta');
    expect(aparte).toMatchObject({ mesConciliado: false, cuentaBancariaId: cuentaAparteId });
  });

  it('filtra por cuenta y por beneficiario, sin importar mayúsculas y tomando los comodines como texto', async () => {
    const porCuenta = await reporte(`?cuentaBancariaId=${cuentaAparteId}`);
    const porBeneficiario = await reporte('?beneficiario=viejo');
    const conComodin = await reporte('?beneficiario=%25');

    expect(beneficiariosDe(porCuenta.cheques)).toEqual(['Otra Cuenta']);
    expect(beneficiariosDe(porBeneficiario.cheques)).toEqual(['Viejo Proveedor']);
    expect(conComodin.cheques).toEqual([]);
  });

  it('el filtro de meses acota la antigüedad: con 2 meses entra también el de tres', async () => {
    const dosMeses = await reporte('?meses=2');
    const muchos = await reporte('?meses=120');

    expect(dosMeses.mesesDeAntiguedad).toBe(2);
    expect(beneficiariosDe(dosMeses.cheques)).toEqual(['De tres meses', 'Otra Cuenta', 'Viejo Proveedor']);
    expect(muchos.cheques).toEqual([]);
  });

  it('rechaza meses fuera de rango', async () => {
    expect((await cuenta.propietario.get(`${RUTA_REPORTE}?meses=0`)).estado).toBe(400);
    expect((await cuenta.propietario.get(`${RUTA_REPORTE}?meses=121`)).estado).toBe(400);
  });

  it('la variable de la empresa manda cuando no hay filtro', async () => {
    await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
    const cambio = await entorno.soporte.put(`/api/configuracion/${VARIABLE}`, { nivel: 'empresa', valor: 2 });
    expect(cambio.estado).toBe(204);

    const conVariable = await reporte();
    const rechazada = await entorno.soporte.put(`/api/configuracion/${VARIABLE}`, { nivel: 'empresa', valor: 0 });
    await entorno.soporte.delete(`/api/configuracion/${VARIABLE}?nivel=empresa`);

    expect(conVariable.mesesDeAntiguedad).toBe(2);
    expect(conVariable.totalDeCheques).toBe(3);
    expect(rechazada.estado).toBe(400);
    expect((await reporte()).mesesDeAntiguedad).toBe(7);
  });

  it('exporta a Excel con el mismo filtro y respeta los permisos', async () => {
    const soloVer = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Ve caducos',
      permisos: ['bancos.cheques-caducos.ver'],
    });
    const sinPermiso = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Sin',
      apellidos: 'Permiso caducos',
      permisos: ['bancos.cheques.ver'],
    });

    const exportado = await cuenta.propietario.get(`${RUTA_REPORTE}/exportar?meses=7`);

    expect(exportado.estado).toBe(200);
    expect((await soloVer.get(`${RUTA_REPORTE}/exportar`)).estado).toBe(403);
    expect((await soloVer.get(RUTA_REPORTE)).estado).toBe(200);
    expect((await sinPermiso.get(RUTA_REPORTE)).estado).toBe(403);
  });

  it('no muestra los cheques de otra empresa', async () => {
    const otra = await darDeAltaCuenta(entorno, {
      nombre: 'Otra de caducos',
      usuario: 'propietariootracaducos',
      modulos: ['bancos'],
    });

    const respuesta = await otra.propietario.get(RUTA_REPORTE);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.cheques).toEqual([]);
  });
});
