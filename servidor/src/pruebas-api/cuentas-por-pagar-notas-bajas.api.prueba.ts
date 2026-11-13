import { beforeAll, describe, expect, it } from 'vitest';
import {
  DocumentosPorPagarDePrueba,
  MODULOS_DE_CUENTAS_POR_PAGAR,
  proveedorConCredito,
} from './soporte/cuentas-por-pagar.js';
import {
  anularAjuste,
  notaConSaldoLibre,
  sembrarAjuste,
  sembrarAplicacionManual,
  type NotaConSaldoLibre,
} from './soporte/cuentas-por-pagar-notas.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  haceDias,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const RUTA = '/api/cuentas-por-pagar/documentos';
const entorno = usarEntornoApi();
const NOMBRES = ['Alfa', 'Bravo', 'Cobre', 'Delta', 'Eco', 'Fénix', 'Gama', 'Halcón', 'Índigo', 'Jade', 'Kilo', 'Lima'];
let escenario: EscenarioDeDocumentos;
let documentos: DocumentosPorPagarDePrueba;
let secuencia = 0;

const propietario = () => escenario.cuenta.propietario;
const cuerpoDeAnulacion = { causa: 'error_de_captura', motivo: 'Se registró por error' };
const anularAqui = (id: string) => propietario().post(`${RUTA}/${id}/anular`, cuerpoDeAnulacion);
const anularEnElLibro = (libroId: string) =>
  propietario().post(`${RUTA_DOCUMENTOS}/${libroId}/anular`, cuerpoDeAnulacion);
const eliminarAqui = (id: string) => propietario().delete(`${RUTA}/${id}`);
const eliminarEnElLibro = (libroId: string) => propietario().delete(`${RUTA_DOCUMENTOS}/${libroId}`);
const ficha = async (id: string) => (await propietario().get(`${RUTA}/${id}`)).cuerpo;
const estadoDe = async (id: string) =>
  (await consultar<{ estado: string }>('select estado from cuentas_por_pagar.documentos where id = $1', [id]))[0]
    ?.estado;
const ajustesDe = async (notaPropia: string) =>
  (await consultar('select 1 from cuentas_por_pagar.ajustes_de_saldo where documento_id = $1', [notaPropia])).length;

/** Un proveedor propio con una factura y una nota que deja Q100.00 de saldo libre. */
async function unaNota(): Promise<NotaConSaldoLibre & { proveedorId: string; nitEmisor: string }> {
  const { proveedorId, nitEmisor } = await proveedorConCredito(escenario, {
    nombre: `${NOMBRES[secuencia]} S.A.`,
    nit: String(5500000 + secuencia++),
    diasDeCredito: 30,
  });
  return { proveedorId, nitEmisor, ...(await notaConSaldoLibre(documentos, { proveedorId, nitEmisor })) };
}

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpnotasbajas', MODULOS_DE_CUENTAS_POR_PAGAR);
  documentos = new DocumentosPorPagarDePrueba(escenario, haceDias(3));
});

describe('una nota con ajustes vigentes', () => {
  it('no se anula ni se elimina, ni aquí ni desde Libro de compras, y nada cambia', async () => {
    const { notaId, notaPropia } = await unaNota();
    await sembrarAjuste(escenario, notaPropia, { monto: '30.00' });
    expect(await ficha(notaPropia)).toMatchObject({ puedeAnular: false, puedeEliminar: false });

    const respuestas = [
      await anularAqui(notaPropia),
      await eliminarAqui(notaPropia),
      await anularEnElLibro(notaId),
      await eliminarEnElLibro(notaId),
    ];

    for (const respuesta of respuestas) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('nota_con_ajustes');
    }
    expect(await estadoDe(notaPropia)).toBe('pendiente');
    expect(await ajustesDe(notaPropia)).toBe(1);
    expect((await documentos.aplicacionesDe(notaId)).length).toBe(1);
  });

  it('con el ajuste anulado se anula y el ajuste queda de rastro', async () => {
    const { notaPropia } = await unaNota();
    await anularAjuste(escenario, await sembrarAjuste(escenario, notaPropia, { monto: '30.00' }));

    const respuesta = await anularAqui(notaPropia);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(await estadoDe(notaPropia)).toBe('anulado');
    expect(await ajustesDe(notaPropia)).toBe(1);
  });

  it('con el ajuste anulado se elimina: el ajuste se va con ella y queda en lo auditado', async () => {
    const { notaPropia } = await unaNota();
    await anularAjuste(escenario, await sembrarAjuste(escenario, notaPropia, { monto: '30.00' }));

    const respuesta = await eliminarAqui(notaPropia);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(204);
    expect(await ajustesDe(notaPropia)).toBe(0);
    const [auditado] = await consultar<{ anterior: { ajustes: Array<Record<string, unknown>> } }>(
      `select anterior from core.auditoria where recurso = 'cuentas-por-pagar.documentos' and accion = 'eliminar'
          and registro_id = $1`,
      [notaPropia],
    );
    expect(auditado?.anterior.ajustes).toEqual([
      expect.objectContaining({
        monto: '30.00',
        estado: 'anulado',
        causa: 'no_recuperable',
        motivoDeAnulacion: 'Error',
      }),
    ]);
  });
});

