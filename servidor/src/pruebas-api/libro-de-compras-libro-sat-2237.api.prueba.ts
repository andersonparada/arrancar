import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { VendedoresDePrueba } from './soporte/factura-especial.js';
import {
  configurarEmpresa,
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
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const RUTA = '/api/libro-de-compras/libro/sat-2237';
const PERIODO = HOY.slice(0, 7);
const NIT_DEL_VENDEDOR = nitValido('4100001');
let escenario: EscenarioDeDocumentos;
let pequeno: EscenarioDeDocumentos;
let sinFormulario: EscenarioDeDocumentos;
let soloDocumentos: ClienteApi;
let conLibro: ClienteApi;
let facturaId: string;

const propietario = () => escenario.cuenta.propietario;
const linea = (total: string, extra: Record<string, unknown> = {}) => [
  { conceptoId: escenario.conceptoId, total, ...extra },
];

async function registrar(cambios: Record<string, unknown> = {}, donde: EscenarioDeDocumentos = escenario) {
  const respuesta = await donde.cuenta.propietario.post(RUTA_DOCUMENTOS, documentoDePrueba(donde, cambios));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.documento.id as string;
}

async function vigenciaDeCombustible(combustibleId: string, cambios: Record<string, unknown>) {
  const vigencia = await propietario().post('/api/libro-de-compras/vigencias-de-combustible', {
    combustibleId,
    idpPorGalon: '0.00',
    porcentajeDeEtanol: '0.00',
    ivaExento: false,
    vigenteDesde: haceDias(30),
    vigenteHasta: null,
    ...cambios,
  });
  expect(vigencia.estado, JSON.stringify(vigencia.cuerpo)).toBe(201);
}

async function proveedorConNit(nombre: string, cuerpoDelNit: string) {
  const { proveedorId } = await registrarProveedor(escenario.cuenta, nombre);
  return { proveedorId, nitEmisor: nitValido(cuerpoDelNit) };
}

/** Facturas de bienes y servicios, combustible, activo fijo, notas, pequeño contribuyente, FESP y combustible exento. */
async function armarElPeriodo(): Promise<void> {
  await vigenciaDeCombustible(escenario.combustibleId, { ivaExento: true });
  const gasolina = await propietario().post('/api/libro-de-compras/combustibles', { nombre: 'Gasolina', activo: true });
  await vigenciaDeCombustible(gasolina.cuerpo.id, { idpPorGalon: '4.70' });
  facturaId = await registrar();
  await registrar({
    ...(await proveedorConNit('Servicios Veterinarios', '3000002')),
    lineas: linea('1120.00', { tipo: 'servicio' }),
  });
  await registrar({ lineas: linea('1167.00', { combustibleId: gasolina.cuerpo.id, galones: '10' }) });
  await registrar({ lineas: linea('1120.00', { esActivoFijo: true }) });
  await registrar({ tipoDte: 'NCRE', serie: 'N', documentoAfectadoId: facturaId, lineas: linea('560.00') });
  await registrar({ tipoDte: 'NDEB', serie: 'D', documentoAfectadoId: facturaId, lineas: linea('112.00') });
  await registrar({
    tipoDte: 'FPEQ',
    ...(await proveedorConNit('Tienda Pequeña', '3000003')),
    lineas: linea('500.00'),
  });
  await registrar({ lineas: linea('500.00', { combustibleId: escenario.combustibleId, galones: '10' }) });
  const vendedores = new VendedoresDePrueba(escenario);
  const vendedor = await vendedores.nuevo();
  const fesp = vendedores.cuerpo(vendedor.proveedorId, { nitReceptor: NIT_DEL_VENDEDOR, fechaEmision: HOY });
  const respuesta = await propietario().post(RUTA_DOCUMENTOS, fesp);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
}

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'satdosdostreinta');
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
    esAgenteDeRetencionIsr: true,
  });
  pequeno = await prepararEscenario(entorno, 'satpequeno');
  await configurarEmpresa(pequeno.cuenta, { regimenIva: 'pequeno_contribuyente', agenteDeRetencionIva: 'ninguno' });
  sinFormulario = await prepararEscenario(entorno, 'satnoafiliado');
  await configurarEmpresa(sinFormulario.cuenta, { regimenIva: 'no_afiliado', agenteDeRetencionIva: 'ninguno' });
  await armarElPeriodo();
  soloDocumentos = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Solo documentos',
    apellidos: 'Sat',
    permisos: ['libro-de-compras.documentos.ver'],
  });
  conLibro = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Con libro',
    apellidos: 'Sat',
    permisos: ['libro-de-compras.libro.ver'],
  });
});

afterAll(() => vi.restoreAllMocks());

const rubroDe = (cuerpo: { rubros: Array<{ clave: string; neto: unknown }> }, clave: string) =>
  cuerpo.rubros.find((rubro) => rubro.clave === clave);

