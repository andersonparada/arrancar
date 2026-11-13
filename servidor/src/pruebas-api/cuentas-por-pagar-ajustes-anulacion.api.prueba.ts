/**
 * Anular un ajuste y los permisos de los ajustes (CP2-4): devuelve el saldo, audita, publica el evento y se pide cada
 * permiso por separado.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import '../modulos/core/contratos/cuentas-por-pagar.contratos.js';
import { DocumentosPorPagarDePrueba, MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { AjustesDePrueba } from './soporte/cuentas-por-pagar-ajustes.js';
import { sembrarAjuste } from './soporte/cuentas-por-pagar-notas.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { haceDias, prepararEscenario, type EscenarioDeDocumentos } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import type { ClienteApi } from './soporte/cliente-api.js';

const RUTA = '/api/cuentas-por-pagar';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let ayudas: AjustesDePrueba;
let soloVer: ClienteApi;
let soloCrear: ClienteApi;
const eventos: Array<{ nombre: string; datos: Record<string, unknown> }> = [];

const propietario = () => escenario.cuenta.propietario;
const ajustar = (...pedido: Parameters<AjustesDePrueba['ajustar']>) => ayudas.ajustar(...pedido);
const anular = (...pedido: Parameters<AjustesDePrueba['anular']>) => ayudas.anular(...pedido);
const ficha = (id: string) => ayudas.ficha(id);
const auditoria = (accion: string, registroId: string) => ayudas.auditoria(accion, registroId);
const unaNota = (opciones?: { completar?: boolean }) => ayudas.unaNota(opciones);

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpajustesb', MODULOS_DE_CUENTAS_POR_PAGAR);
  ayudas = new AjustesDePrueba(escenario, new DocumentosPorPagarDePrueba(escenario, haceDias(3)), 5800000);
  for (const nombre of ['ajuste_anulado'] as const) {
    busEventos.suscribir(`cuentas-por-pagar.${nombre}`, async (datos) => {
      eventos.push({ nombre, datos: datos as unknown as Record<string, unknown> });
    });
  }
  soloVer = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Solo mira',
    apellidos: 'Ajustes',
    permisos: ['cuentas-por-pagar.documentos.ver'],
  });
  soloCrear = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Solo ajusta',
    apellidos: 'Ajustes',
    permisos: ['cuentas-por-pagar.ajustes.crear'],
  });
});

afterAll(() => {
  eventos.length = 0;
});

describe('anular un ajuste', () => {
  it('devuelve el saldo libre, audita con el ajuste anterior y publica el evento con su efecto', async () => {
    const contexto = await unaNota();
    const { cuerpo } = await ajustar(contexto.notaPropia, { monto: '60.00' });
    const ajusteId = cuerpo.ajustes[0].id as string;

    const respuesta = await anular(ajusteId, { motivo: 'Lo devolvió' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ saldo: '100.00', ajustado: '0.00', puedeAjustar: true });
    expect(respuesta.cuerpo.ajustes[0]).toMatchObject({
      estado: 'anulado',
      puedeAnular: false,
      anulacion: { motivo: 'Lo devolvió' },
    });
    expect(respuesta.cuerpo.ajustes[0].anulacion.anuladoPorNombre).toBeTruthy();
    const [auditada] = await auditoria('anular', ajusteId);
    expect(auditada).toMatchObject({
      motivo: 'Lo devolvió',
      anterior: { id: ajusteId, monto: '60.00', estado: 'vigente' },
    });
    const evento = eventos.find(({ nombre, datos }) => nombre === 'ajuste_anulado' && datos.ajusteId === ajusteId);
    expect(evento?.datos).toMatchObject({ documentoId: contexto.notaPropia, montoCentavos: 6000, efecto: 'perdida' });
    expect(evento?.datos.fecha).toBe(haceDias(0));
  });

  it('no anula dos veces, pide motivo y responde 404 si no existe', async () => {
    const contexto = await unaNota();
    const ajusteId = (await ajustar(contexto.notaPropia, { monto: '10.00' })).cuerpo.ajustes[0].id as string;

    const sinMotivo = await anular(ajusteId, { motivo: ' ' });
    await anular(ajusteId);
    const otraVez = await anular(ajusteId);
    const noExiste = await anular(crypto.randomUUID());

    expect(sinMotivo.cuerpo.error.codigo).toBe('motivo_invalido');
    expect(otraVez.cuerpo.error.codigo).toBe('ajuste_ya_anulado');
    expect(noExiste.estado).toBe(404);
    expect(await auditoria('anular', ajusteId)).toHaveLength(1);
  });

  it('con el ajuste vigente la nota no se anula; anulado el ajuste, sí', async () => {
    const contexto = await unaNota();
    const ajusteId = (await ajustar(contexto.notaPropia, { monto: '10.00' })).cuerpo.ajustes[0].id as string;
    const cuerpo = { causa: 'error_de_captura', motivo: 'Error' };

    const bloqueada = await propietario().post(`${RUTA}/documentos/${contexto.notaPropia}/anular`, cuerpo);
    await anular(ajusteId);
    const permitida = await propietario().post(`${RUTA}/documentos/${contexto.notaPropia}/anular`, cuerpo);

    expect(bloqueada.cuerpo.error.codigo).toBe('nota_con_ajustes');
    expect(permitida.estado, JSON.stringify(permitida.cuerpo)).toBe(200);
  });
});

describe('los permisos', () => {
  it('ajustar pide ajustes.crear y anular pide ajustes.anular, cada uno por separado', async () => {
    const contexto = await unaNota();
    const sembrado = await sembrarAjuste(escenario, contexto.notaPropia, { monto: '5.00' });

    const sinPermiso = await ajustar(contexto.notaPropia, { monto: '10.00' }, soloVer);
    const anularSinPermiso = await anular(sembrado, { motivo: 'x' }, soloCrear);
    const conPermiso = await ajustar(contexto.notaPropia, { monto: '10.00' }, soloCrear);

    expect(sinPermiso.estado).toBe(403);
    expect(anularSinPermiso.estado).toBe(403);
    expect(conPermiso.estado, JSON.stringify(conPermiso.cuerpo)).toBe(201);
    expect((await ficha(contexto.notaPropia)).ajustes).toHaveLength(2);
  });
});
