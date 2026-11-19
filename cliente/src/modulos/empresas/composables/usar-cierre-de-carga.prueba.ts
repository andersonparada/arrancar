import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import type { CargaInicial, RevisionDeCierre } from '../servicios/cierre-de-carga.tipos';
import { apiDatosDeEmpresa } from '../servicios/datos-de-empresa.api';
import { AVISO_DE_REVISION_DESACTUALIZADA } from './revision-de-cierre';
import { usarCierreDeCarga } from './usar-cierre-de-carga';

const abierta: CargaInicial = {
  empresaId: 'e1',
  fechaDeInicio: '2026-01-01',
  cerrada: false,
  cerradaEn: null,
  cerradaPor: null,
  ultimoCierre: null,
  balanceDeApertura: null,
};
const cerrada: CargaInicial = { ...abierta, cerrada: true, cerradaEn: '2026-11-18T15:00:00Z', cerradaPor: 'Ana' };
const revision = (cambios: Partial<RevisionDeCierre> = {}): RevisionDeCierre => ({
  carga: abierta,
  modulos: [],
  diferencias: 0,
  avisos: 0,
  pideMotivo: false,
  huella: 'h1',
  ...cambios,
});
const conDiferencias = revision({ diferencias: 2, pideMotivo: true, huella: 'h2' });
const errorDelServidor = (codigo: string, detalles?: unknown) =>
  new ErrorApi(422, { codigo, mensaje: 'Del servidor', detalles });

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => vi.restoreAllMocks());

async function abrirVentana(vista: RevisionDeCierre) {
  vi.spyOn(apiDatosDeEmpresa, 'revisionDeCierre').mockResolvedValue(vista);
  const carga = ref<CargaInicial | null>(abierta);
  const cierre = usarCierreDeCarga(() => 'e1', carga);
  await cierre.abrir();
  return { cierre, carga };
}

describe('abrir la ventana de cierre', () => {
  it('trae la revisión y deja el motivo vacío', async () => {
    const { cierre } = await abrirVentana(conDiferencias);

    expect(cierre.abierta.value).toBe(true);
    expect(cierre.revision.value).toEqual(conDiferencias);
    expect(cierre.pideMotivo.value).toBe(true);
    expect(cierre.motivo.value).toBe('');
  });

  it('si no se pudo revisar, no deja la ventana abierta', async () => {
    vi.spyOn(apiDatosDeEmpresa, 'revisionDeCierre').mockRejectedValue(new Error('Sin conexión'));
    const cierre = usarCierreDeCarga(() => 'e1', ref(abierta));

    await cierre.abrir();

    expect(cierre.abierta.value).toBe(false);
  });
});

describe('confirmar el cierre', () => {
  it('sin hallazgos cierra sin motivo, mandando la huella', async () => {
    const cerrar = vi.spyOn(apiDatosDeEmpresa, 'cerrarCargaInicial').mockResolvedValue(cerrada);
    const { cierre, carga } = await abrirVentana(revision());

    await cierre.confirmar();

    expect(cerrar).toHaveBeenCalledWith('e1', { motivo: undefined, huella: 'h1' });
    expect(carga.value).toEqual(cerrada);
    expect(cierre.abierta.value).toBe(false);
  });

  it('si piden motivo y está vacío, lo dice en el campo y no llama al servidor', async () => {
    const cerrar = vi.spyOn(apiDatosDeEmpresa, 'cerrarCargaInicial');
    const { cierre } = await abrirVentana(conDiferencias);

    await cierre.confirmar();

    expect(cierre.errores.value.motivo).toContain('2 diferencias');
    expect(cerrar).not.toHaveBeenCalled();
    expect(cierre.abierta.value).toBe(true);
  });

  it('con motivo lo manda recortado', async () => {
    const cerrar = vi.spyOn(apiDatosDeEmpresa, 'cerrarCargaInicial').mockResolvedValue(cerrada);
    const { cierre } = await abrirVentana(conDiferencias);
    cierre.fijarMotivo('  Falta el estado de cuenta  ');

    await cierre.confirmar();

    expect(cerrar).toHaveBeenCalledWith('e1', { motivo: 'Falta el estado de cuenta', huella: 'h2' });
  });

  it('si los saldos cambiaron, muestra la revisión nueva y avisa; la ventana sigue abierta', async () => {
    const nueva = revision({ diferencias: 3, pideMotivo: true, huella: 'h3' });
    vi.spyOn(apiDatosDeEmpresa, 'cerrarCargaInicial').mockRejectedValue(
      errorDelServidor('revision_de_cierre_desactualizada', nueva),
    );
    const { cierre, carga } = await abrirVentana(revision());

    await cierre.confirmar();

    expect(cierre.revision.value).toEqual(nueva);
    expect(cierre.avisoDeCambio.value).toBe(AVISO_DE_REVISION_DESACTUALIZADA);
    expect(cierre.abierta.value).toBe(true);
    expect(carga.value?.cerrada).toBe(false);
  });

  it('si el servidor no manda la revisión nueva, la vuelve a pedir', async () => {
    vi.spyOn(apiDatosDeEmpresa, 'cerrarCargaInicial').mockRejectedValue(
      errorDelServidor('revision_de_cierre_desactualizada'),
    );
    const { cierre } = await abrirVentana(revision());
    const pedir = vi.spyOn(apiDatosDeEmpresa, 'revisionDeCierre').mockResolvedValue(conDiferencias);
    pedir.mockClear();

    await cierre.confirmar();

    expect(pedir).toHaveBeenCalledTimes(1);
    expect(cierre.revision.value).toEqual(conDiferencias);
  });

  it('un motivo que el servidor rechaza va al campo del motivo', async () => {
    vi.spyOn(apiDatosDeEmpresa, 'cerrarCargaInicial').mockRejectedValue(
      errorDelServidor('motivo_de_cierre_requerido', conDiferencias),
    );
    const { cierre } = await abrirVentana(revision());

    await cierre.confirmar();

    expect(cierre.errores.value).toEqual({ motivo: 'Del servidor' });
    expect(cierre.revision.value).toEqual(conDiferencias);
    expect(cierre.avisoDeCambio.value).toBe('');
  });

  it('otro error deja la ventana abierta sin tocar la revisión', async () => {
    vi.spyOn(apiDatosDeEmpresa, 'cerrarCargaInicial').mockRejectedValue(errorDelServidor('carga_inicial_cerrada'));
    const { cierre } = await abrirVentana(revision());

    await cierre.confirmar();

    expect(cierre.abierta.value).toBe(true);
    expect(cierre.revision.value?.huella).toBe('h1');
    expect(cierre.enviando.value).toBe(false);
  });
});
