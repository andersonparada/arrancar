import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  documentoDePrueba,
  instalarDestinoFalso,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type DestinoFalso,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const RUTA_DESTINOS = '/api/libro-de-compras/destinos';
let escenario: EscenarioDeDocumentos;
let destino: DestinoFalso;
let soloVer: ClienteApi;
let registrador: ClienteApi;
let ajustador: ClienteApi;

const rutaDeDestinoSugerido = (proveedorId: string) =>
  `/api/libro-de-compras/proveedores/${proveedorId}/destino-sugerido`;

/** Una factura de Q5,600.00: a una empresa contribuyente especial le corresponde retener Q90.00 del IVA. */
const conRetencionAjustada = () =>
  documentoDePrueba(escenario, {
    lineas: [{ conceptoId: escenario.conceptoId, total: '5600.00' }],
    ajustesDeRetenciones: [{ regla: 'iva_contribuyente_especial', monto: '0', motivo: 'Exento por resolución' }],
  });

beforeAll(async () => {
  destino = instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'permisosdocumentos');
  await configurarEmpresa(escenario.cuenta, { agenteDeRetencionIva: 'contribuyente_especial' });
  const usuario = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, escenario.cuenta, { nombres, apellidos: 'Permisos', permisos });
  soloVer = await usuario('Solo ver', ['libro-de-compras.documentos.ver']);
  registrador = await usuario('Registrador', ['libro-de-compras.documentos.crear']);
  ajustador = await usuario('Ajustador', ['libro-de-compras.documentos.crear', 'libro-de-compras.retenciones.ajustar']);
});

afterAll(() => vi.restoreAllMocks());

describe('permisos de las rutas de documentos', () => {
  it('sin sesión responde 401 y en una cuenta sin el módulo, 403', async () => {
    const sinSesion = entorno.nuevoCliente();
    const sinModulo = await darDeAltaCuenta(entorno, {
      nombre: 'Sin libro',
      usuario: 'sinlibrodocs',
      modulos: ['terceros'],
    });

    expect((await sinSesion.post(RUTA_DOCUMENTOS, documentoDePrueba(escenario))).estado).toBe(401);
    expect((await sinModulo.propietario.get(RUTA_DESTINOS)).estado).toBe(403);
    expect((await sinModulo.propietario.post(RUTA_DOCUMENTOS, documentoDePrueba(escenario))).estado).toBe(403);
  });

  it('quien solo puede ver documentos no calcula, no registra y no consulta destinos', async () => {
    const solicitud = documentoDePrueba(escenario);

    const respuestas = [
      await soloVer.post(`${RUTA_DOCUMENTOS}/calcular`, solicitud),
      await soloVer.post(RUTA_DOCUMENTOS, solicitud),
      await soloVer.get(RUTA_DESTINOS),
      await soloVer.get(rutaDeDestinoSugerido(escenario.proveedorId)),
    ];

    expect(respuestas.map((respuesta) => respuesta.estado)).toEqual([403, 403, 403, 403]);
    expect(respuestas[1]!.cuerpo.error.codigo).toBe('sin_permiso');
  });

  it('con documentos.crear se calcula, se consultan los destinos y se registra', async () => {
    const solicitud = documentoDePrueba(escenario);

    const calculo = await registrador.post(`${RUTA_DOCUMENTOS}/calcular`, solicitud);
    const destinos = await registrador.get(RUTA_DESTINOS);
    const sugerido = await registrador.get(rutaDeDestinoSugerido(escenario.proveedorId));
    const registro = await registrador.post(RUTA_DOCUMENTOS, solicitud);

    expect([calculo.estado, destinos.estado, sugerido.estado, registro.estado]).toEqual([200, 200, 200, 201]);
  });

  it('cambiar o quitar una retención propuesta exige libro-de-compras.retenciones.ajustar', async () => {
    const sinPermiso = await registrador.post(RUTA_DOCUMENTOS, conRetencionAjustada());
    const conPermiso = await ajustador.post(RUTA_DOCUMENTOS, conRetencionAjustada());

    expect(sinPermiso.estado).toBe(403);
    expect(conPermiso.estado).toBe(201);
    expect(conPermiso.cuerpo.documento.retenciones[0]).toMatchObject({
      regla: 'iva_contribuyente_especial',
      montoPropuesto: '90.00',
      monto: '0.00',
      motivoDelAjuste: 'Exento por resolución',
    });
  });

  it('dejar la retención como se propuso no pide el permiso de ajustarla', async () => {
    const solicitud = documentoDePrueba(escenario, {
      lineas: [{ conceptoId: escenario.conceptoId, total: '5600.00' }],
      ajustesDeRetenciones: [{ regla: 'iva_contribuyente_especial', monto: '90.00' }],
    });

    const registro = await registrador.post(RUTA_DOCUMENTOS, solicitud);

    expect(registro.estado).toBe(201);
    expect(registro.cuerpo.documento.retenciones[0]).toMatchObject({ monto: '90.00', motivoDelAjuste: null });
  });
});

describe('destinos de los documentos', () => {
  it('sin ningún destino instalado la lista está vacía y registrar responde con un error claro', async () => {
    destino.instalado = false;

    const destinos = await escenario.cuenta.propietario.get(RUTA_DESTINOS);
    const registro = await escenario.cuenta.propietario.post(RUTA_DOCUMENTOS, documentoDePrueba(escenario));
    destino.instalado = true;

    expect(destinos.cuerpo).toEqual([]);
    expect(registro.estado).toBe(422);
    expect(registro.cuerpo.error.codigo).toBe('destino_no_disponible');
    expect(registro.cuerpo.error.mensaje).toContain('cuentas-por-pagar');
  });

  it('con Cuentas por pagar activo aparece, y un destino que no está instalado se rechaza', async () => {
    const destinos = await escenario.cuenta.propietario.get(RUTA_DESTINOS);
    const aOtroDestino = await escenario.cuenta.propietario.post(
      RUTA_DOCUMENTOS,
      documentoDePrueba(escenario, { destino: 'caja-chica' }),
    );

    expect(destinos.cuerpo).toEqual([{ clave: 'cuentas-por-pagar' }]);
    expect(aOtroDestino.cuerpo.error.codigo).toBe('destino_no_disponible');
  });

  it('el destino sugerido es el del último documento del proveedor, y sin documentos es nulo', async () => {
    const nuevo = await escenario.cuenta.propietario.post('/api/terceros', {
      tipo: 'juridica',
      razonSocial: 'Sin documentos',
      papel: { tipo: 'proveedor' },
    });
    const ficha = await escenario.cuenta.propietario.get(`/api/terceros/${nuevo.cuerpo.id}`);

    const sinHistoria = await escenario.cuenta.propietario.get(rutaDeDestinoSugerido(ficha.cuerpo.proveedor.id));
    const conHistoria = await escenario.cuenta.propietario.get(rutaDeDestinoSugerido(escenario.proveedorId));
    const ajeno = await escenario.cuenta.propietario.get(rutaDeDestinoSugerido(crypto.randomUUID()));

    expect(sinHistoria.cuerpo).toEqual({ destino: null });
    expect(conHistoria.cuerpo).toEqual({ destino: 'cuentas-por-pagar' });
    expect(ajeno.estado).toBe(404);
  });
});
