/** Un comprobante con una reposición anulada en su historial no sale del fondo ni se borra (CC-4, revisión). */

import { beforeAll, describe, expect, it } from 'vitest';
import { EscenarioDeComprobantes, RUTA_DE_CAJA_CHICA } from './soporte/caja-chica-comprobantes.js';
import { anularReposicion, documentoProcesado, reponerBien } from './soporte/caja-chica-reposiciones.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { RUTA_DOCUMENTOS } from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
let e: EscenarioDeComprobantes;

/** Un fondo con un documento repuesto con cheque y esa reposición anulada. */
async function conReposicionAnulada(nombre: string) {
  const fondo = await e.abrirFondo(nombre, { monto: '3000.00' });
  const { documentoId } = await e.registrarEnElLibro({ referenciaDeDestino: fondo.id });
  const comprobante = (await e.delFondo(fondo.id)).elementos.find((c: any) => c.documentoDeCompraId === documentoId);
  const reposicion = await reponerBien(e, { fondoId: fondo.id, ids: [comprobante.id] });
  const anulada = await anularReposicion(reposicion.id, e.propietario());
  expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);
  return { documentoId, comprobanteId: comprobante.id as string, reposicion };
}

beforeAll(async () => {
  e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicahistorial');
});

describe('un comprobante con una reposición anulada en su historial', () => {
  it('no se devuelve a la bandeja: error propio, no una violación de llave', async () => {
    const { comprobanteId } = await conReposicionAnulada('Caja que devuelve con historial');

    const devuelto = await e
      .propietario()
      .post(`${RUTA_DE_CAJA_CHICA}/comprobantes/${comprobanteId}/devolver-a-la-bandeja`, {
        motivo: 'Otro fondo',
      });

    expect(devuelto.estado).toBe(422);
    expect(devuelto.cuerpo.error.codigo).toBe('comprobante_con_reposicion_anulada');
  });

  it('el libro no lo elimina (se anula) y el historial de la reposición queda intacto', async () => {
    const { documentoId, reposicion } = await conReposicionAnulada('Caja que elimina con historial');

    const eliminado = await e.propietario().delete(`${RUTA_DOCUMENTOS}/${documentoId}`);

    expect(eliminado.estado).toBe(422);
    expect(eliminado.cuerpo.error.codigo).toBe('comprobante_con_reposicion_anulada');
    const lineas = await comoPropietario<{ vigente: boolean }>(
      'select vigente from caja_chica.reposicion_comprobantes where reposicion_id = $1',
      [reposicion.id],
    );
    expect(lineas.map((l) => l.vigente)).toEqual([false]);
    expect(await documentoProcesado(documentoId)).toBe(false);
  });
});
