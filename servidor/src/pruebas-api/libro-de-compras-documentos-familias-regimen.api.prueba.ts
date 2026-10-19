import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  documentoDePrueba,
  haceDias,
  HOY,
  instalarDestinoFalso,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
const SECCION = 'libro-de-compras';
const ANTES_DE_LA_DEROGACION = '2025-06-15';
let escenario: EscenarioDeDocumentos;
let contador = 0;
const NOMBRES = [
  'Finca La Esperanza',
  'Granja Los Alamos',
  'Hacienda San Isidro',
  'Apiario Miel de Oro',
  'Cooperativa Cafetalera',
  'Ganadera El Roble',
  'Porcinos del Valle',
];

const propietario = () => escenario.cuenta.propietario;
const linea = (total: string) => ({ conceptoId: escenario.conceptoId, total });

/** Un proveedor nuevo (sin datos fiscales, salvo que se pidan) con su propio NIT. */
async function proveedorNuevo(extra: Record<string, unknown> = {}) {
  const { proveedorId } = await registrarProveedor(escenario.cuenta, NOMBRES[contador]!, extra);
  contador += 1;
  return { proveedorId, nitEmisor: nitValido(String(3000000 + contador)) };
}

const cuerpoDe = (proveedor: { proveedorId: string; nitEmisor: string }, cambios: Record<string, unknown> = {}) =>
  documentoDePrueba(escenario, { ...proveedor, lineas: [linea('5600.00')], ...cambios });

const registrar = (cuerpo: Record<string, unknown>) => propietario().post(RUTA_DOCUMENTOS, cuerpo);

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'familiasdocumentos');
});

afterAll(() => vi.restoreAllMocks());

describe('familia contra régimen del proveedor', () => {
  it('una factura general a un proveedor primario pide confirmar, y la auditoría guarda su régimen real', async () => {
    const proveedor = await proveedorNuevo({ secciones: { [SECCION]: { regimenIva: 'primario' } } });
    const cuerpo = cuerpoDe(proveedor, { tipoDte: 'FACT', datosFiscalesDelProveedor: null });

    const rechazado = await registrar(cuerpo);
    const confirmado = await registrar({ ...cuerpo, confirmarCambioDeRegimen: true });

    expect(rechazado.cuerpo.error.codigo).toBe('tipo_no_corresponde_al_proveedor');
    expect(confirmado.estado).toBe(201);
    const [auditada] = await consultar<{ anterior: { regimenIvaSegunSusDatos: string } }>(
      "select anterior from core.auditoria where recurso = 'libro-de-compras.documentos' and accion = 'corregir' and registro_id = $1",
      [confirmado.cuerpo.documento.id],
    );
    expect(auditada?.anterior.regimenIvaSegunSusDatos).toBe('primario');
  });

  it('una factura de primario o pecuario a un proveedor general pide confirmar', async () => {
    const proveedor = await proveedorNuevo({ secciones: { [SECCION]: { regimenIva: 'general' } } });
    const cuerpo = cuerpoDe(proveedor, { tipoDte: 'FPEC' });

    const rechazado = await registrar(cuerpo);
    const confirmado = await registrar({ ...cuerpo, confirmarCambioDeRegimen: true });

    expect(rechazado.cuerpo.error.codigo).toBe('tipo_no_corresponde_al_proveedor');
    expect(confirmado.estado).toBe(201);
    expect(confirmado.cuerpo.avisos).toContain(
      'El proveedor cambió de régimen: confirme que la factura es anterior al cambio.',
    );
  });

  it('un proveedor primario o pecuario registra su factura sin confirmar', async () => {
    const primario = await proveedorNuevo({ secciones: { [SECCION]: { regimenIva: 'primario' } } });
    const pecuario = await proveedorNuevo({ secciones: { [SECCION]: { regimenIva: 'pecuario' } } });

    const deprimario = await registrar(cuerpoDe(primario, { tipoDte: 'FCRP' }));
    const dePecuario = await registrar(cuerpoDe(pecuario, { tipoDte: 'FARP' }));

    expect(deprimario.estado).toBe(201);
    expect(dePecuario.estado).toBe(201);
  });

  it('un proveedor primario puede pasar a facturar como agropecuario derogado sin confirmar', async () => {
    const proveedor = await proveedorNuevo({ secciones: { [SECCION]: { regimenIva: 'primario' } } });

    const respuesta = await registrar(
      cuerpoDe(proveedor, { tipoDte: 'FACA', fechaEmision: ANTES_DE_LA_DEROGACION, fechaRecepcion: HOY }),
    );

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.avisos).not.toContain(
      'El proveedor cambió de régimen: confirme que la factura es anterior al cambio.',
    );
  });
});

describe('la nota en un período sin crédito', () => {
  it('la ficha de la nota muestra el motivo de su factura, sin guardarlo', async () => {
    const proveedor = await proveedorNuevo();
    const factura = await registrar(cuerpoDe(proveedor, { tipoDte: 'FARP', fechaEmision: haceDias(3) }));

    const nota = await registrar(
      cuerpoDe(proveedor, {
        tipo: 'nota_de_credito',
        serie: 'N',
        documentoAfectadoId: factura.cuerpo.documento.id,
        lineas: [linea('100.00')],
      }),
    );

    const ficha = await propietario().get(`${RUTA_DOCUMENTOS}/${nota.cuerpo.documento.id}`);
    expect(nota.estado).toBe(201);
    expect(ficha.cuerpo).toMatchObject({ tipo: 'nota_de_credito', motivoDeLaFactura: 'primario_pecuario' });
    expect(ficha.cuerpo.motivoSinCredito).toBe('primario_pecuario');
    const facturaFicha = await propietario().get(`${RUTA_DOCUMENTOS}/${factura.cuerpo.documento.id}`);
    expect(facturaFicha.cuerpo.motivoDeLaFactura).toBeNull();
  });
});
