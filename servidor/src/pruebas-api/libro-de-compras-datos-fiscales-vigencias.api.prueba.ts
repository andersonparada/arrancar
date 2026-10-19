import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta } from './soporte/escenarios.js';
import {
  consultar,
  documentoDePrueba,
  HOY,
  instalarDestinoFalso,
  NIT_DE_LA_EMPRESA,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const CLAVE = 'libro-de-compras';
const RECURSO = 'libro-de-compras.datos-fiscales-de-empresa';
const entorno = usarEntornoApi();

/** El primer día del mes que queda `meses` después del actual (puede ser negativo). */
function mes(meses: number): string {
  const indice = Number(HOY.slice(0, 4)) * 12 + (Number(HOY.slice(5, 7)) - 1) + meses;
  return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, '0')}-01`;
}

const rutaDeDatos = (empresaId: string) => `/api/libro-de-compras/empresas/${empresaId}/datos-fiscales`;
const PEQUENO = { regimenIva: 'pequeno_contribuyente' };

interface Auditado {
  accion: string;
  anterior: { historial: unknown[]; quitada?: { vigenteDesde: string | null } };
}

const auditoriaDe = (empresaId: string) =>
  consultar<Auditado>(
    'select accion, anterior from core.auditoria where recurso = $1 and registro_id = $2 order by creado_en',
    [RECURSO, empresaId],
  );

/** Guarda la sección fiscal por el formulario de Empresas (persona jurídica salvo que se diga otra cosa). */
function guardar(escenario: EscenarioDeDocumentos, seccion: Record<string, unknown>) {
  const { cuenta } = escenario;
  return cuenta.propietario.put(`/api/empresas/${cuenta.empresaId}`, {
    nombre: 'Rancho fiscal',
    nit: NIT_DE_LA_EMPRESA,
    secciones: { [CLAVE]: { tipoDePersona: 'juridica', ...seccion } },
  });
}

const historialDe = async (escenario: EscenarioDeDocumentos) =>
  (await escenario.cuenta.propietario.get(rutaDeDatos(escenario.cuenta.empresaId))).cuerpo.historial as Array<{
    id: string;
    vigenteDesde: string | null;
    vigenteHasta: string | null;
    regimenIva: string;
    tipoDePersona: string;
  }>;

beforeAll(() => {
  instalarDestinoFalso();
});

afterAll(() => vi.restoreAllMocks());

describe('los siete casos de guardar la sección fiscal de la empresa', () => {
  let escenario: EscenarioDeDocumentos;
  const empresaId = () => escenario.cuenta.empresaId;

  beforeAll(async () => {
    escenario = await prepararEscenario(entorno, 'vigenciasfiscales');
  });

  it('1. la primera vez crea la base «desde el inicio» y no audita', async () => {
    const historial = await historialDe(escenario);

    expect(historial).toEqual([
      expect.objectContaining({ vigenteDesde: null, vigenteHasta: null, regimenIva: 'general' }),
    ]);
    expect(await auditoriaDe(empresaId())).toEqual([]);
  });

  it('2. guardar lo mismo que rige no toca la historia ni audita', async () => {
    expect((await guardar(escenario, { vigenteDesde: mes(2) })).estado).toBe(200);

    expect(await historialDe(escenario)).toHaveLength(1);
    expect(await auditoriaDe(empresaId())).toEqual([]);
  });

  it('4. un cambio a partir de un mes parte el escalón y audita con el historial anterior', async () => {
    const respuesta = await guardar(escenario, { ...PEQUENO, vigenteDesde: mes(2) });

    expect(respuesta.estado).toBe(200);
    expect((await historialDe(escenario)).map((v) => [v.vigenteDesde, v.vigenteHasta, v.regimenIva])).toEqual([
      [null, mes(1), 'general'],
      [mes(2), null, 'pequeno_contribuyente'],
    ]);
    const auditado = await auditoriaDe(empresaId());
    expect(auditado).toHaveLength(1);
    expect(auditado[0]).toMatchObject({ accion: 'corregir', anterior: { historial: [{ regimenIva: 'general' }] } });
  });

  it('5. un escalón repetido no se crea', async () => {
    expect((await guardar(escenario, { ...PEQUENO, vigenteDesde: mes(4) })).estado).toBe(200);

    expect(await historialDe(escenario)).toHaveLength(2);
    expect(await auditoriaDe(empresaId())).toHaveLength(1);
  });

  it('6. cambiar solo el tipo de persona lo cambia en todas las vigencias', async () => {
    const respuesta = await guardar(escenario, { tipoDePersona: 'individual' });

    expect(respuesta.estado).toBe(200);
    expect((await historialDe(escenario)).map((v) => v.tipoDePersona)).toEqual(['individual', 'individual']);
    expect(await auditoriaDe(empresaId())).toHaveLength(2);
  });

  it('3. la fecha de una vigencia la corrige', async () => {
    const respuesta = await guardar(escenario, {
      tipoDePersona: 'individual',
      regimenIva: 'no_afiliado',
      regimenIsr: 'utilidades',
      vigenteDesde: mes(2),
    });

    expect(respuesta.estado).toBe(200);
    expect((await historialDe(escenario)).map((v) => v.regimenIva)).toEqual(['general', 'no_afiliado']);
    expect(await auditoriaDe(empresaId())).toHaveLength(3);
  });

  it('7. quitar una vigencia sin documentos: su escalón pasa a la anterior y se audita `eliminar`', async () => {
    const [base, programada] = await historialDe(escenario);
    const ruta = `${rutaDeDatos(empresaId())}/vigencias`;

    const respuesta = await escenario.cuenta.propietario.delete(`${ruta}/${programada!.id}`);
    const baseNoSeQuita = await escenario.cuenta.propietario.delete(`${ruta}/${base!.id}`);

    expect(respuesta.estado).toBe(204);
    expect(await historialDe(escenario)).toHaveLength(1);
    const auditado = await auditoriaDe(empresaId());
    expect(auditado.at(-1)).toMatchObject({ accion: 'eliminar', anterior: { quitada: { vigenteDesde: mes(2) } } });
    expect(baseNoSeQuita.estado).toBe(422);
    expect(baseNoSeQuita.cuerpo.error.codigo).toBe('vigencia_base_no_se_quita');
  });

  it('una vigencia que no existe, o de otra empresa, responde 404', async () => {
    const ruta = `${rutaDeDatos(empresaId())}/vigencias`;

    expect((await escenario.cuenta.propietario.delete(`${ruta}/${crypto.randomUUID()}`)).estado).toBe(404);
  });
});

describe('una vigencia que usan documentos no cambia', () => {
  let escenario: EscenarioDeDocumentos;
  const registrar = async (cambios: Record<string, unknown> = {}) => {
    const respuesta = await escenario.cuenta.propietario.post(RUTA_DOCUMENTOS, documentoDePrueba(escenario, cambios));
    expect(respuesta.estado).toBe(201);
    return respuesta.cuerpo.documento.id as string;
  };
  const anular = (id: string) =>
    escenario.cuenta.propietario.post(`${RUTA_DOCUMENTOS}/${id}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Prueba',
    });

  beforeAll(async () => {
    escenario = await prepararEscenario(entorno, 'vigenciasenuso');
  });

  it('corregir la base con un documento vigente responde 409 con el primer período; con el documento anulado, pasa', async () => {
    const id = await registrar();

    const rechazada = await guardar(escenario, { ...PEQUENO, vigenteDesde: null });
    await anular(id);
    const aceptada = await guardar(escenario, { ...PEQUENO, vigenteDesde: null });

    expect(rechazada.estado).toBe(409);
    expect(rechazada.cuerpo.error.codigo).toBe('vigencia_fiscal_en_uso');
    expect(rechazada.cuerpo.error.detalles).toEqual({
      campo: 'secciones.libro-de-compras.vigenteDesde',
      periodo: mes(0),
    });
    expect(aceptada.estado).toBe(200);
    await guardar(escenario, { vigenteDesde: null });
  });

  it('un cambio a partir del mes siguiente y partir un escalón con los mismos datos se permiten con documentos', async () => {
    await registrar();

    const programado = await guardar(escenario, { ...PEQUENO, vigenteDesde: mes(1) });
    const mismosDatos = await guardar(escenario, { vigenteDesde: mes(0) });
    const dto = (await escenario.cuenta.propietario.get(rutaDeDatos(escenario.cuenta.empresaId))).cuerpo;

    expect([programado.estado, mismosDatos.estado]).toEqual([200, 200]);
    expect(dto.historial.map((v: { conDocumentos: boolean }) => v.conDocumentos)).toEqual([true, false]);
  });

  it('quitar una vigencia con documentos en su escalón y datos distintos de la anterior responde 409; anulados, pasa', async () => {
    const id = await registrar({ periodo: mes(1) });
    const [, programada] = await historialDe(escenario);
    const ruta = `${rutaDeDatos(escenario.cuenta.empresaId)}/vigencias/${programada!.id}`;

    const rechazada = await escenario.cuenta.propietario.delete(ruta);
    await anular(id);
    const aceptada = await escenario.cuenta.propietario.delete(ruta);

    expect(rechazada.estado).toBe(409);
    expect(rechazada.cuerpo.error.codigo).toBe('vigencia_fiscal_en_uso');
    expect(rechazada.cuerpo.error.detalles.periodo).toBe(mes(1));
    expect(aceptada.estado).toBe(204);
  });
});

