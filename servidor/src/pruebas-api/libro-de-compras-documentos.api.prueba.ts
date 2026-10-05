import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import '../modulos/core/contratos/libro-de-compras.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  documentoDePrueba,
  instalarDestinoFalso,
  NIT_DEL_PROVEEDOR,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type DestinoFalso,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let ajeno: EscenarioDeDocumentos;
let destino: DestinoFalso;
const eventos: Array<{ documentoId: string; existiaAlPublicar: boolean }> = [];

const registrar = (cambios: Record<string, unknown> = {}, quien = escenario) =>
  quien.cuenta.propietario.post(RUTA_DOCUMENTOS, documentoDePrueba(quien, cambios));

async function nitDelTercero(terceroId: string): Promise<string | null> {
  return (await escenario.cuenta.propietario.get(`/api/terceros/${terceroId}`)).cuerpo.nit;
}

beforeAll(async () => {
  destino = instalarDestinoFalso();
  busEventos.suscribir('libro-de-compras.documento_registrado', async ({ documentoId }) => {
    const filas = await consultar('select id from libro_de_compras.documentos where id = $1', [documentoId]);
    eventos.push({ documentoId, existiaAlPublicar: filas.length === 1 });
  });
  escenario = await prepararEscenario(entorno, 'registrodocumentos');
  ajeno = await prepararEscenario(entorno, 'registroajeno');
});

afterAll(() => vi.restoreAllMocks());

