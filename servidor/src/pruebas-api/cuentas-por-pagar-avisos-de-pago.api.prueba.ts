/**
 * El aviso de pago por correo (pasos 9 y 10 del diseño), primera parte: ver lo que se puede enviar (destinatarios
 * registrados con su marca, copia a la empresa, vista previa) y enviarlo (destinatarios, PDF, anulados, cupos).
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { sembrarCorreo } from './soporte/correos-de-prueba.js';
import { anularPago } from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { AvisosDePrueba, RUTA_DE_PAGOS as RUTA } from './soporte/cuentas-por-pagar-avisos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const entorno = usarEntornoApi();
let a: AvisosDePrueba;

beforeAll(async () => {
  a = await AvisosDePrueba.preparar(entorno, 'cxpavisos');
});

describe('ver el aviso de un pago', () => {
  it('ofrece los contactos con correo, preselecciona los marcados y propone la copia a la empresa', async () => {
    const { pagoId, numero, contactos } = await a.pagoConProveedor({
      principal: 'ventas@proveedor.com',
      contactos: [
        { nombre: 'Ana', correo: 'ana@proveedor.com', recibeAvisosDePago: true },
        { nombre: 'Beto', correo: 'beto@proveedor.com' },
        { nombre: 'Sin correo' },
      ],
    });

    const respuesta = await a.aviso(pagoId);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    const { posibles } = respuesta.cuerpo;
    expect(posibles.map((p: { nombre: string; preseleccionado: boolean }) => [p.nombre, p.preseleccionado])).toEqual([
      ['Ana', true],
      ['Beto', false],
      [expect.stringContaining('S.A.'), false],
    ]);
    expect(posibles[0]).toMatchObject({ origen: 'contacto', origenId: contactos[0], direccion: 'ana@proveedor.com' });
    expect(respuesta.cuerpo).toMatchObject({
      envio: 'manual',
      copiaALaEmpresa: 'pagos@rancho.com',
      copiaPorOmision: true,
      sePuedeEnviar: true,
      motivoSinAviso: null,
      enviados: [],
    });
    expect(respuesta.cuerpo.vistaPrevia.asunto).toBe(`Aviso de pago ${numero} – Rancho fiscal`);
    expect(respuesta.cuerpo.vistaPrevia.mensaje).toContain('por Q1,120.00, con cheque');
    expect(respuesta.cuerpo.vistaPrevia.adjuntoNombre).toBe(`comprobante-de-pago-${numero}.pdf`);
  });

  it('sin contactos marcados, el correo principal del proveedor va preseleccionado', async () => {
    const { pagoId } = await a.pagoConProveedor({ principal: 'ventas@proveedor.com' });

    const { posibles } = (await a.aviso(pagoId)).cuerpo;

    expect(posibles).toHaveLength(1);
    expect(posibles[0]).toMatchObject({ origen: 'tercero', direccion: 'ventas@proveedor.com', preseleccionado: true });
  });

  it('un correo que no sirve para enviar sale marcado y sin preseleccionar', async () => {
    const { pagoId } = await a.pagoConProveedor({
      contactos: [
        { nombre: 'Rara', correo: 'ok@proveedor.com', inservible: 'dó@proveedor.com' },
        { nombre: 'Buena', correo: 'buena@proveedor.com' },
      ],
    });

    const { posibles } = (await a.aviso(pagoId)).cuerpo;

    expect(posibles.find((p: { nombre: string }) => p.nombre === 'Rara')).toMatchObject({
      utilizable: false,
      preseleccionado: false,
      motivo: expect.stringContaining('no se puede usar'),
    });
  });

  it('un proveedor sin ningún correo no admite aviso, y lo dice', async () => {
    const { pagoId } = await a.pagoConProveedor();

    const { cuerpo } = await a.aviso(pagoId);

    expect(cuerpo).toMatchObject({
      sePuedeEnviar: false,
      motivoSinAviso: expect.stringContaining('no tiene un correo'),
    });
    const intento = await a.enviar(pagoId, {
      destinatarios: [{ origen: 'tercero', origenId: crypto.randomUUID() }],
      copiaALaEmpresa: false,
    });
    expect(intento.estado).toBe(409);
  });

  it('quien solo tiene pagos.ver lo ve pero no lo envía', async () => {
    const { pagoId, contactos } = await a.pagoConProveedor({
      contactos: [{ nombre: 'Ana', correo: 'ana@proveedor.com' }],
    });

    expect((await a.aviso(pagoId, a.soloVer)).estado).toBe(200);
    const envio = await a.enviar(
      pagoId,
      { destinatarios: [{ origen: 'contacto', origenId: contactos[0]! }], copiaALaEmpresa: false },
      a.soloVer,
    );
    expect(envio.estado).toBe(403);
    expect((await entorno.nuevoCliente().get(`${RUTA}/${pagoId}/aviso`)).estado).toBe(401);
  });
});

describe('enviar el aviso', () => {
  it('encola un correo con los destinatarios, la copia a la empresa, el PDF y «Responder a»', async () => {
    const { pagoId, numero, contactos } = await a.pagoConProveedor({
      contactos: [{ nombre: 'Ana', correo: 'ana@proveedor.com', recibeAvisosDePago: true }],
    });

    const respuesta = await a.enviar(pagoId, {
      destinatarios: [{ origen: 'contacto', origenId: contactos[0]! }],
      copiaALaEmpresa: true,
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      estado: 'pendiente',
      adjuntoNombre: `comprobante-de-pago-${numero}.pdf`,
      origen: { recurso: 'cuentas-por-pagar.pagos', registroId: pagoId },
    });
    const [correo] = await a.correosDe(pagoId);
    expect(correo).toMatchObject({
      asunto: `Aviso de pago ${numero} – Rancho fiscal`,
      responder_a: 'pagos@rancho.com',
    });
    expect(correo!.cuerpo_texto).toContain('Estimado(a)');
    expect(correo!.cuerpo_texto).toContain('Este correo no es un documento tributario.');
    expect(await a.destinatariosDe(correo!.id)).toEqual([
      { direccion: 'ana@proveedor.com', clase: 'para', origen: 'contacto' },
      { direccion: 'pagos@rancho.com', clase: 'copia', origen: 'empresa' },
    ]);
    const [archivo] = await comoPropietario<{ recurso_dueno: string }>(
      'select recurso_dueno from core.archivos where id = $1',
      [correo!.adjunto_archivo_id],
    );
    expect(archivo?.recurso_dueno).toBe('core.correos_salientes');
  });

  it('sin copia a la empresa, solo va al proveedor; reenviar crea otro correo', async () => {
    const { pagoId, contactos } = await a.pagoConProveedor({
      contactos: [{ nombre: 'Ana', correo: 'ana@proveedor.com' }],
    });
    const cuerpo = { destinatarios: [{ origen: 'contacto', origenId: contactos[0]! }], copiaALaEmpresa: false };

    await a.enviar(pagoId, cuerpo);
    await a.enviar(pagoId, cuerpo);

    const correos = await a.correosDe(pagoId);
    expect(correos).toHaveLength(2);
    expect(await a.destinatariosDe(correos[0]!.id)).toEqual([
      { direccion: 'ana@proveedor.com', clase: 'para', origen: 'contacto' },
    ]);
    expect((await a.aviso(pagoId)).cuerpo.enviados).toHaveLength(2);
  });

  it('un destinatario que no es del proveedor del pago (o de otra cuenta) no se encuentra', async () => {
    const { pagoId } = await a.pagoConProveedor({ contactos: [{ nombre: 'Ana', correo: 'ana@proveedor.com' }] });
    const otro = await a.pagoConProveedor({ contactos: [{ nombre: 'Otra', correo: 'otra@proveedor.com' }] });

    const delOtro = await a.enviar(pagoId, {
      destinatarios: [{ origen: 'contacto', origenId: otro.contactos[0]! }],
      copiaALaEmpresa: false,
    });
    const inventado = await a.enviar(pagoId, {
      destinatarios: [{ origen: 'contacto', origenId: crypto.randomUUID() }],
      copiaALaEmpresa: false,
    });

    expect(delOtro.estado).toBe(404);
    expect(inventado.estado).toBe(404);
    expect(await a.correosDe(pagoId)).toHaveLength(0);
  });

  it('exige destinatarios, no más de 10, y nunca direcciones escritas', async () => {
    const { pagoId } = await a.pagoConProveedor({ principal: 'ventas@proveedor.com' });

    const vacio = await a.enviar(pagoId, { destinatarios: [], copiaALaEmpresa: false });
    const escrita = await a.enviar(pagoId, { destinatarios: [{ direccion: 'a@b.com' }], copiaALaEmpresa: false });

    expect(vacio.estado).toBe(400);
    expect(escrita.estado).toBe(400);
  });

  it('un destinatario con correo inservible se rechaza', async () => {
    const { pagoId, contactos } = await a.pagoConProveedor({
      contactos: [
        { nombre: 'Rara', correo: 'ok@proveedor.com', inservible: 'dó@proveedor.com' },
        { nombre: 'Buena', correo: 'buena@proveedor.com' },
      ],
    });

    const respuesta = await a.enviar(pagoId, {
      destinatarios: [{ origen: 'contacto', origenId: contactos[0]! }],
      copiaALaEmpresa: false,
    });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('direccion_no_utilizable');
  });

  it('un pago anulado no admite aviso', async () => {
    const { pagoId, contactos } = await a.pagoConProveedor({
      contactos: [{ nombre: 'Ana', correo: 'ana@proveedor.com' }],
    });
    expect((await anularPago(a.e.propietario(), pagoId)).estado).toBe(200);

    const vista = await a.aviso(pagoId);
    const envio = await a.enviar(pagoId, {
      destinatarios: [{ origen: 'contacto', origenId: contactos[0]! }],
      copiaALaEmpresa: false,
    });

    expect(vista.cuerpo).toMatchObject({ sePuedeEnviar: false, motivoSinAviso: 'El pago está anulado.' });
    expect(envio.estado).toBe(409);
    expect(envio.cuerpo.error.codigo).toBe('aviso_no_disponible');
  });

  it('respeta el cupo por destinatario del día', async () => {
    const { pagoId, contactos } = await a.pagoConProveedor({
      contactos: [{ nombre: 'Ana', correo: 'cupo@proveedor.com' }],
    });
    const { cuentaId, empresaId } = a.e.mundo.escenario.cuenta;
    for (let i = 0; i < 20; i++) await sembrarCorreo({ cuentaId, empresaId, direccion: 'cupo@proveedor.com' });

    const respuesta = await a.enviar(pagoId, {
      destinatarios: [{ origen: 'contacto', origenId: contactos[0]! }],
      copiaALaEmpresa: false,
    });

    expect(respuesta.estado).toBe(429);
    expect(respuesta.cuerpo.error.codigo).toBe('cupo_de_correos_agotado');
    expect(await a.correosDe(pagoId)).toHaveLength(0);
  });
});
