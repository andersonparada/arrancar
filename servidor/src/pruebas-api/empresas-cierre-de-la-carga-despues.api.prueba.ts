import ExcelJS from 'exceljs';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { RevisionDeCierreDeModulo } from '../modulos/core/contratos/empresas.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import type { ClienteApi } from './soporte/cliente-api.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraEmpresaId: string;
let respuesta: RevisionDeCierreDeModulo | null;

const base = (empresaId: string) => `/api/empresas/${empresaId}/carga-inicial`;
const fijarFecha = (empresaId: string, fechaDeInicio: string) =>
  cuenta.propietario.put(base(empresaId), { fechaDeInicio });
const cerrar = (empresaId: string, cuerpo: object = {}) => cuenta.propietario.post(`${base(empresaId)}/cerrar`, cuerpo);
const reabrir = (empresaId: string) =>
  cuenta.propietario.post(`${base(empresaId)}/reabrir`, { motivo: 'Corregir un saldo' });
const historial = (empresaId: string) => cuenta.propietario.get(`${base(empresaId)}/historial`);

const conDiferencia = (): RevisionDeCierreDeModulo => ({
  nombreDelModulo: 'Terceros de prueba',
  resumen: null,
  ruta: null,
  hallazgos: [
    {
      codigo: 'no_cuadra',
      nivel: 'pide_motivo',
      mensaje: 'La cuenta no cuadra',
      registro: { id: 'c1', nombre: 'Cuenta 1' },
    },
  ],
  cifras: [
    { clave: 'total', etiqueta: 'Total', tipo: 'monto', valor: '1250.50', registro: null },
    { clave: 'saldo', etiqueta: 'Saldo', tipo: 'monto', valor: '-10.00', registro: { id: 'c1', nombre: 'Cuenta 1' } },
    { clave: 'cuentas', etiqueta: 'Cuentas', tipo: 'cantidad', valor: '2', registro: null },
  ],
});

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Despues', usuario: 'propietariodespues', modulos: ['terceros'] });
  otraEmpresaId = (await cuenta.propietario.post('/api/empresas', { nombre: 'Parcela Despues' })).cuerpo.id;
  mediador.responder('terceros', 'empresas.revisar_cierre_de_carga', async () => respuesta);
});

beforeEach(() => {
  respuesta = null;
});

describe('lo que se ve después del cierre', () => {
  it('una carga abierta no tiene último cierre ni historial', async () => {
    await fijarFecha(cuenta.empresaId, '2026-01-01');

    const carga = await cuenta.propietario.get(base(cuenta.empresaId));

    expect(carga.cuerpo.ultimoCierre).toBeNull();
    expect((await historial(cuenta.empresaId)).cuerpo).toEqual([]);
  });

  it('una carga cerrada antes de EM-2 no tiene revisión guardada y no se inventa una', async () => {
    await cerrar(cuenta.empresaId);
    await comoPropietario(
      `delete from core.auditoria where recurso = 'empresas.cargas-iniciales' and accion = 'cerrar' and empresa_id = $1`,
      [cuenta.empresaId],
    );

    const carga = await cuenta.propietario.get(base(cuenta.empresaId));

    expect(carga.cuerpo).toMatchObject({
      cerrada: true,
      ultimoCierre: { diferencias: 0, avisos: 0, motivo: null, revisionGuardada: false },
    });
    expect((await historial(cuenta.empresaId)).cuerpo).toEqual([]);
  });

  it('cerrar, reabrir y volver a cerrar: el historial va del más nuevo al más viejo y el último cierre es el último', async () => {
    await fijarFecha(otraEmpresaId, '2026-03-15');
    await cerrar(otraEmpresaId);
    await reabrir(otraEmpresaId);
    respuesta = conDiferencia();
    await cerrar(otraEmpresaId, { motivo: 'Falta un estado de cuenta' });

    const entradas = (await historial(otraEmpresaId)).cuerpo;
    const carga = await cuenta.propietario.get(base(otraEmpresaId));

    expect(entradas.map((e: { accion: string }) => e.accion)).toEqual(['cerrar', 'reabrir', 'cerrar']);
    expect(entradas[0]).toMatchObject({
      motivo: 'Falta un estado de cuenta',
      diferencias: 1,
      avisos: 2,
      porNombre: 'Dueño Despues',
    });
    expect(entradas[1]).toMatchObject({ motivo: 'Corregir un saldo', diferencias: null });
    expect(entradas[2]).toMatchObject({ motivo: null, diferencias: 0, avisos: 2 });
    expect(carga.cuerpo.ultimoCierre).toEqual({
      diferencias: 1,
      avisos: 2,
      motivo: 'Falta un estado de cuenta',
      revisionGuardada: true,
    });
  });

  it('la revisión de un cierre trae los módulos, los hallazgos y las cifras como se guardaron', async () => {
    const [cierre] = (await historial(otraEmpresaId)).cuerpo;

    const { estado, cuerpo } = await cuenta.propietario.get(`${base(otraEmpresaId)}/cierres/${cierre.id}`);

    expect(estado).toBe(200);
    expect(cuerpo).toMatchObject({
      id: cierre.id,
      empresaId: otraEmpresaId,
      fechaDeInicio: '2026-03-15',
      cerradaPor: 'Dueño Despues',
      motivo: 'Falta un estado de cuenta',
      diferencias: 1,
      balanceDeApertura: null,
    });
    expect(cuerpo.huella).toMatch(/^[0-9a-f]{64}$/);
    expect(cuerpo.modulos[1].cifras).toHaveLength(3);
  });

  it('el id de una reapertura, el de otra empresa o uno que no existe dan 404', async () => {
    const [cierre, reapertura] = (await historial(otraEmpresaId)).cuerpo;
    const deOtra = (await historial(cuenta.empresaId)).cuerpo;
    expect(deOtra).toEqual([]);

    const comoReapertura = await cuenta.propietario.get(`${base(otraEmpresaId)}/cierres/${reapertura.id}`);
    const enOtraEmpresa = await cuenta.propietario.get(`${base(cuenta.empresaId)}/cierres/${cierre.id}`);
    const inexistente = await cuenta.propietario.get(`${base(otraEmpresaId)}/cierres/${crypto.randomUUID()}`);
    const exportarOtra = await cuenta.propietario.get(`${base(cuenta.empresaId)}/cierres/${cierre.id}/exportar`);

    expect([comoReapertura.estado, enOtraEmpresa.estado, inexistente.estado, exportarOtra.estado]).toEqual([
      404, 404, 404, 404,
    ]);
  });
});

