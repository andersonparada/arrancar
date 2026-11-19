import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../compartido/pruebas/dobles-compartidos.js';
import {
  DocumentosFalsos,
  ParametrosFijos,
  RepositorioDeCorreosEnMemoria,
  TareasEnLaTransaccion,
} from '../pruebas/dobles-de-la-bandeja.js';
import { HistorialEnMemoria, correoDePrueba } from '../pruebas/historial-en-memoria.js';
import { BandejaDeSalidaDeCore } from './bandeja-de-salida-de-core.js';
import { CancelarCorreo } from './casos-uso/cancelar-correo.js';
import { EncolarCorreo } from './casos-uso/encolar-correo.js';
import { CorreoNoPendiente } from './errores-del-historial.js';

const ORIGEN = { recurso: 'cuentas-por-pagar.pagos', registroId: 'pago-1' };
const operador = operadorDePrueba();

let historial: HistorialEnMemoria;
let auditoria: AuditoriaEnMemoria;
let repositorio: RepositorioDeCorreosEnMemoria;
let bandeja: BandejaDeSalidaDeCore;

beforeEach(() => {
  historial = new HistorialEnMemoria([
    correoDePrueba({ id: 'pendiente-1' }),
    correoDePrueba({ id: 'pendiente-2' }),
    correoDePrueba({ id: 'enviado-1', estado: 'enviado' }),
    correoDePrueba({ id: 'de-otro-pago', origen: { recurso: 'cuentas-por-pagar.pagos', registroId: 'pago-2' } }),
  ]);
  auditoria = new AuditoriaEnMemoria();
  repositorio = new RepositorioDeCorreosEnMemoria();
  const unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  bandeja = new BandejaDeSalidaDeCore({
    encolar: new EncolarCorreo({
      repositorio,
      documentos: new DocumentosFalsos(),
      parametros: new ParametrosFijos(),
      tareas: new TareasEnLaTransaccion(),
      despertador: { despertar: () => undefined },
      dominioDeMensajes: 'arrancar.test',
    }),
    cancelarCorreo: new CancelarCorreo({ unidadDeTrabajo, historial, auditoria }),
    historial,
    auditoria,
    unidadDeTrabajo,
  });
});

describe('BandejaDeSalidaDeCore', () => {
  it('lista los correos de un registro', async () => {
    const correos = await bandeja.deRegistro(operador, ORIGEN);

    expect(correos.map((c) => c.id)).toEqual(['pendiente-1', 'pendiente-2', 'enviado-1']);
  });

  it('cancela solo los pendientes del registro y audita cada uno', async () => {
    const cuantos = await bandeja.cancelarPendientesDe(operador, ORIGEN, 'Pago anulado');

    expect(cuantos).toBe(2);
    expect(historial.correos.map((c) => c.estado)).toEqual(['cancelado', 'cancelado', 'enviado', 'pendiente']);
    expect(auditoria.entradas.map((e) => [e.registroId, e.accion, e.motivo])).toEqual([
      ['pendiente-1', 'anular', 'Pago anulado'],
      ['pendiente-2', 'anular', 'Pago anulado'],
    ]);
  });

  it('sin pendientes no hace nada', async () => {
    await bandeja.cancelarPendientesDe(operador, ORIGEN, 'Pago anulado');
    auditoria.entradas.length = 0;

    expect(await bandeja.cancelarPendientesDe(operador, ORIGEN, 'Pago anulado')).toBe(0);
    expect(auditoria.entradas).toHaveLength(0);
  });

  it('cancela un correo del registro y lo devuelve ya cancelado', async () => {
    const correo = await bandeja.cancelar(operador, ORIGEN, { correoId: 'pendiente-1', motivo: 'Error de captura' });

    expect(correo).toMatchObject({ id: 'pendiente-1', estado: 'cancelado', motivoDeCancelacion: 'Error de captura' });
    expect(auditoria.acciones()).toEqual(['core.correos_salientes:anular']);
  });

  it('un correo de otro registro no se cancela desde este', async () => {
    await expect(bandeja.cancelar(operador, ORIGEN, { correoId: 'de-otro-pago', motivo: 'x' })).rejects.toBeInstanceOf(
      RecursoNoEncontrado,
    );
    expect(historial.correos.find((c) => c.id === 'de-otro-pago')?.estado).toBe('pendiente');
  });

  it('un correo que ya salió no se cancela', async () => {
    await expect(bandeja.cancelar(operador, ORIGEN, { correoId: 'enviado-1', motivo: 'x' })).rejects.toBeInstanceOf(
      CorreoNoPendiente,
    );
  });

  it('encolar delega en el caso de uso', async () => {
    const dto = await bandeja.encolar(operador, {
      tipo: 'cuentas-por-pagar.aviso_de_pago',
      origen: ORIGEN,
      empresa: 'Rancho Los Pinos',
      responderA: null,
      destinatarios: [{ direccion: 'a@ejemplo.com', nombre: null, clase: 'para', origen: 'tercero', origenId: null }],
      plantilla: {
        asunto: 'Aviso',
        mensaje: 'Hola',
        marcadoresDelAsunto: [],
        marcadoresDelMensaje: [],
        valores: {},
      },
      adjunto: null,
    });

    expect(dto.id).toBe('correo-1');
  });
});
