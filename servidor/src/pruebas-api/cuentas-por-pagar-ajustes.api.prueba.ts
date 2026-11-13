/**
 * Ajustar el saldo libre de una nota de crédito (CP2-4): total y parcial, topes, causas con su efecto, fechas,
 * auditoría y eventos tras confirmar.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import '../modulos/core/contratos/cuentas-por-pagar.contratos.js';
import { DocumentosPorPagarDePrueba, MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { AjustesDePrueba } from './soporte/cuentas-por-pagar-ajustes.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { haceDias, prepararEscenario, type EscenarioDeDocumentos } from './soporte/escenario-de-documentos.js';

const RUTA = '/api/cuentas-por-pagar';
const TOPE = 'cuentas-por-pagar.ajustes.tope_diferencia_menor';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let ayudas: AjustesDePrueba;
const eventos: Array<{ nombre: string; datos: Record<string, unknown> }> = [];

const propietario = () => escenario.cuenta.propietario;
const ajustar = (...pedido: Parameters<AjustesDePrueba['ajustar']>) => ayudas.ajustar(...pedido);
const ficha = (id: string) => ayudas.ficha(id);
const auditoria = (accion: string, registroId: string) => ayudas.auditoria(accion, registroId);
const unaNota = (opciones?: { completar?: boolean }) => ayudas.unaNota(opciones);

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpajustes', MODULOS_DE_CUENTAS_POR_PAGAR);
  ayudas = new AjustesDePrueba(escenario, new DocumentosPorPagarDePrueba(escenario, haceDias(3)), 5700000);
  for (const nombre of ['ajuste_registrado', 'ajuste_anulado'] as const) {
    busEventos.suscribir(`cuentas-por-pagar.${nombre}`, async (datos) => {
      eventos.push({ nombre, datos: datos as unknown as Record<string, unknown> });
    });
  }
});

afterAll(() => {
  eventos.length = 0;
});

describe('ajustar el saldo libre', () => {
  it('ajusta todo: baja el saldo libre, audita con la ficha anterior y publica el evento con su efecto', async () => {
    const contexto = await unaNota();

    const respuesta = await ajustar(contexto.notaPropia, { monto: '100.00', motivo: 'No lo devolverá' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({ id: contexto.notaPropia, saldo: '0.00', ajustado: '100.00' });
    expect(respuesta.cuerpo.puedeAjustar).toBe(false);
    const [ajuste] = respuesta.cuerpo.ajustes;
    expect(ajuste).toMatchObject({
      monto: '100.00',
      causa: 'no_recuperable',
      efecto: 'perdida',
      estado: 'vigente',
      puedeAnular: true,
      anulacion: null,
    });
    expect(ajuste.creadoPor).toBeTruthy();
    const [auditada] = await auditoria('ajustar', ajuste.id);
    expect(auditada).toMatchObject({ motivo: 'No lo devolverá', anterior: { id: contexto.notaPropia, ajustes: [] } });
    const evento = eventos.find(({ nombre, datos }) => nombre === 'ajuste_registrado' && datos.ajusteId === ajuste.id);
    expect(evento?.datos).toMatchObject({
      documentoId: contexto.notaPropia,
      montoCentavos: 10000,
      efecto: 'perdida',
      causa: 'no_recuperable',
      referencia: null,
      proveedorId: contexto.proveedorId,
      serie: 'N',
    });
    expect(evento?.datos.numero).toEqual(expect.any(String));
  });

  it('ajusta una parte y deja el resto libre; no pasa del saldo libre', async () => {
    const contexto = await unaNota();

    const parte = await ajustar(contexto.notaPropia, { monto: '30.00' });
    const demasiado = await ajustar(contexto.notaPropia, { monto: '70.01' });

    expect(parte.cuerpo).toMatchObject({ saldo: '70.00', ajustado: '30.00', puedeAjustar: true });
    expect(demasiado.cuerpo.error).toMatchObject({
      codigo: 'ajuste_mayor_que_el_saldo_libre',
      detalles: { campo: 'monto' },
    });
    expect((await ficha(contexto.notaPropia)).ajustes).toHaveLength(1);
  });

  it('rechaza una nota pendiente, una nota anulada y un documento que no es nota de crédito', async () => {
    const pendiente = await unaNota({ completar: false });
    const anulada = await unaNota();
    expect(
      (
        await propietario().post(`${RUTA}/documentos/${anulada.notaPropia}/anular`, {
          causa: 'error_de_captura',
          motivo: 'Error',
        })
      ).estado,
    ).toBe(200);

    const dePendiente = await ajustar(pendiente.notaPropia, { monto: '10.00' });
    const deAnulada = await ajustar(anulada.notaPropia, { monto: '10.00' });
    const deFactura = await ajustar(pendiente.facturaPropia, { monto: '10.00' });

    expect(dePendiente.cuerpo.error.codigo).toBe('nota_pendiente_no_se_ajusta');
    expect(deAnulada.cuerpo.error.codigo).toBe('no_es_nota_con_saldo');
    expect(deFactura.cuerpo.error.codigo).toBe('no_es_nota_con_saldo');
    expect((await ajustar(crypto.randomUUID(), { monto: '1.00' })).estado).toBe(404);
  });

  it('rechaza monto en cero, causa desconocida, motivo vacío y referencia larga', async () => {
    const contexto = await unaNota();

    const cero = await ajustar(contexto.notaPropia, { monto: '0.00' });
    const causa = await ajustar(contexto.notaPropia, { monto: '1.00', causa: 'otra' });
    const motivo = await ajustar(contexto.notaPropia, { monto: '1.00', motivo: '  ' });
    const referencia = await ajustar(contexto.notaPropia, { monto: '1.00', referencia: 'x'.repeat(101) });

    expect(cero.cuerpo.error.codigo).toBe('monto_de_ajuste_invalido');
    expect(causa.cuerpo.error.codigo).toBe('causa_de_ajuste_invalida');
    expect(motivo.cuerpo.error.codigo).toBe('motivo_invalido');
    expect(referencia.cuerpo.error.codigo).toBe('referencia_de_aplicacion_invalida');
    expect((await ficha(contexto.notaPropia)).ajustes).toEqual([]);
  });
});

describe('las causas', () => {
  it('«Diferencia menor» llega hasta el tope de la empresa (Q25 por omisión)', async () => {
    const contexto = await unaNota();
    const diferencia = (monto: string) => ajustar(contexto.notaPropia, { monto, causa: 'diferencia_menor' });

    const sobre = await diferencia('25.01');
    const justo = await diferencia('25.00');

    expect(sobre.cuerpo.error).toMatchObject({
      codigo: 'diferencia_menor_sobre_el_tope',
      detalles: { campo: 'monto' },
    });
    expect(justo.estado, JSON.stringify(justo.cuerpo)).toBe(201);
    expect(justo.cuerpo.ajustes[0]).toMatchObject({ causa: 'diferencia_menor', efecto: 'perdida' });
    expect(justo.cuerpo.topeDiferenciaMenor).toBe('25.00');
  });

  it('respeta el tope de la empresa, y con cero la causa no se puede usar', async () => {
    await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: escenario.cuenta.empresaId });
    const contexto = await unaNota();
    const diferencia = (monto: string) => ajustar(contexto.notaPropia, { monto, causa: 'diferencia_menor' });

    try {
      expect((await entorno.soporte.put(`/api/configuracion/${TOPE}`, { nivel: 'empresa', valor: 60 })).estado).toBe(
        204,
      );
      const conMas = await diferencia('60.00');
      expect((await entorno.soporte.put(`/api/configuracion/${TOPE}`, { nivel: 'empresa', valor: 0 })).estado).toBe(
        204,
      );
      const apagada = await diferencia('1.00');
      const fichaConTope = await ficha(contexto.notaPropia);

      expect(conMas.estado, JSON.stringify(conMas.cuerpo)).toBe(201);
      expect(apagada.cuerpo.error.codigo).toBe('diferencia_menor_sobre_el_tope');
      expect(fichaConTope.topeDiferenciaMenor).toBe('0.00');
    } finally {
      await entorno.soporte.delete(`/api/configuracion/${TOPE}?nivel=empresa`);
    }
  });

  it('«Compensado con otra cuenta» exige referencia y su efecto es transitorio', async () => {
    const contexto = await unaNota();
    const compensar = (cuerpo: Record<string, unknown>) =>
      ajustar(contexto.notaPropia, { monto: '40.00', causa: 'compensado_con_otra_cuenta', ...cuerpo });

    const sinReferencia = await compensar({});
    const enBlanco = await compensar({ referencia: '   ' });
    const con = await compensar({ referencia: ' Factura de venta 88 ' });

    expect(sinReferencia.cuerpo.error).toMatchObject({
      codigo: 'referencia_obligatoria',
      detalles: { campo: 'referencia' },
    });
    expect(enBlanco.cuerpo.error.codigo).toBe('referencia_obligatoria');
    expect(con.estado, JSON.stringify(con.cuerpo)).toBe(201);
    expect(con.cuerpo.ajustes[0]).toMatchObject({ efecto: 'transitoria', referencia: 'Factura de venta 88' });
    const evento = eventos.find(({ datos }) => datos.ajusteId === con.cuerpo.ajustes[0].id);
    expect(evento?.datos).toMatchObject({ efecto: 'transitoria', referencia: 'Factura de venta 88' });
  });
});

describe('la fecha del ajuste', () => {
  it('no puede ser futura ni anterior a la recepción de la nota; por omisión es hoy', async () => {
    const contexto = await unaNota();
    const pedir = (fecha: string) => ajustar(contexto.notaPropia, { monto: '10.00', fecha });

    const futura = await pedir(haceDias(-1));
    const anterior = await pedir(haceDias(4));
    const valida = await pedir(haceDias(2));
    const hoy = await ajustar(contexto.notaPropia, { monto: '10.00' });

    for (const respuesta of [futura, anterior]) {
      expect(respuesta.cuerpo.error).toMatchObject({
        codigo: 'fecha_de_ajuste_invalida',
        detalles: { campo: 'fecha' },
      });
    }
    expect(valida.estado, JSON.stringify(valida.cuerpo)).toBe(201);
    expect(valida.cuerpo.ajustes[0].fecha).toBe(haceDias(2));
    expect(hoy.cuerpo.ajustes[1].fecha).toBe(haceDias(0));
    expect(valida.cuerpo.fechaMinimaDeAjuste).toBe(haceDias(3));
  });
});
