/**
 * Los cargos que una nota puede rebajar (CP2-3): orden y propuesta, el umbral de bancarización, y las notas y cargos de
 * saldo inicial (fecha de inicio como límite y saldo al inicio como tope).
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { archivoDeInstalacion } from '../modulos/core/configuracion/infraestructura/archivo-de-instalacion.js';
import {
  DocumentosPorPagarDePrueba,
  MODULOS_DE_CUENTAS_POR_PAGAR,
  proveedorConCredito,
} from './soporte/cuentas-por-pagar.js';
import { notaConSaldoLibre } from './soporte/cuentas-por-pagar-notas.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { haceDias, prepararEscenario, type EscenarioDeDocumentos } from './soporte/escenario-de-documentos.js';

const RUTA = '/api/cuentas-por-pagar';
const UMBRAL = 'cuentas-por-pagar.bancarizacion.umbral';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let documentos: DocumentosPorPagarDePrueba;
const NOMBRES = ['Alfa', 'Bravo', 'Cobre', 'Delta', 'Eco', 'Fénix', 'Gama', 'Halcón'];
let secuencia = 0;

const propietario = () => escenario.cuenta.propietario;
const cargosPara = async (notaPropia: string) => {
  const respuesta = await propietario().get(`${RUTA}/documentos/${notaPropia}/cargos-para-aplicar`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};
const aplicar = (notaPropia: string, cuerpo: Record<string, unknown>) =>
  propietario().post(`${RUTA}/documentos/${notaPropia}/aplicaciones`, cuerpo);

/** Un proveedor propio con una factura y una nota que deja Q100.00 de saldo libre. */
async function unaNota() {
  const { proveedorId, nitEmisor } = await proveedorConCredito(escenario, {
    nombre: `${NOMBRES[secuencia]} S.A.`,
    nit: String(5700000 + secuencia++),
    diasDeCredito: 30,
  });
  return { proveedorId, nitEmisor, ...(await notaConSaldoLibre(documentos, { proveedorId, nitEmisor })) };
}

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpaplicacioneslista', MODULOS_DE_CUENTAS_POR_PAGAR);
  documentos = new DocumentosPorPagarDePrueba(escenario, haceDias(3));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('los cargos para aplicar', () => {
  it('ofrece los cargos con saldo del proveedor, el autorizado primero, y propone el reparto', async () => {
    const contexto = await unaNota();
    const registrar = async (cambios: Record<string, unknown> = {}) =>
      (await documentos.fila(await documentos.registrar({ ...contexto, ...cambios })))!.id;
    const pendiente = await registrar();
    const autorizado = await registrar({ fechaEmision: haceDias(2) });
    await propietario().post(`${RUTA}/documentos/registrar`, { documentos: [{ id: autorizado }] });
    await propietario().post(`${RUTA}/documentos/autorizar`, { ids: [autorizado] });
    await unaNota();

    const resultado = await cargosPara(contexto.notaPropia);

    expect(resultado).toMatchObject({ saldoLibre: '100.00', fechaMinima: haceDias(0) });
    const ids = resultado.cargos.map((cargo: { id: string }) => cargo.id);
    expect(ids).toEqual([autorizado, pendiente]);
    expect(resultado.cargos[0]).toMatchObject({ propuesto: '100.00', saldo: '1120.00', estado: 'autorizado' });
    expect(resultado.cargos[1]).toMatchObject({ propuesto: '0.00', estado: 'pendiente', origen: 'libro_de_compras' });
    expect(ids).not.toContain(contexto.facturaPropia);
  });

  it('marca el cargo de Q30,000 o más y no el de Q29,999.99, y respeta el umbral de la instalación', async () => {
    const contexto = await unaNota();
    const grande = await documentos.registrar({
      ...contexto,
      lineas: [{ conceptoId: escenario.conceptoId, total: '30000.00' }],
    });
    const justo = await documentos.registrar({
      ...contexto,
      lineas: [{ conceptoId: escenario.conceptoId, total: '29999.99' }],
    });
    const [idGrande, idJusto] = [(await documentos.fila(grande))!.id, (await documentos.fila(justo))!.id];
    const marcas = async () =>
      Object.fromEntries(
        (await cargosPara(contexto.notaPropia)).cargos.map((c: { id: string; sobreUmbralDeBancarizacion: boolean }) => [
          c.id,
          c.sobreUmbralDeBancarizacion,
        ]),
      );

    expect(await marcas()).toEqual({ [idGrande]: true, [idJusto]: false });

    vi.spyOn(archivoDeInstalacion, 'valor').mockImplementation((clave) => (clave === UMBRAL ? 29999.99 : undefined));
    expect(await marcas()).toEqual({ [idGrande]: true, [idJusto]: true });
    vi.spyOn(archivoDeInstalacion, 'valor').mockImplementation((clave) => (clave === UMBRAL ? 40000 : undefined));
    expect(await marcas()).toEqual({ [idGrande]: false, [idJusto]: false });
  });
});