describe('registrar un documento', () => {
  it('guarda el encabezado con la suma de sus líneas, las manda al destino y completa el NIT del proveedor', async () => {
    const respuesta = await registrar({
      lineas: [
        { conceptoId: escenario.conceptoId, total: '1120.00' },
        { conceptoId: escenario.conceptoId, total: '560.00', exento: '60.00' },
      ],
    });

    expect(respuesta.estado).toBe(201);
    const { documento } = respuesta.cuerpo;
    expect(documento.totales).toMatchObject({ total: '1680.00', iva: '173.57', exento: '60.00' });
    const suma = (campo: string) =>
      documento.lineas.reduce((total: number, linea: Record<string, string>) => total + Number(linea[campo]), 0);
    for (const campo of ['total', 'base', 'iva', 'exento', 'idp']) {
      expect(suma(campo).toFixed(2)).toBe(documento.totales[campo]);
    }
    const [guardado] = await consultar<{ total: string; base: string; iva: string; lineas: string }>(
      `select d.total, d.base, d.iva, (select sum(l.iva) from libro_de_compras.lineas_de_documento l where l.documento_id = d.id) as lineas
       from libro_de_compras.documentos d where d.id = $1`,
      [documento.id],
    );
    expect(guardado).toMatchObject({ total: '1680.00', iva: '173.57', lineas: '173.57' });
    expect(destino.recibidos.at(-1)).toMatchObject({
      documentoId: documento.id,
      totalCentavos: 168000,
      retencionesCentavos: 0,
      tieneActivoFijo: false,
    });
    expect(await nitDelTercero(escenario.terceroId)).toBe(NIT_DEL_PROVEEDOR);
  });

  it('la vista previa trae lo mismo que el registro y no guarda nada', async () => {
    const solicitud = documentoDePrueba(escenario, { numero: 'PREVIA-1' });

    const previa = await escenario.cuenta.propietario.post(`${RUTA_DOCUMENTOS}/calcular`, solicitud);
    const guardado = await consultar("select id from libro_de_compras.documentos where numero = 'PREVIA-1'");
    const registrado = await escenario.cuenta.propietario.post(RUTA_DOCUMENTOS, solicitud);

    expect(previa.estado).toBe(200);
    expect(previa.cuerpo.documento.id).toBeNull();
    expect(guardado).toHaveLength(0);
    expect(registrado.cuerpo.documento).toEqual({ ...previa.cuerpo.documento, id: registrado.cuerpo.documento.id });
  });

  it('un documento repetido en la empresa responde con el enlace al ya registrado', async () => {
    const solicitud = documentoDePrueba(escenario);
    const primero = await escenario.cuenta.propietario.post(RUTA_DOCUMENTOS, solicitud);

    const repetido = await escenario.cuenta.propietario.post(RUTA_DOCUMENTOS, solicitud);

    expect(repetido.estado).toBe(409);
    expect(repetido.cuerpo.error.codigo).toBe('documento_repetido');
    expect(repetido.cuerpo.error.detalles).toEqual({ documentoId: primero.cuerpo.documento.id });
  });

  it('el mismo documento en otra cuenta responde con el mensaje genérico, sin decir dónde está', async () => {
    const solicitud = documentoDePrueba(escenario);
    await escenario.cuenta.propietario.post(RUTA_DOCUMENTOS, solicitud);

    const enOtraCuenta = await ajeno.cuenta.propietario.post(RUTA_DOCUMENTOS, {
      ...solicitud,
      proveedorId: ajeno.proveedorId,
      lineas: [{ conceptoId: ajeno.conceptoId, total: '1120.00' }],
    });

    expect(enOtraCuenta.estado).toBe(409);
    expect(enOtraCuenta.cuerpo.error.mensaje).toBe('Ese documento ya está registrado.');
    expect(enOtraCuenta.cuerpo.error.detalles).toBeUndefined();
    const ficha = await ajeno.cuenta.propietario.get(`/api/terceros/${ajeno.terceroId}`);
    expect(ficha.cuerpo.nit).toBeNull();
  });

  it('en otra empresa de la cuenta, el de la FEL se rechaza y el recibo sin FEL (solo único por empresa) se acepta', async () => {
    const recibo = documentoDePrueba(escenario, {
      tipo: 'recibo',
      motivoFueraDelLibro: 'sin_fel',
      nitEmisor: null,
      autorizacionFel: null,
      serie: null,
    });
    const marcado = documentoDePrueba(escenario);
    expect((await escenario.cuenta.propietario.post(RUTA_DOCUMENTOS, recibo)).estado).toBe(201);
    expect((await escenario.cuenta.propietario.post(RUTA_DOCUMENTOS, marcado)).estado).toBe(201);
    const otra = await escenario.cuenta.propietario.post('/api/empresas', { nombre: 'Otra empresa', nit: '22222227' });
    await escenario.cuenta.propietario.put('/api/sesion/empresa-activa', { empresaId: otra.cuerpo.id });
    const concepto = await escenario.cuenta.propietario.post('/api/libro-de-compras/conceptos-de-gasto', {
      nombre: 'Medicinas',
      tipoPorOmision: 'bien',
      esProductoAgropecuario: false,
      esActivoFijo: false,
      activo: true,
    });
    const lineas = [{ conceptoId: concepto.cuerpo.id, total: '1120.00' }];

    const reciboEnOtra = await escenario.cuenta.propietario.post(RUTA_DOCUMENTOS, { ...recibo, lineas });
    const marcadoEnOtra = await escenario.cuenta.propietario.post(RUTA_DOCUMENTOS, { ...marcado, lineas });
    await escenario.cuenta.propietario.put('/api/sesion/empresa-activa', { empresaId: escenario.cuenta.empresaId });

    expect(reciboEnOtra.estado).toBe(201);
    expect(marcadoEnOtra.estado).toBe(409);
    expect(marcadoEnOtra.cuerpo.error.mensaje).toBe('Ese documento ya está registrado.');
  });

  it('si el destino rechaza el documento, no queda nada: ni el documento ni el NIT que se iba a completar', async () => {
    const { terceroId, proveedorId } = await registrarProveedor(escenario.cuenta, 'Proveedor del rechazo');
    const eventosAntes = eventos.length;
    destino.rechazar = true;

    const rechazado = await registrar({ proveedorId, nitEmisor: '11111119', numero: 'RECHAZADO-1' });
    destino.rechazar = false;

    expect(rechazado.estado).toBe(422);
    expect(rechazado.cuerpo.error.codigo).toBe('destino_rechaza');
    expect(await consultar("select id from libro_de_compras.documentos where numero = 'RECHAZADO-1'")).toHaveLength(0);
    expect(await nitDelTercero(terceroId)).toBeNull();
    expect(eventos).toHaveLength(eventosAntes);
  });

  it('el evento se publica solo después de confirmar: el documento ya existe cuando llega', async () => {
    const antes = eventos.length;

    const registrado = await registrar();

    expect(eventos).toHaveLength(antes + 1);
    expect(eventos.at(-1)).toEqual({ documentoId: registrado.cuerpo.documento.id, existiaAlPublicar: true });
  });

  it('un NIT distinto al que ya tiene el proveedor se rechaza', async () => {
    const respuesta = await registrar({ nitEmisor: '12345679' });

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('nit_del_emisor_no_coincide');
  });
});
