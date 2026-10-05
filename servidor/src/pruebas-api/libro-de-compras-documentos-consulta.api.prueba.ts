import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  documentoDePrueba,
  haceDias,
  HOY,
  instalarDestinoFalso,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let ajeno: EscenarioDeDocumentos;
let otroProveedorId: string;
let soloCrear: ClienteApi;
let soloVer: ClienteApi;
const ids: Record<string, string> = {};

const propietario = () => escenario.cuenta.propietario;
const registrar = async (clave: string, cambios: Record<string, unknown> = {}) => {
  const respuesta = await propietario().post(RUTA_DOCUMENTOS, documentoDePrueba(escenario, cambios));
  expect(respuesta.estado).toBe(201);
  ids[clave] = respuesta.cuerpo.documento.id;
};
const listar = (consulta = '') => propietario().get(`${RUTA_DOCUMENTOS}${consulta}`);
const numeros = (respuesta: { cuerpo: { elementos: Array<{ numero: string }> } }) =>
  respuesta.cuerpo.elementos.map((fila) => fila.numero).sort();

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'consultadocumentos');
  ajeno = await prepararEscenario(entorno, 'consultaajena');
  await configurarEmpresa(escenario.cuenta, { agenteDeRetencionIva: 'contribuyente_especial' });
  otroProveedorId = (await registrarProveedor(escenario.cuenta, 'Agroservicios del Norte')).proveedorId;
  soloVer = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Solo ver',
    apellidos: 'Consulta',
    permisos: ['libro-de-compras.documentos.ver'],
  });
  soloCrear = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Solo crear',
    apellidos: 'Consulta',
    permisos: ['libro-de-compras.documentos.crear'],
  });
  await registrar('uno', { numero: 'C-1' });
  await registrar('retenido', { numero: 'C-2', lineas: [{ conceptoId: escenario.conceptoId, total: '5600.00' }] });
  await registrar('anterior', { numero: 'C-3', fechaEmision: haceDias(70), fechaRecepcion: haceDias(65) });
  await registrar('otro', { numero: 'C-4', proveedorId: otroProveedorId, nitEmisor: nitValido('9988771') });
  await registrar('nota', { numero: 'C-5', tipo: 'nota_de_credito', documentoAfectadoId: ids.uno, serie: 'N' });
  await propietario().post(`${RUTA_DOCUMENTOS}/${ids.anterior}/anular`, { motivo: 'Error de captura' });
});

afterAll(() => vi.restoreAllMocks());

describe('lista de documentos', () => {
  it('trae las filas con sus montos, retenciones y lo que se puede hacer con cada una', async () => {
    const respuesta = await listar();

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ total: 5, pagina: 1, limite: 50 });
    const retenido = respuesta.cuerpo.elementos.find((fila: { id: string }) => fila.id === ids.retenido);
    expect(retenido).toMatchObject({
      tipo: 'factura',
      destino: 'cuentas-por-pagar',
      estado: 'vigente',
      total: '5600.00',
      retenido: '90.00',
      netoAPagar: '5510.00',
      procesado: false,
      puedeAnular: true,
      puedeEliminar: true,
    });
  });

  it('una factura con una nota vigente no ofrece anular ni eliminar, y uno anulado tampoco', async () => {
    const filas = (await listar()).cuerpo.elementos;

    const poId = (id: string | undefined) => filas.find((fila: { id: string }) => fila.id === id);
    expect(poId(ids.uno)).toMatchObject({ puedeAnular: false, puedeEliminar: false });
    expect(poId(ids.anterior)).toMatchObject({ estado: 'anulado', puedeAnular: false, puedeEliminar: false });
    expect(poId(ids.nota)).toMatchObject({ tipo: 'nota_de_credito', documentoAfectadoId: ids.uno });
  });

  it('filtra por período, proveedor, estado, destino y tipo', async () => {
    const delMesAnterior = await listar(`?periodo=${haceDias(65)}`);
    const delMesActual = await listar(`?periodo=${HOY}`);
    const delOtroProveedor = await listar(`?proveedorId=${otroProveedorId}`);
    const anulados = await listar('?estado=anulado');
    const notas = await listar('?tipo=nota_de_credito');
    const aCajaChica = await listar('?destino=caja-chica');
    const aCuentasPorPagar = await listar('?destino=cuentas-por-pagar&estado=vigente');

    expect(numeros(delMesAnterior)).toEqual(['C-3']);
    expect(numeros(delMesActual)).toEqual(['C-1', 'C-2', 'C-4', 'C-5']);
    expect(numeros(delOtroProveedor)).toEqual(['C-4']);
    expect(numeros(anulados)).toEqual(['C-3']);
    expect(numeros(notas)).toEqual(['C-5']);
    expect(aCajaChica.cuerpo).toMatchObject({ elementos: [], total: 0 });
    expect(numeros(aCuentasPorPagar)).toEqual(['C-1', 'C-2', 'C-4', 'C-5']);
  });

  it('pagina: ordena del período más reciente al más antiguo y dice cuántos hay en total', async () => {
    const primera = await listar('?limite=2&pagina=1');
    const ultima = await listar('?limite=2&pagina=3');

    expect(primera.cuerpo).toMatchObject({ total: 5, pagina: 1, limite: 2 });
    expect(primera.cuerpo.elementos).toHaveLength(2);
    expect(ultima.cuerpo.elementos.map((fila: { id: string }) => fila.id)).toEqual([ids.anterior]);
  });

  it('una consulta mal escrita se rechaza', async () => {
    expect((await listar('?pagina=0')).estado).toBe(400);
    expect((await listar('?limite=500')).estado).toBe(400);
    expect((await listar('?estado=borrado')).estado).toBe(400);
  });

  it('no muestra los documentos de otra cuenta', async () => {
    const registro = await ajeno.cuenta.propietario.post(RUTA_DOCUMENTOS, documentoDePrueba(ajeno));
    expect(registro.estado).toBe(201);

    const ajena = await ajeno.cuenta.propietario.get(RUTA_DOCUMENTOS);
    const propia = await listar();

    expect(ajena.cuerpo.total).toBe(1);
    expect(propia.cuerpo.total).toBe(5);
    expect((await ajeno.cuenta.propietario.get(`${RUTA_DOCUMENTOS}/${ids.uno}`)).estado).toBe(404);
  });
});