describe('saldos iniciales', () => {
  const inicio = () => haceDias(30);

  beforeAll(async () => {
    const respuesta = await propietario().put(`/api/empresas/${escenario.cuenta.empresaId}/carga-inicial`, {
      fechaDeInicio: inicio(),
    });
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  });

  /** Una nota y un cargo de saldo inicial: la nota deja Q40.00; el cargo debía Q50.00 y al corte faltaban Q30.00. */
  async function parDeSaldosIniciales() {
    const comunes = { fechaEmision: haceDias(60), retenciones: '0', retencionesPorPracticar: '0', vencimiento: null };
    const nota = await documentos.sembrarSaldoInicial({
      ...comunes,
      tipo: 'nota_de_credito',
      total: '40',
      saldoAlInicio: '40',
    });
    const cargo = await documentos.sembrarSaldoInicial({
      ...comunes,
      vencimiento: haceDias(10),
      total: '50',
      saldoAlInicio: '30',
    });
    return { nota, cargo };
  }

  it('una nota de saldo inicial no se aplica antes de la fecha de inicio y sí desde ella', async () => {
    const { nota, cargo } = await parDeSaldosIniciales();
    const lineas = [{ cargoId: cargo, monto: '10.00' }];

    const antes = await aplicar(nota, { fecha: haceDias(31), aplicaciones: lineas });
    const desdeElInicio = await aplicar(nota, { fecha: inicio(), aplicaciones: lineas });

    expect(antes.estado).toBe(400);
    expect(antes.cuerpo.error.codigo).toBe('fecha_de_aplicacion_invalida');
    expect(desdeElInicio.estado, JSON.stringify(desdeElInicio.cuerpo)).toBe(200);
    expect(desdeElInicio.cuerpo).toMatchObject({ origen: 'saldo_inicial', saldo: '30.00' });
  });

  it('un saldo inicial pagado en parte solo admite su saldo al inicio, no su total', async () => {
    const { nota, cargo } = await parDeSaldosIniciales();

    const listado = await cargosPara(nota);
    const demasiado = await aplicar(nota, { aplicaciones: [{ cargoId: cargo, monto: '30.01' }] });
    const justo = await aplicar(nota, { fecha: inicio(), aplicaciones: [{ cargoId: cargo, monto: '30.00' }] });

    expect(listado.fechaMinima).toBe(inicio());
    expect(listado.cargos.find((c: { id: string }) => c.id === cargo)).toMatchObject({
      total: '50.00',
      saldo: '30.00',
      origen: 'saldo_inicial',
      fechaRecepcion: null,
    });
    expect(demasiado.cuerpo.error.codigo).toBe('aplicacion_mayor_que_el_saldo');
    expect(justo.estado, JSON.stringify(justo.cuerpo)).toBe(200);
  });
});
