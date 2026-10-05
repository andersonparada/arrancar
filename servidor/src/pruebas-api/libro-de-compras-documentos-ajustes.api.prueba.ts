import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  consultar,
  documentoDePrueba,
  instalarDestinoFalso,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let soloCrear: ClienteApi;
let contador = 0;
const NOMBRES = [
  'Veterinaria El Quiroa',
  'Transportes Pérez',
  'Gasolinera Shell',
  'Ferretería Bonanza',
  'Molino San Jorge',
  'Taller Mecánico Lucero',
  'Papelería Ideal',
  'Clínica Dental Sonrisa',
  'Cooperativa Ixcán',
  'Distribuidora Nova',
  'Hotel Mirador',
  'Imprenta Tipografía Moderna',
];

const propietario = () => escenario.cuenta.propietario;
const opcional = { regimenIsr: 'opcional_simplificado', esAgenteDeRetencionIva: false };

/** Un proveedor nuevo sin datos fiscales guardados, con su NIT propio. */
async function proveedorNuevo(extra: Record<string, unknown> = {}) {
  contador += 1;
  const { proveedorId } = await registrarProveedor(escenario.cuenta, NOMBRES[contador]!, extra);
  return { proveedorId, nitEmisor: nitValido(String(2000000 + contador)) };
}

const cuerpoDe = (proveedor: { proveedorId: string; nitEmisor: string }, cambios: Record<string, unknown> = {}) =>
  documentoDePrueba(escenario, {
    ...proveedor,
    lineas: [{ conceptoId: escenario.conceptoId, total: '5600.00' }],
    ...cambios,
  });
const registrar = (cuerpo: Record<string, unknown>, quien: ClienteApi = propietario()) =>
  quien.post(RUTA_DOCUMENTOS, cuerpo);
const filas = (tabla: string, proveedorId: string) =>
  consultar(`select * from libro_de_compras.${tabla} where proveedor_id = $1`, [proveedorId]);

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'ajustesdocumentos');
  await configurarEmpresa(escenario.cuenta, { esAgenteDeRetencionIsr: true });
  soloCrear = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Solo crear',
    apellidos: 'Ajustes',
    permisos: ['libro-de-compras.documentos.crear'],
  });
});

afterAll(() => vi.restoreAllMocks());

describe('proveedor sin datos fiscales guardados (opción C)', () => {
  it('calcular y registrar piden los datos con sus preguntas, y no dejan nada', async () => {
    const proveedor = await proveedorNuevo();
    const cuerpo = cuerpoDe(proveedor, { datosFiscalesDelProveedor: null });

    const calculo = await propietario().post(`${RUTA_DOCUMENTOS}/calcular`, cuerpo);
    const registro = await registrar(cuerpo);

    for (const respuesta of [calculo, registro]) {
      expect(respuesta.estado).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('faltan_datos_fiscales_del_proveedor');
      expect(respuesta.cuerpo.error.detalles).toMatchObject({
        campo: 'datosFiscalesDelProveedor',
        preguntas: [{ campo: 'regimenIsr' }, { campo: 'esAgenteDeRetencionIva' }],
      });
    }
    expect(await filas('documentos', proveedor.proveedorId)).toHaveLength(0);
  });

  it('con las respuestas, calcular las usa sin guardarlas y registrar las guarda con auditoría', async () => {
    const proveedor = await proveedorNuevo();
    const cuerpo = cuerpoDe(proveedor, { datosFiscalesDelProveedor: opcional });

    const calculo = await propietario().post(`${RUTA_DOCUMENTOS}/calcular`, cuerpo);
    const guardadosAntes = await filas('datos_fiscales_de_proveedor', proveedor.proveedorId);
    const registro = await registrar(cuerpo);

    expect(calculo.cuerpo.documento.retenciones).toEqual([
      expect.objectContaining({ regla: 'isr_opcional_simplificado' }),
    ]);
    expect(guardadosAntes).toHaveLength(0);
    expect(registro.estado).toBe(201);
    expect(await filas('datos_fiscales_de_proveedor', proveedor.proveedorId)).toEqual([
      expect.objectContaining({ regimen_isr: 'opcional_simplificado', se_le_retiene_isr: true }),
    ]);
    const auditadas = await consultar(
      "select accion from core.auditoria where recurso = 'libro-de-compras.datos-fiscales-de-proveedor' and registro_id = $1",
      [proveedor.proveedorId],
    );
    expect(auditadas).toEqual([{ accion: 'corregir' }]);
  });

  it('un régimen fuera del catálogo se rechaza', async () => {
    const proveedor = await proveedorNuevo();
    const datos = { regimenIsr: 'inventado', esAgenteDeRetencionIva: false };

    expect((await registrar(cuerpoDe(proveedor, { datosFiscalesDelProveedor: datos }))).estado).toBe(400);
  });

  it('la factura de pequeño contribuyente deduce su régimen y recibos fuera del libro no preguntan nada', async () => {
    const pequeno = await proveedorNuevo();
    const informal = await proveedorNuevo();

    const factura = await registrar(
      cuerpoDe(pequeno, { tipo: 'factura_pequeno_contribuyente', datosFiscalesDelProveedor: null }),
    );
    const recibo = await registrar(
      cuerpoDe(informal, {
        tipo: 'recibo',
        motivoFueraDelLibro: 'sin_fel',
        nitEmisor: null,
        serie: null,
        autorizacionFel: null,
        datosFiscalesDelProveedor: null,
      }),
    );

    expect(factura.estado).toBe(201);
    expect(await filas('datos_fiscales_de_proveedor', pequeno.proveedorId)).toEqual([
      expect.objectContaining({ es_pequeno_contribuyente: true, regimen_isr: null }),
    ]);
    expect(recibo.estado).toBe(201);
    expect(recibo.cuerpo.documento.nitReceptor).toBeNull();
    expect(await filas('datos_fiscales_de_proveedor', informal.proveedorId)).toHaveLength(0);
  });
});

