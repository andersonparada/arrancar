/**
 * Bandeja «Por capitalizar» (AF-3): qué líneas del libro entran, la clase propuesta por su concepto, los filtros, las
 * notas de crédito, el umbral, descartar y devolver con auditoría, los permisos y el aislamiento entre cuentas.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { configurarEmpresa, instalarDestinoFalso, RUTA_DOCUMENTOS } from './soporte/escenario-de-documentos.js';
import {
  asignacionNueva,
  capitalizar,
  lineaDeActivo,
  prepararBandeja,
  registrarDocumento,
  registrarNotaDeCredito,
  RUTA_BANDEJA,
  type EscenarioDeBandeja,
} from './soporte/escenario-de-bandeja-de-activos.js';

const entorno = usarEntornoApi();
let e: EscenarioDeBandeja;
let ajena: CuentaDePrueba;

const propietario = () => e.cuenta.propietario;
const bandeja = async (consulta = '') => (await propietario().get(`${RUTA_BANDEJA}${consulta}`)).cuerpo;
const idsDeLinea = async (consulta = '') =>
  (await bandeja(consulta)).lineas.map((l: { lineaId: string }) => l.lineaId) as string[];

beforeAll(async () => {
  instalarDestinoFalso();
  e = await prepararBandeja(entorno, 'afbandeja');
  ajena = await darDeAltaCuenta(entorno, {
    nombre: 'Bandeja ajena',
    usuario: 'afbandejaajena',
    modulos: ['terceros', 'libro-de-compras', 'activos-fijos'],
  });
});

afterAll(() => vi.restoreAllMocks());

describe('qué entra a la bandeja', () => {
  it('las líneas marcadas como activo fijo de documentos vigentes, con su costo, proveedor y concepto', async () => {
    const { lineaIds } = await registrarDocumento(e, {
      lineas: [lineaDeActivo(e), { conceptoId: e.conceptoId, total: '500.00' }],
    });

    const { lineas, umbral } = await bandeja();

    expect(umbral).toBeNull();
    const linea = lineas.find((l: { lineaId: string }) => l.lineaId === lineaIds[0]);
    expect(linea).toMatchObject({
      tipoDeDocumento: 'factura',
      proveedorNombre: 'Veterinaria El Quiroa',
      conceptoNombre: 'Vehículos y maquinaria',
      descripcion: 'Tractor John Deere',
      tipoDeLinea: 'bien',
      costo: '1000.00',
      capitalizado: '0.00',
      pendiente: '1000.00',
      bajoElUmbral: false,
      anteriorALaFechaDeInicio: false,
    });
    expect(lineas.map((l: { lineaId: string }) => l.lineaId)).not.toContain(lineaIds[1]);
  });

  it('un documento anulado sale de la bandeja', async () => {
    const { documentoId, lineaIds } = await registrarDocumento(e);
    expect(await idsDeLinea()).toContain(lineaIds[0]);

    const anulado = await propietario().post(`${RUTA_DOCUMENTOS}/${documentoId}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Se registró por error',
    });

    expect(anulado.estado).toBe(200);
    expect(await idsDeLinea()).not.toContain(lineaIds[0]);
  });

  it('una línea capitalizada por completo sale; una parcial queda con su pendiente', async () => {
    const { lineaIds } = await registrarDocumento(e);
    await capitalizar(e, [asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '400.00' })]);

    const parcial = (await bandeja()).lineas.find((l: { lineaId: string }) => l.lineaId === lineaIds[0]);
    await capitalizar(e, [asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '600.00' })]);

    expect(parcial).toMatchObject({ costo: '1000.00', capitalizado: '400.00', pendiente: '600.00' });
    expect(await idsDeLinea()).not.toContain(lineaIds[0]);
  });
});

describe('propuestas y filtros', () => {
  it('propone la clase según el concepto de gasto de la línea', async () => {
    const puesta = await propietario().put(`/api/activos-fijos/clases/${e.claseVehiculosId}/conceptos`, {
      conceptoIds: [e.conceptoDeActivoId],
    });
    expect(puesta.estado).toBe(200);
    const { lineaIds } = await registrarDocumento(e);

    const linea = (await bandeja()).lineas.find((l: { lineaId: string }) => l.lineaId === lineaIds[0]);
    const conPropuesta = await idsDeLinea('?conPropuesta=true');
    const sinPropuesta = await idsDeLinea('?conPropuesta=false');

    expect(linea).toMatchObject({ claseSugeridaId: e.claseVehiculosId, claseSugeridaNombre: 'Vehículos' });
    expect(conPropuesta).toContain(lineaIds[0]);
    expect(sinPropuesta).not.toContain(lineaIds[0]);
  });

  it('filtra por concepto y por período', async () => {
    const otro = await propietario().post('/api/libro-de-compras/conceptos-de-gasto', {
      nombre: 'Herramientas',
      tipoPorOmision: 'bien',
      esProductoAgropecuario: false,
      esActivoFijo: true,
      activo: true,
    });
    const { lineaIds } = await registrarDocumento(e, {
      lineas: [{ conceptoId: otro.cuerpo.id, total: '224.00', esActivoFijo: true }],
    });

    const porConcepto = await idsDeLinea(`?conceptoId=${otro.cuerpo.id}`);
    const fueraDePeriodo = await idsDeLinea('?hasta=2020-01-01');

    expect(porConcepto).toEqual(lineaIds);
    expect(fueraDePeriodo).toEqual([]);
  });

  it('marca «bajo el umbral» las líneas que no lo alcanzan, con el umbral de la empresa', async () => {
    await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: e.cuenta.empresaId });
    const fijado = await entorno.soporte.put('/api/configuracion/activos-fijos.capitalizacion.umbral', {
      nivel: 'empresa',
      valor: 800,
    });
    expect(fijado.estado).toBe(204);
    const { lineaIds } = await registrarDocumento(e, { lineas: [lineaDeActivo(e, '336.00')] });
    const { lineaIds: sobre } = await registrarDocumento(e);

    const { umbral, lineas } = await bandeja();
    await entorno.soporte.delete('/api/configuracion/activos-fijos.capitalizacion.umbral?nivel=empresa');

    const bajo = (id?: string) => lineas.find((l: { lineaId: string }) => l.lineaId === id)?.bajoElUmbral;
    expect(umbral).toBe('800.00');
    expect(bajo(lineaIds[0])).toBe(true);
    expect(bajo(sobre[0])).toBe(false);
  });
});

describe('notas de crédito', () => {
  it('entran aunque no estén marcadas, con costo negativo y el activo que más costo tiene de su factura', async () => {
    const factura = await registrarDocumento(e);
    const antes = await idsDeLinea();
    const nota = await registrarNotaDeCredito(e, factura.documentoId, '560.00');
    expect(await idsDeLinea()).not.toContain(nota.lineaIds[0]);
    expect(antes).toContain(factura.lineaIds[0]);
    const creado = await capitalizar(e, [asignacionNueva(e, { lineaId: factura.lineaIds[0]!, monto: '1000.00' })]);

    const linea = (await bandeja()).lineas.find((l: { lineaId: string }) => l.lineaId === nota.lineaIds[0]);

    expect(linea).toMatchObject({
      tipoDeDocumento: 'nota_de_credito',
      costo: '-500.00',
      pendiente: '-500.00',
      activoSugeridoId: creado.cuerpo.activos[0].id,
      activoSugeridoCodigo: creado.cuerpo.activos[0].codigo,
    });
  });
});

describe('descartar y devolver', () => {
  it('descartar la saca de la bandeja, deja la auditoría y avisa que la marca del libro no se corrige', async () => {
    const { lineaIds, documentoId } = await registrarDocumento(e);

    const descarte = await propietario().post(`${RUTA_BANDEJA}/${lineaIds[0]}/descartar`, {
      motivo: ' Era mantenimiento ',
    });

    expect(descarte.estado).toBe(200);
    expect(descarte.cuerpo.avisos[0]).toContain('Inversión');
    expect(await idsDeLinea()).not.toContain(lineaIds[0]);
    const auditado = await comoPropietario<{ motivo: string; anterior: { documento: string; costo: string } }>(
      "select motivo, anterior from core.auditoria where recurso = 'activos-fijos.bandeja' and accion = 'descartar' and registro_id = $1",
      [lineaIds[0]],
    );
    expect(auditado).toHaveLength(1);
    expect(auditado[0]).toMatchObject({ motivo: 'Era mantenimiento', anterior: { costo: '1000.00' } });
    const capitalizada = await capitalizar(e, [asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '100.00' })]);
    expect(capitalizada.cuerpo.error.codigo).toBe('linea_descartada');
    const otra = await propietario().post(`${RUTA_BANDEJA}/${lineaIds[0]}/descartar`, { motivo: 'Otra vez' });
    expect(otra.cuerpo.error.codigo).toBe('linea_descartada');
    expect(documentoId).toBeTruthy();
  });

  it('devolverla la regresa a la bandeja y queda en la auditoría', async () => {
    const { lineaIds } = await registrarDocumento(e);
    await propietario().post(`${RUTA_BANDEJA}/${lineaIds[0]}/descartar`, { motivo: 'Creí que era gasto' });

    const devuelta = await propietario().post(`${RUTA_BANDEJA}/${lineaIds[0]}/devolver`);
    const otraVez = await propietario().post(`${RUTA_BANDEJA}/${lineaIds[0]}/devolver`);

    expect(devuelta.estado).toBe(204);
    expect(otraVez.cuerpo.error.codigo).toBe('descarte_no_vigente');
    expect(await idsDeLinea()).toContain(lineaIds[0]);
    const acciones = await comoPropietario<{ accion: string }>(
      "select accion from core.auditoria where recurso = 'activos-fijos.bandeja' and registro_id = $1 order by creado_en",
      [lineaIds[0]],
    );
    expect(acciones.map((a) => a.accion)).toEqual(['descartar', 'devolver']);
  });

  it('el motivo es obligatorio y una línea con costos no se descarta', async () => {
    const { lineaIds } = await registrarDocumento(e);
    await capitalizar(e, [asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '100.00' })]);

    const sinMotivo = await propietario().post(`${RUTA_BANDEJA}/${lineaIds[0]}/descartar`, { motivo: '  ' });
    const conCostos = await propietario().post(`${RUTA_BANDEJA}/${lineaIds[0]}/descartar`, { motivo: 'Gasto' });

    expect(sinMotivo.estado).toBe(400);
    expect(conCostos.cuerpo.error.codigo).toBe('linea_con_costos');
  });

  it('un documento con una línea descartada se puede eliminar del libro: el descarte se va con la línea', async () => {
    const { lineaIds, documentoId } = await registrarDocumento(e);
    await propietario().post(`${RUTA_BANDEJA}/${lineaIds[0]}/descartar`, { motivo: 'Era gasto' });

    const eliminado = await propietario().delete(`${RUTA_DOCUMENTOS}/${documentoId}`);

    expect(eliminado.estado).toBe(200);
    const filas = await comoPropietario(
      'select 1 from activos_fijos.descartes_de_lineas where linea_de_documento_id = $1',
      [lineaIds[0]],
    );
    expect(filas).toHaveLength(0);
  });
});

describe('permisos y aislamiento', () => {
  it('cada acción exige su permiso', async () => {
    const { lineaIds } = await registrarDocumento(e);
    const sinNada = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Sin',
      apellidos: 'Permisos',
      permisos: ['activos-fijos.activos.ver'],
    });
    const soloVer = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Solo',
      apellidos: 'Ve Bandeja',
      permisos: ['activos-fijos.bandeja.ver'],
    });

    expect((await sinNada.get(RUTA_BANDEJA)).estado).toBe(403);
    expect((await soloVer.get(RUTA_BANDEJA)).estado).toBe(200);
    expect((await soloVer.post(`${RUTA_BANDEJA}/${lineaIds[0]}/descartar`, { motivo: 'x' })).estado).toBe(403);
    expect((await soloVer.post(`${RUTA_BANDEJA}/${lineaIds[0]}/devolver`)).estado).toBe(403);
    expect(
      (
        await soloVer.post(`${RUTA_BANDEJA}/capitalizar`, {
          asignaciones: [asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '1.00' })],
        })
      ).estado,
    ).toBe(403);
  });

  it('otra cuenta no ve las líneas de esta ni las puede capitalizar', async () => {
    const { lineaIds } = await registrarDocumento(e);

    const lista = await ajena.propietario.get(RUTA_BANDEJA);
    const intento = await ajena.propietario.post(`${RUTA_BANDEJA}/capitalizar`, {
      asignaciones: [asignacionNueva(e, { lineaId: lineaIds[0]!, monto: '100.00' })],
    });
    const descarte = await ajena.propietario.post(`${RUTA_BANDEJA}/${lineaIds[0]}/descartar`, { motivo: 'x' });

    expect(lista.cuerpo.lineas).toEqual([]);
    expect(intento.cuerpo.error.codigo).toBe('linea_no_capitalizable');
    expect(descarte.cuerpo.error.codigo).toBe('linea_no_capitalizable');
  });
});

describe('el IVA que no se acredita va al costo', () => {
  it('una empresa sin crédito fiscal capitaliza la línea con su IVA', async () => {
    const sinCredito = await prepararBandeja(entorno, 'afbandejasincredito');
    await configurarEmpresa(sinCredito.cuenta, {
      regimenIva: 'pequeno_contribuyente',
      agenteDeRetencionIva: 'ninguno',
    });
    const { lineaIds } = await registrarDocumento(sinCredito);

    const { lineas } = (await sinCredito.cuenta.propietario.get(RUTA_BANDEJA)).cuerpo;
    const creado = await capitalizar(sinCredito, [
      asignacionNueva(sinCredito, { lineaId: lineaIds[0]!, monto: '1120.00' }),
    ]);

    expect(lineas[0]).toMatchObject({ costo: '1120.00', pendiente: '1120.00' });
    expect(creado.cuerpo.activos[0].costo).toBe('1120.00');
  });
});