describe.each([
  ['una factura', 'FACT'],
  ['una nota de débito', 'NDEB'],
] as const)('%s que recibió una aplicación manual', (_nombre, tipo) => {
  /** El cargo pendiente del mismo proveedor, con Q40.00 aplicados a mano desde la nota. */
  async function cargoConAplicacion() {
    const nota = await unaNota();
    const cargoId =
      tipo === 'NDEB'
        ? await documentos.registrarNota('NDEB', nota.facturaId, {
            total: '200.00',
            proveedorId: nota.proveedorId,
            nitEmisor: nota.nitEmisor,
          })
        : await documentos.registrar({ proveedorId: nota.proveedorId, nitEmisor: nota.nitEmisor });
    const cargoPropio = (await documentos.fila(cargoId))!.id;
    const aplicacionId = await sembrarAplicacionManual({ notaPropia: nota.notaPropia, cargoPropio, monto: '40.00' });
    const { serie, numero } = await ficha(nota.notaPropia);
    return { ...nota, cargoId, cargoPropio, aplicacionId, etiquetaDeLaNota: `${serie}-${numero}` };
  }

  it('no se anula ni se elimina, aquí ni desde Libro de compras, y el mensaje nombra la nota', async () => {
    const { cargoId, cargoPropio, etiquetaDeLaNota } = await cargoConAplicacion();
    expect(await ficha(cargoPropio)).toMatchObject({ puedeAnular: false, puedeEliminar: false });

    const respuestas = [
      await anularAqui(cargoPropio),
      await eliminarAqui(cargoPropio),
      await anularEnElLibro(cargoId),
      await eliminarEnElLibro(cargoId),
    ];

    for (const respuesta of respuestas) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('cargo_con_aplicaciones_manuales');
      expect(respuesta.cuerpo.error.mensaje).toContain(`quite primero la aplicación de la nota ${etiquetaDeLaNota}`);
    }
    expect(await estadoDe(cargoPropio)).toBe('pendiente');
  });

  it('quitada la aplicación, ya se anula y se elimina', async () => {
    const quitada = await cargoConAplicacion();
    const otra = await cargoConAplicacion();
    await consultar('delete from cuentas_por_pagar.aplicaciones_de_notas where id = any($1)', [
      [quitada.aplicacionId, otra.aplicacionId],
    ]);

    const anulada = await anularAqui(quitada.cargoPropio);
    const eliminada = await eliminarEnElLibro(otra.cargoId);

    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);
    expect(eliminada.estado, JSON.stringify(eliminada.cuerpo)).toBe(200);
    expect(await estadoDe(quitada.cargoPropio)).toBe('anulado');
    expect(await estadoDe(otra.cargoPropio)).toBeUndefined();
  });
});

describe('aplicaciones en la ficha', () => {
  it('traen id, forma, fecha y referencia, y solo las manuales se pueden quitar', async () => {
    const { notaPropia, proveedorId, nitEmisor } = await unaNota();
    const cargoId = await documentos.registrar({ proveedorId, nitEmisor });
    const cargoPropio = (await documentos.fila(cargoId))!.id;
    await sembrarAplicacionManual({ notaPropia, cargoPropio, monto: '40.00', referencia: 'Acuerdo 9' });

    const { aplicaciones } = await ficha(notaPropia);

    expect(aplicaciones).toHaveLength(2);
    expect(aplicaciones).toContainEqual(
      expect.objectContaining({ forma: 'automatica', referencia: null, puedeQuitar: false, monto: '1020.00' }),
    );
    expect(aplicaciones).toContainEqual(
      expect.objectContaining({ forma: 'manual', referencia: 'Acuerdo 9', puedeQuitar: true, monto: '40.00' }),
    );
    for (const aplicacion of aplicaciones) {
      expect(aplicacion).toMatchObject({ id: expect.any(String), fecha: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    }
  });
});