describe('Excel del cierre', () => {
  it('trae tres hojas, los montos como número y la huella completa', async () => {
    const [cierre] = (await historial(otraEmpresaId)).cuerpo;

    const exportado = await cuenta.propietario.get(`${base(otraEmpresaId)}/cierres/${cierre.id}/exportar`);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(exportado.cuerpo as unknown as ExcelJS.Buffer);

    expect(exportado.estado).toBe(200);
    expect(exportado.cabeceras['content-disposition']).toMatch(
      /attachment; filename="cierre-carga-inicial-\d{4}-\d{2}-\d{2}\.xlsx"/,
    );
    expect(exportado.cabeceras['cache-control']).toBe('private, no-store');
    expect(libro.worksheets.map((hoja) => hoja.name)).toEqual(['Cierre', 'Hallazgos', 'Cifras']);
    const cierreHoja = libro.getWorksheet('Cierre')!.getRow(2);
    expect(cierreHoja.getCell(1).value).toBe('Parcela Despues');
    expect(cierreHoja.getCell(3).value).toBe('15/03/2026');
    expect(cierreHoja.getCell(6).value).toBe(1);
    expect(cierreHoja.getCell(8).value).toBe('Falta un estado de cuenta');
    expect(String(cierreHoja.getCell(12).value)).toBe(cierre.huella ?? String(cierreHoja.getCell(12).value));
    expect(String(cierreHoja.getCell(12).value)).toHaveLength(64);
    const cifras = libro.getWorksheet('Cifras')!;
    expect(cifras.getRow(2).values).toEqual([undefined, 'Terceros de prueba', '', 'Total', 1250.5]);
    expect(cifras.getRow(3).getCell(4).value).toBe(-10);
    expect(cifras.getRow(3).getCell(2).value).toBe('Cuenta 1');
    expect(libro.getWorksheet('Hallazgos')!.getRow(4).getCell(2).value).toBe('Pide motivo');
  });
});

describe('permisos de lo que se ve después del cierre', () => {
  let sinPermisos: ClienteApi;
  let soloVer: ClienteApi;
  let cierreId: string;

  beforeAll(async () => {
    sinPermisos = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Cierra',
      apellidos: 'Solo',
      permisos: ['empresas.ver', 'empresas.carga-inicial.cerrar'],
    });
    soloVer = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Ve',
      apellidos: 'Cierres',
      permisos: ['empresas.ver', 'empresas.carga-inicial.ver-cierres'],
    });
    await reabrir(cuenta.empresaId);
    respuesta = conDiferencia();
    await cerrar(cuenta.empresaId, { motivo: 'Falta un estado de cuenta' });
    cierreId = (await historial(cuenta.empresaId)).cuerpo[0].id;
  });

  it('sin ver-cierres, ni el historial ni la revisión: 403; con empresas.ver sí se ve la línea del cierre', async () => {
    expect((await sinPermisos.get(`${base(cuenta.empresaId)}/historial`)).estado).toBe(403);
    expect((await sinPermisos.get(`${base(cuenta.empresaId)}/cierres/${cierreId}`)).estado).toBe(403);
    expect((await sinPermisos.get(base(cuenta.empresaId))).cuerpo.ultimoCierre).toMatchObject({ diferencias: 1 });
  });

  it('con ver-cierres ve el historial y la revisión, pero no exporta sin el permiso de exportar', async () => {
    expect((await soloVer.get(`${base(cuenta.empresaId)}/historial`)).estado).toBe(200);
    expect((await soloVer.get(`${base(cuenta.empresaId)}/cierres/${cierreId}`)).estado).toBe(200);
    expect((await soloVer.get(`${base(cuenta.empresaId)}/cierres/${cierreId}/exportar`)).estado).toBe(403);
  });
});

describe('versión desconocida en la auditoría', () => {
  it('es un error de programación: la revisión no se inventa', async () => {
    const [cierre] = (await historial(otraEmpresaId)).cuerpo;
    await comoPropietario(`update core.auditoria set anterior = jsonb_set(anterior, '{version}', '99') where id = $1`, [
      cierre.id,
    ]);

    const leido = await cuenta.propietario.get(`${base(otraEmpresaId)}/cierres/${cierre.id}`);

    expect(leido.estado).toBe(500);
  });
});