describe('datos para el SAT-2237 (régimen general)', () => {
  it('reparte los rubros con nombre propio, con facturas, notas y neto', async () => {
    const { cuerpo } = await propietario().get(`${RUTA}?periodo=${PERIODO}`);

    expect(cuerpo).toMatchObject({ aplica: true, formulario: 'SAT-2237', periodo: `${PERIODO}-01`, casillas: null });
    expect(rubroDe(cuerpo, 'otras_compras')).toMatchObject({
      // Incluye la factura especial (Q5,000.00).
      facturas: { base: '6000.00', iva: '720.00' },
      notasDeDebito: { base: '100.00', iva: '12.00' },
      notasDeCredito: { base: '-500.00', iva: '-60.00' },
      neto: { base: '5600.00', iva: '672.00' },
    });
    for (const clave of ['servicios', 'combustibles', 'activos_fijos']) {
      expect(rubroDe(cuerpo, clave)?.neto, clave).toEqual({ base: '1000.00', iva: '120.00' });
    }
    expect(rubroDe(cuerpo, 'importaciones')?.neto).toEqual({ base: '0.00', iva: '0.00' });
  });

  it('el pequeño contribuyente y el combustible exento van aparte, sin crédito', async () => {
    const { cuerpo } = await propietario().get(`${RUTA}?periodo=${PERIODO}`);

    expect(rubroDe(cuerpo, 'pequeno_contribuyente')?.neto).toEqual({ base: '500.00', iva: '0.00' });
    expect(rubroDe(cuerpo, 'exento_y_no_afecto')?.neto).toEqual({ base: '500.00', iva: '0.00' });
    expect(rubroDe(cuerpo, 'combustibles_exentos')?.neto).toEqual({ base: '500.00', iva: '0.00' });
    expect(cuerpo.avisos.some((aviso: string) => aviso.includes('Decreto 22-2026'))).toBe(true);
    expect(cuerpo.avisos.some((aviso: string) => aviso.includes('Medicamentos y vehículos'))).toBe(true);
  });

  it('el segmento 9 cuenta facturas, notas de crédito y notas de débito recibidas', async () => {
    const { cuerpo } = await propietario().get(`${RUTA}?periodo=${PERIODO}`);

    const por = (clave: string) => cuerpo.segmento9.find((operacion: { clave: string }) => operacion.clave === clave);
    expect(por('facturas')).toMatchObject({ cantidad: 5, base: '4000.00' });
    expect(por('notas_de_credito')).toMatchObject({ cantidad: 1, base: '500.00' });
    expect(por('notas_de_debito')).toMatchObject({ cantidad: 1, base: '100.00' });
    expect(por('pequeno_contribuyente')).toMatchObject({ cantidad: 1, base: '500.00' });
    expect(por('facturas_especiales')).toMatchObject({ cantidad: 1, base: '5000.00' });
  });

  it('el detalle agrupa por NIT con las notas neteadas, y la FESP va en su fila', async () => {
    const { cuerpo } = await propietario().get(`${RUTA}?periodo=${PERIODO}`);

    expect(cuerpo.proveedores.filas).toHaveLength(2);
    expect(cuerpo.proveedores.filas[0]).toMatchObject({
      cantidadDeFacturas: 3,
      cantidadDeNotasDeCredito: 1,
      cantidadDeNotasDeDebito: 1,
      base: '2600.00',
      credito: '312.00',
      aviso: null,
    });
    expect(cuerpo.proveedores.total).toEqual({ cantidadDeFacturas: 4, base: '3600.00', credito: '432.00' });
    expect(cuerpo.facturasEspeciales.filas).toEqual([
      expect.objectContaining({ nit: NIT_DEL_VENDEDOR, cantidadDeFacturas: 1, base: '5000.00', credito: '600.00' }),
    ]);
  });
});

describe('otros regímenes y permisos', () => {
  it('el pequeño contribuyente recibe que su formulario es el SAT-2046 y no declara compras', async () => {
    await registrar({}, pequeno);
    const { estado, cuerpo } = await pequeno.cuenta.propietario.get(`${RUTA}?periodo=${PERIODO}`);

    expect(estado).toBe(200);
    expect(cuerpo).toMatchObject({ aplica: false, formulario: 'SAT-2046' });
    expect(cuerpo.mensaje).toContain('las compras no se declaran');
    expect(cuerpo.rubros).toBeUndefined();
  });

  it('los demás regímenes reciben que no hay formulario', async () => {
    const { cuerpo } = await sinFormulario.cuenta.propietario.get(`${RUTA}?periodo=2020-01`);

    expect(cuerpo).toMatchObject({ aplica: false, formulario: null });
    expect(cuerpo.mensaje).toContain('no hay datos que declarar');
  });

  it('exige libro.ver y el formato AAAA-MM', async () => {
    expect((await soloDocumentos.get(`${RUTA}?periodo=${PERIODO}`)).estado).toBe(403);
    expect((await conLibro.get(`${RUTA}?periodo=${PERIODO}`)).estado).toBe(200);
    expect((await propietario().get(RUTA)).estado).toBe(400);
  });
});

describe('Excel del SAT-2237', () => {
  it('baja un .xlsx con libro.exportar y lo niega sin ese permiso', async () => {
    const respuesta = await propietario().get(`${RUTA}/exportar?periodo=${PERIODO}`);

    expect(respuesta.estado).toBe(200);
    expect(String(respuesta.cabeceras['content-type'])).toContain('spreadsheetml');
    expect(Buffer.from(respuesta.cuerpo).subarray(0, 2).toString()).toBe('PK');
    expect((await conLibro.get(`${RUTA}/exportar?periodo=${PERIODO}`)).estado).toBe(403);
  });

  it('un régimen sin SAT-2237 no tiene archivo que exportar', async () => {
    const respuesta = await pequeno.cuenta.propietario.get(`${RUTA}/exportar?periodo=${PERIODO}`);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('sat_2237_no_aplica');
  });
});