describe('ficha del documento', () => {
  it('trae el encabezado, las líneas, las retenciones y las notas que rebajan la factura', async () => {
    const respuesta = await propietario().get(`${RUTA_DOCUMENTOS}/${ids.uno}`);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({
      id: ids.uno,
      estado: 'vigente',
      numero: 'C-1',
      nombreEmisor: 'Veterinaria El Quiroa',
      totales: { total: '1120.00', iva: '120.00' },
      puedeAnular: false,
      puedeEliminar: false,
      anuladoEn: null,
      procesadoEnDestinoEn: null,
    });
    expect(respuesta.cuerpo.lineas).toHaveLength(1);
    expect(respuesta.cuerpo.notas).toEqual([
      expect.objectContaining({ id: ids.nota, numero: 'C-5', serie: 'N', estado: 'vigente' }),
    ]);
  });

  it('trae las retenciones con su monto propuesto y el neto a pagar', async () => {
    const { cuerpo } = await propietario().get(`${RUTA_DOCUMENTOS}/${ids.retenido}`);

    expect(cuerpo.retenciones).toEqual([
      expect.objectContaining({ regla: 'iva_contribuyente_especial', monto: '90.00' }),
    ]);
    expect(cuerpo.netoAPagar).toBe('5510.00');
    expect(cuerpo.puedeAnular).toBe(true);
  });

  it('uno anulado muestra su motivo, su fecha y quién lo anuló', async () => {
    const { cuerpo } = await propietario().get(`${RUTA_DOCUMENTOS}/${ids.anterior}`);

    expect(cuerpo).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Error de captura' });
    expect(cuerpo.anuladoEn).toEqual(expect.any(String));
    expect(cuerpo.anuladoPor).toEqual(expect.any(String));
  });

  it('uno que no existe responde 404', async () => {
    const respuesta = await propietario().get(`${RUTA_DOCUMENTOS}/${crypto.randomUUID()}`);

    expect(respuesta.estado).toBe(404);
  });
});

describe('permisos de la lista y la ficha', () => {
  it('con documentos.ver se lista y se abre la ficha', async () => {
    expect((await soloVer.get(RUTA_DOCUMENTOS)).estado).toBe(200);
    expect((await soloVer.get(`${RUTA_DOCUMENTOS}/${ids.uno}`)).estado).toBe(200);
  });

  it('quien solo puede registrar no lista ni abre la ficha', async () => {
    const lista = await soloCrear.get(RUTA_DOCUMENTOS);
    const ficha = await soloCrear.get(`${RUTA_DOCUMENTOS}/${ids.uno}`);

    expect([lista.estado, ficha.estado]).toEqual([403, 403]);
    expect(lista.cuerpo.error.codigo).toBe('sin_permiso');
  });

  it('sin sesión responde 401', async () => {
    expect((await entorno.nuevoCliente().get(RUTA_DOCUMENTOS)).estado).toBe(401);
  });
});
