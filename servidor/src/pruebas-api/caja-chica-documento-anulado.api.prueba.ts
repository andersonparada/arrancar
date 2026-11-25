/**
 * Un documento que su emisor anuló en la SAT después de gastar (dictamen del 2026-11-24): en un fondo abierto queda «por
 * resolver» sin tocar el efectivo, no es deducible en los reportes, bloquea el cierre del fondo salvo con el permiso de
 * excepción, y el tope mayor que el fondo se acepta con aviso.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { AyudasDeDocumentoAnulado, filaDel } from './soporte/caja-chica-documento-anulado.js';
import { comprobanteEnBase, EscenarioDeComprobantes, RUTA_DE_CAJA_CHICA } from './soporte/caja-chica-comprobantes.js';
import { RUTA_DE_FONDOS } from './soporte/caja-chica-fondos.js';
import { reponerBien } from './soporte/caja-chica-reposiciones.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { HOY } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeComprobantes;
let a: AyudasDeDocumentoAnulado;
let cierraSinExcepcion: ClienteApi;
let cierraConExcepcion: ClienteApi;

const PERMISOS_DE_CIERRE = ['caja-chica.fondos.ver', 'caja-chica.fondos.ver-todos', 'caja-chica.fondos.cerrar'];
const PERIODO = `desde=${HOY.slice(0, 7)}-01&hasta=${HOY}`;

beforeAll(async () => {
  e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicadocanulado');
  a = new AyudasDeDocumentoAnulado(e);
  const cuenta = e.caja.cuenta;
  cierraSinExcepcion = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Cierra',
    apellidos: 'Simple',
    permisos: PERMISOS_DE_CIERRE,
  });
  cierraConExcepcion = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Excepciona',
    apellidos: 'Cierre',
    permisos: [...PERMISOS_DE_CIERRE, 'caja-chica.fondos.cerrar-con-documentos-por-resolver'],
  });
});

describe('la FEL se anula con la factura en un fondo abierto, sin reponer', () => {
  it('queda por resolver: sigue vigente, el efectivo esperado no sube, la ficha avisa y la auditoría dice `corregir`', async () => {
    const { fondo, documentoId, comprobanteId } = await a.fondoConFactura('Caja con la FEL anulada sin reponer');
    const antes = await a.ficha(fondo.id);

    const respuesta = await a.anularLaFel(documentoId);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    const despues = await a.ficha(fondo.id);
    // Antes se anulaba el comprobante y el efectivo esperado subía Q300.00: el siguiente arqueo daba un faltante falso.
    expect(despues).toMatchObject({ efectivoEsperado: antes.efectivoEsperado, pendienteDeReponer: '300.00' });
    expect(despues.documentosPorResolver).toBe(1);
    expect(despues.avisos.join(' ')).toMatch(/1 documento\(s\) anulado\(s\) por su emisor sin resolver/);
    expect(await comprobanteEnBase(comprobanteId)).toMatchObject({
      estado: 'vigente',
      motivo_documento_anulado: 'El emisor anuló la FEL en la SAT',
    });
    const lista = (await e.delFondo(fondo.id)).elementos;
    expect(lista.find((c: any) => c.id === comprobanteId).seguimiento).toMatchObject({ situacion: 'por_resolver' });
    const auditoria = await a.auditoriaDelComprobante(comprobanteId);
    expect(auditoria.map(({ accion: a }) => a)).toEqual(['corregir']);
  });

  it('los reportes lo tratan como no deducible: CC-R1 y CC-R2 lo cuentan como no deducible y CC-R3 lo trae con su motivo', async () => {
    const { fondo, comprobanteId } = await a.conFelAnulada('Caja con la FEL anulada en los reportes');

    const pendientes = filaDel(await a.verReporte(`pendientes-de-reponer?fondoId=${fondo.id}`), fondo.id);
    expect(pendientes).toMatchObject({ deducible: '0.00', noDeducible: '300.00' });
    const sinDocumento = filaDel(await a.verReporte(`sin-documento-fiscal?${PERIODO}&fondoId=${fondo.id}`), fondo.id);
    expect(sinDocumento.filas).toHaveLength(1);
    expect(sinDocumento.filas[0]).toMatchObject({ id: comprobanteId, deducible: false });
    expect(sinDocumento.filas[0].motivo).toMatch(/anulada por su emisor/);
    await reponerBien(e, { fondoId: fondo.id, ids: [comprobanteId] });
    const repuestos = filaDel(await a.verReporte(`reposiciones?${PERIODO}&fondoId=${fondo.id}`), fondo.id);
    expect(repuestos.conceptos[0]).toMatchObject({ deducible: '0.00', noDeducible: '300.00' });
  });

  it('un documento que sigue en la bandeja se anula como siempre, sin dejarlo por resolver', async () => {
    const { documentoId } = await e.registrarEnElLibro({ total: '300.00' });
    const enLaBandeja = await e.enLaBandeja(documentoId);

    const respuesta = await a.anularLaFel(documentoId);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(await comprobanteEnBase(enLaBandeja.id)).toMatchObject({
      estado: 'anulado',
      motivo_documento_anulado: null,
    });
  });

  it('no vuelve a la bandeja: hay que resolverlo', async () => {
    const { comprobanteId } = await a.conFelAnulada('Caja que no devuelve la FEL anulada');

    const respuesta = await e
      .propietario()
      .post(`${RUTA_DE_CAJA_CHICA}/comprobantes/${comprobanteId}/devolver-a-la-bandeja`, { motivo: 'Probar' });

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('situacion_del_documento_no_permite');
  });
});

describe('cerrar el fondo con un documento anulado sin resolver', () => {
  const cerrar = (fondoId: string, cliente: ClienteApi) =>
    cliente.post(`${RUTA_DE_FONDOS}/${fondoId}/cerrar`, { motivo: 'Ya no se necesita' });

  it('se rechaza sin el permiso de excepción y se deja cerrar con él, con la constancia en la auditoría', async () => {
    const { fondo } = await a.conFelAnulada('Caja que cierra con la FEL anulada y excepción');

    const rechazado = await cerrar(fondo.id, cierraSinExcepcion);
    const cerrado = await cerrar(fondo.id, cierraConExcepcion);

    expect(rechazado.estado).toBe(422);
    expect(rechazado.cuerpo.error.codigo).toBe('fondo_con_documentos_por_resolver');
    expect(cerrado.estado, JSON.stringify(cerrado.cuerpo)).toBe(200);
    const [cierre] = await comoPropietario<{ motivo: string }>(
      `select motivo from core.auditoria where recurso = 'caja-chica.fondos' and registro_id = $1 and accion = 'cerrar'`,
      [fondo.id],
    );
    expect(cierre!.motivo).toMatch(/Cerrado con 1 documento\(s\) anulado\(s\) por su emisor sin resolver/);
  });

  it('resuelto el documento, cierra sin la excepción', async () => {
    const { fondo, comprobanteId } = await a.conFelAnulada('Caja que cierra con la FEL resuelta');
    expect(
      (await a.accion(comprobanteId, 'resolver', { salida: 'sin_recuperacion', motivo: 'Se pierde' })).estado,
    ).toBe(200);

    const cerrado = await cerrar(fondo.id, cierraSinExcepcion);

    expect(cerrado.estado, JSON.stringify(cerrado.cuerpo)).toBe(200);
  });
});

describe('el tope por comprobante mayor que el fondo', () => {
  it('se acepta con el aviso «el tope es mayor que el fondo y no tendrá efecto»; sin tope mayor, sin aviso', async () => {
    const mayor = await e.abrirFondo('Caja con tope mayor que el fondo', {
      monto: '1000.00',
      topePorComprobante: '2000.00',
    });
    const igual = await e.abrirFondo('Caja con tope igual al fondo', {
      monto: '1000.00',
      topePorComprobante: '1000.00',
    });

    expect(mayor.avisos).toContain('El tope es mayor que el fondo y no tendrá efecto.');
    expect(igual.avisos).not.toContain('El tope es mayor que el fondo y no tendrá efecto.');
    expect((await a.ficha(mayor.id)).avisos).toContain('El tope es mayor que el fondo y no tendrá efecto.');
    const editado = await e.propietario().patch(`${RUTA_DE_FONDOS}/${mayor.id}`, { topePorComprobante: '900.00' });
    expect(editado.estado, JSON.stringify(editado.cuerpo)).toBe(200);
    expect(editado.cuerpo.avisos).not.toContain('El tope es mayor que el fondo y no tendrá efecto.');
  });
});
