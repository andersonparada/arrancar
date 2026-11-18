/**
 * Seguridad de la carga inicial (EM-2): cada subida del balance deja su entrada `adjuntar` y sale en el historial, la
 * foto se rechaza por su firma sin llegar al core, exportar un cierre pide dos permisos y el motivo y los avisos del
 * último cierre solo llegan a quien puede ver los cierres.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { pdfDePrueba } from '../modulos/core/archivos/pruebas/pdfs-de-prueba.js';
import { hayQpdf } from '../modulos/core/archivos/pruebas/soporte-de-qpdf.js';
import { dependenciasCompartidas } from '../modulos/core/compartido/infraestructura/dependencias-compartidas.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearImagenPng, type Imagen } from './soporte/imagenes.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let segundaEmpresaId: string;
let soloVe: ClienteApi;
let veCierres: ClienteApi;
let soloExporta: ClienteApi;
let exportaYVe: ClienteApi;

const base = (empresaId: string) => `/api/empresas/${empresaId}/carga-inicial`;
const pdf = (nombre: string): Imagen => ({
  nombreArchivo: nombre,
  tipoMime: 'application/pdf',
  contenido: pdfDePrueba(),
});
const subir = (empresaId: string, archivo: Imagen) =>
  cuenta.propietario.subirImagen('POST', `${base(empresaId)}/balance-de-apertura`, archivo);
const adjuntos = (empresaId: string) =>
  comoPropietario<{ anterior: { balanceDeApertura: { nombreOriginal: string; sha256: string; paginas: number } } }>(
    `select anterior from core.auditoria where recurso = 'empresas.cargas-iniciales' and accion = 'adjuntar' and empresa_id = $1 order by creado_en`,
    [empresaId],
  );

async function usuario(apellidos: string, permisos: string[]): Promise<ClienteApi> {
  return crearUsuarioConPermisos(entorno, cuenta, { nombres: apellidos, apellidos: 'Carga', permisos });
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Carga segura', usuario: 'propietariocargasegura' });
  segundaEmpresaId = (await cuenta.propietario.post('/api/empresas', { nombre: 'Parcela Segura' })).cuerpo.id;
  for (const empresaId of [cuenta.empresaId, segundaEmpresaId]) {
    await cuenta.propietario.put(base(empresaId), { fechaDeInicio: '2026-01-01' });
  }
  soloVe = await usuario('Ve', ['empresas.ver']);
  veCierres = await usuario('Cierres', ['empresas.ver', 'empresas.carga-inicial.ver-cierres']);
  soloExporta = await usuario('Exporta', ['empresas.ver', 'empresas.carga-inicial.exportar']);
  exportaYVe = await usuario('Ambos', [
    'empresas.ver',
    'empresas.carga-inicial.exportar',
    'empresas.carga-inicial.ver-cierres',
  ]);
});

describe('una foto', () => {
  it('se rechaza por su firma sin pasar por la revisión del core', async () => {
    const revisar = vi.spyOn(dependenciasCompartidas().documentos, 'revisar');

    const respuesta = await subir(cuenta.empresaId, await crearImagenPng(32, 32));
    const llamadas = revisar.mock.calls.length;
    revisar.mockRestore();

    expect([respuesta.estado, respuesta.cuerpo.error.codigo]).toEqual([400, 'balance_de_apertura_no_es_pdf']);
    expect(llamadas).toBe(0);
  });
});

describe.skipIf(!hayQpdf)('la auditoría de cada subida', () => {
  it('con la carga abierta deja `adjuntar` con el balance como quedó y sale en el historial', async () => {
    await subir(cuenta.empresaId, pdf('uno.pdf'));
    await subir(cuenta.empresaId, pdf('dos.pdf'));

    const entradas = await adjuntos(cuenta.empresaId);
    const historial = (await veCierres.get(`${base(cuenta.empresaId)}/historial`)).cuerpo;

    expect(entradas.map((e) => e.anterior.balanceDeApertura.nombreOriginal)).toEqual(['uno.pdf', 'dos.pdf']);
    expect(entradas[1]!.anterior.balanceDeApertura).toMatchObject({ paginas: 1, sha256: expect.any(String) });
    expect(historial.filter((e: { accion: string }) => e.accion === 'adjuntar')).toHaveLength(2);
  });

  it('con la carga cerrada (y sin balance) también deja la entrada', async () => {
    await cuenta.propietario.post(`${base(segundaEmpresaId)}/cerrar`, {});

    const respuesta = await subir(segundaEmpresaId, pdf('tarde.pdf'));
    const historial = (await cuenta.propietario.get(`${base(segundaEmpresaId)}/historial`)).cuerpo;

    expect(respuesta.estado).toBe(200);
    expect((await adjuntos(segundaEmpresaId)).map((e) => e.anterior.balanceDeApertura.nombreOriginal)).toEqual([
      'tarde.pdf',
    ]);
    expect(historial.map((e: { accion: string }) => e.accion)).toContain('adjuntar');
  });
});

describe('el último cierre', () => {
  it('el motivo y los avisos solo llegan a quien puede ver los cierres', async () => {
    await cuenta.propietario.post(`${base(cuenta.empresaId)}/cerrar`, { motivo: 'Motivo reservado' });

    const sin = (await soloVe.get(base(cuenta.empresaId))).cuerpo.ultimoCierre;
    const con = (await veCierres.get(base(cuenta.empresaId))).cuerpo.ultimoCierre;

    expect(sin).toEqual({ diferencias: expect.any(Number), avisos: null, motivo: null, revisionGuardada: true });
    expect(JSON.stringify(sin)).not.toContain('Motivo reservado');
    expect(con).toMatchObject({ motivo: expect.any(String), avisos: expect.any(Number) });
  });
});

describe('exportar un cierre', () => {
  it('pide exportar y ver-cierres a la vez', async () => {
    const cierreId = (await veCierres.get(`${base(cuenta.empresaId)}/historial`)).cuerpo.find(
      (e: { accion: string }) => e.accion === 'cerrar',
    ).id;
    const ruta = `${base(cuenta.empresaId)}/cierres/${cierreId}/exportar`;

    expect((await soloExporta.get(ruta)).estado).toBe(403);
    expect((await veCierres.get(ruta)).estado).toBe(403);
    expect((await exportaYVe.get(ruta)).estado).toBe(200);
  });
});
