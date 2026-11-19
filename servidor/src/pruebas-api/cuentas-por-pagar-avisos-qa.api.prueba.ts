/**
 * Hallazgos de la QA de punta a punta del aviso de pago (2026-11-18): lo que hoy no cumple lo esperado se deja
 * con `it.fails` para que la prueba avise cuando se corrija.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { AvisosDePrueba } from './soporte/cuentas-por-pagar-avisos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const entorno = usarEntornoApi();
let a: AvisosDePrueba;

beforeAll(async () => {
  a = await AvisosDePrueba.preparar(entorno, 'cxpavisosqa');
});

describe('aviso de pago, hallazgos de la QA', () => {
  it('sin adjuntar el comprobante, el mensaje no dice que se adjunta', async () => {
    const { pagoId } = await a.pagoConProveedor({ principal: 'ventas@proveedor.com' });
    const clave = 'cuentas-por-pagar.avisos_de_pago.adjuntar_comprobante';
    const puesto = await entorno.soporte.put(`/api/configuracion/${clave}`, { nivel: 'empresa', valor: false });
    expect(puesto.estado).toBe(204);

    const { cuerpo } = await a.aviso(pagoId);

    expect(cuerpo.vistaPrevia.adjuntoNombre).toBeNull();
    expect(cuerpo.vistaPrevia.mensaje).not.toContain('Adjuntamos');
  });

  it('un segundo aviso con otro pendiente se encola (cada envío es una fila nueva) y ambos quedan en la ficha', async () => {
    const { pagoId, terceroId } = await a.pagoConProveedor({ principal: 'dos@proveedor.com' });
    const cuerpo = { destinatarios: [{ origen: 'tercero', origenId: terceroId }], copiaALaEmpresa: false };

    expect((await a.enviar(pagoId, cuerpo)).estado).toBe(201);
    expect((await a.enviar(pagoId, cuerpo)).estado).toBe(201);

    expect((await a.correosDe(pagoId)).map((c) => c.estado)).toEqual(['pendiente', 'pendiente']);
  });
});