describe('cambio de régimen del proveedor', () => {
  it('el error sigue, con la confirmación pasa con aviso y queda en la auditoría', async () => {
    const seccion = { secciones: { 'libro-de-compras': { esPequenoContribuyente: true } } };
    const proveedor = await proveedorNuevo(seccion);
    const cuerpo = cuerpoDe(proveedor, { datosFiscalesDelProveedor: null });

    const rechazado = await registrar(cuerpo);
    const confirmado = await registrar({ ...cuerpo, confirmarCambioDeRegimen: true });

    expect(rechazado.cuerpo.error.codigo).toBe('tipo_no_corresponde_al_proveedor');
    expect(rechazado.cuerpo.error.mensaje).toContain('actualice sus datos fiscales o confirme');
    expect(confirmado.estado).toBe(201);
    expect(confirmado.cuerpo.avisos).toContain(
      'El proveedor cambió de régimen: confirme que la factura es anterior al cambio.',
    );
    const auditadas = await consultar<{ motivo: string }>(
      "select motivo from core.auditoria where recurso = 'libro-de-compras.documentos' and accion = 'corregir' and registro_id = $1",
      [confirmado.cuerpo.documento.id],
    );
    expect(auditadas[0]?.motivo).toContain('cambió de régimen');
  });
});

describe('receptor de la FEL', () => {
  const fel = (cambios: Record<string, unknown>) => ({
    nitEmisor: null,
    motivoFueraDelLibro: 'fel_a_otro_nit',
    datosFiscalesDelProveedor: null,
    ...cambios,
  });

  it('una FEL a otra persona acepta su CUI y la que es a un NIT inválido se rechaza', async () => {
    const proveedor = await proveedorNuevo();

    const conCui = await registrar(cuerpoDe(proveedor, fel({ nitReceptor: '1234 56789 0101' })));
    const invalido = await registrar(cuerpoDe(proveedor, fel({ nitReceptor: '5769370', numero: 'X' })));

    expect(conCui.estado).toBe(201);
    expect(conCui.cuerpo.documento.nitReceptor).toBe('1234567890101');
    expect(invalido.cuerpo.error.codigo).toBe('receptor_invalido');
  });

  it('una FEL a consumidor final de Q2,500.00 o más avisa', async () => {
    const proveedor = await proveedorNuevo();
    const cuerpo = cuerpoDe(proveedor, fel({ motivoFueraDelLibro: 'fel_a_consumidor_final', nitReceptor: 'CF' }));

    const respuesta = await registrar(cuerpo);

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('consumidor final es de Q2,500.00 o más');
  });
});

describe('retención ya practicada en un documento anulado', () => {
  it('la nueva propone en cero, avisa lo retenido, audita, y no exige el permiso de ajustar', async () => {
    await configurarEmpresa(escenario.cuenta, { agenteDeRetencionIva: 'contribuyente_especial' });
    const proveedor = await proveedorNuevo();
    const original = cuerpoDe(proveedor, { serie: 'R', numero: '77' });
    const primera = await registrar(original);
    await propietario().post(`${RUTA_DOCUMENTOS}/${primera.cuerpo.documento.id}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Se registró mal',
    });

    const segunda = await registrar(original, soloCrear);

    expect(primera.cuerpo.documento.retenciones[0]).toMatchObject({ monto: '90.00' });
    expect(segunda.estado).toBe(201);
    expect(segunda.cuerpo.documento.retenciones[0]).toMatchObject({
      montoPropuesto: '0.00',
      monto: '0.00',
      motivoDelAjuste: 'Practicada en el documento anulado R-77',
    });
    expect(segunda.cuerpo.avisos.join(' ')).toContain('ya se retuvo IVA Q90.00');
    const auditadas = await consultar<{ motivo: string }>(
      "select motivo from core.auditoria where recurso = 'libro-de-compras.retenciones' and registro_id = $1",
      [segunda.cuerpo.documento.id],
    );
    expect(auditadas).toEqual([{ motivo: 'Practicada en el documento anulado R-77' }]);
  });

  it('también por el mismo NIT, tipo, serie y número aunque la autorización FEL sea otra', async () => {
    const proveedor = await proveedorNuevo();
    const original = cuerpoDe(proveedor, { serie: 'S', numero: '5' });
    const primera = await registrar(original);
    await propietario().post(`${RUTA_DOCUMENTOS}/${primera.cuerpo.documento.id}/anular`, {
      causa: 'fel_anulada_por_el_emisor',
      motivo: 'El emisor la anuló',
    });

    const segunda = await registrar({ ...original, autorizacionFel: crypto.randomUUID() });

    expect(segunda.cuerpo.documento.retenciones[0]).toMatchObject({ monto: '0.00' });
  });
});