describe('una empresa sin datos fiscales guardados', () => {
  it('no se supone régimen general: registrar y calcular responden con un error que lleva a la sección', async () => {
    const cuenta = await darDeAltaCuenta(entorno, {
      nombre: 'Sin datos fiscales',
      usuario: 'sindatosfiscales',
      modulos: ['terceros', CLAVE],
    });
    await cuenta.propietario.put(`/api/empresas/${cuenta.empresaId}`, { nombre: 'Rancho', nit: NIT_DE_LA_EMPRESA });
    const { proveedorId } = await registrarProveedor(cuenta, 'Proveedor sin datos');
    const concepto = await cuenta.propietario.post('/api/libro-de-compras/conceptos-de-gasto', {
      nombre: 'Medicinas',
      tipoPorOmision: 'bien',
      esProductoAgropecuario: false,
      esActivoFijo: false,
      activo: true,
    });
    const escenario = { cuenta, proveedorId, conceptoId: concepto.cuerpo.id } as EscenarioDeDocumentos;
    const documento = documentoDePrueba(escenario);

    const registrado = await cuenta.propietario.post(RUTA_DOCUMENTOS, documento);
    const calculado = await cuenta.propietario.post(`${RUTA_DOCUMENTOS}/calcular`, documento);

    for (const respuesta of [registrado, calculado]) {
      expect(respuesta.estado).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('empresa_sin_datos_fiscales');
      expect(respuesta.cuerpo.error.detalles).toEqual({ seccion: 'secciones.libro-de-compras' });
    }
  });
});
