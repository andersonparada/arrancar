/** Cambiar el vencimiento de un cargo: su auditoría y el rechazo cuando ya no tiene saldo (PC-1). */
import { beforeAll, describe, expect, it } from 'vitest';
import { DocumentosPorPagarDePrueba, MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { notaConSaldoLibre } from './soporte/cuentas-por-pagar-notas.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import {
  consultar,
  haceDias,
  prepararEscenario,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const RUTA = '/api/cuentas-por-pagar/documentos';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let documentos: DocumentosPorPagarDePrueba;
let completa: ClienteApi;

const propietario = () => escenario.cuenta.propietario;
const idAqui = async (documentoDeCompraId: string) => (await documentos.fila(documentoDeCompraId))!.id;
const auditoriaDe = (accion: string, registroId: string) =>
  consultar<{ motivo: string | null; anterior: Record<string, unknown> }>(
    'select motivo, anterior from core.auditoria where recurso = $1 and accion = $2 and registro_id = $3',
    ['cuentas-por-pagar.documentos', accion, registroId],
  );
const completar = (...ids: string[]) => completa.post(`${RUTA}/registrar`, { documentos: ids.map((id) => ({ id })) });
const completado = async () => {
  const id = await idAqui(await documentos.registrar());
  expect((await completar(id)).estado).toBe(200);
  return id;
};

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpvencimiento', MODULOS_DE_CUENTAS_POR_PAGAR);
  documentos = new DocumentosPorPagarDePrueba(escenario, haceDias(3));
  completa = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Completa',
    apellidos: 'Vencimientos',
    permisos: ['cuentas-por-pagar.documentos.ver', 'cuentas-por-pagar.documentos.registrar'],
  });
});

describe('cambiar el vencimiento', () => {
  it('cambia el de un cargo completado, con su auditoría, y no el de uno pendiente', async () => {
    const pendiente = await idAqui(await documentos.registrar());
    const id = await completado();

    const rechazado = await propietario().patch(`${RUTA}/${pendiente}`, { vencimiento: haceDias(-20) });
    const cambiado = await completa.patch(`${RUTA}/${id}`, { vencimiento: haceDias(-20) });

    expect(rechazado.cuerpo.error.codigo).toBe('vencimiento_no_editable');
    expect(cambiado.estado).toBe(200);
    expect(cambiado.cuerpo.vencimiento).toBe(haceDias(-20));
    const [auditado] = await auditoriaDe('cambiar_vencimiento', id);
    expect(auditado?.anterior).toMatchObject({ id, vencimientoNuevo: haceDias(-20) });
    expect(auditado?.anterior.vencimiento).not.toBe(haceDias(-20));
    expect((await completa.patch(`${RUTA}/${id}`, { vencimiento: haceDias(10) })).cuerpo.error.codigo).toBe(
      'vencimiento_invalido',
    );
  });
});

describe('cambiar el vencimiento de un cargo sin saldo', () => {
  it('rechaza el de un cargo compensado del todo con una nota, no audita y no ofrece la acción', async () => {
    const { facturaPropia } = await notaConSaldoLibre(documentos, {});
    expect((await completar(facturaPropia)).estado).toBe(200);
    const antes = (await propietario().get(`${RUTA}/${facturaPropia}`)).cuerpo;

    const respuesta = await completa.patch(`${RUTA}/${facturaPropia}`, { vencimiento: haceDias(-20) });

    expect(antes).toMatchObject({ saldo: '0.00', puedeCambiarVencimiento: false });
    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('vencimiento_de_cargo_saldado');
    expect(await auditoriaDe('cambiar_vencimiento', facturaPropia)).toEqual([]);
    expect((await propietario().get(`${RUTA}/${facturaPropia}`)).cuerpo.vencimiento).toBe(antes.vencimiento);
  });
});
