import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import {
  DatosFiscalesDeEmpresa,
  type PropiedadesFiscalesDeEmpresa,
} from '../../../dominio/datos-fiscales-de-empresa.js';
import { DatosFiscalesInvalidos } from '../../../dominio/errores.js';
import { VigenciaBaseNoSeQuita } from '../../../dominio/historial-fiscal-de-empresa.js';
import {
  AccesoAEmpresasEnMemoria,
  DatosFiscalesDeEmpresaEnMemoria,
  PeriodosConDocumentosEnMemoria,
} from '../../../pruebas/dobles-de-datos-fiscales.js';
import { ConfiguracionFiscalEnMemoria } from '../../../pruebas/dobles-de-documentos.js';
import { VigenciaFiscalEnUso } from '../../errores.js';
import { CambiosAlHistorialFiscal } from './cambios-al-historial-fiscal.js';
import { GuardarDatosFiscalesDeEmpresa, type CambioDeDatosFiscales } from './guardar-datos-fiscales-de-empresa.js';
import { ObtenerDatosFiscalesDeEmpresa } from './obtener-datos-fiscales-de-empresa.js';
import { QuitarVigenciaFiscalDeEmpresa } from './quitar-vigencia-fiscal-de-empresa.js';

const operador = operadorDePrueba();
const empresaId = operador.empresaId;
const RECURSO = 'libro-de-compras.datos-fiscales-de-empresa';

const general: PropiedadesFiscalesDeEmpresa = DatosFiscalesDeEmpresa.porOmision().instantanea();
const pequeno: PropiedadesFiscalesDeEmpresa = {
  ...general,
  regimenIva: 'pequeno_contribuyente',
  regimenIsr: null,
};

let unidadDeTrabajo: UnidadDeTrabajoEnMemoria;
let auditoria: AuditoriaEnMemoria;
let repositorio: DatosFiscalesDeEmpresaEnMemoria;
let documentos: PeriodosConDocumentosEnMemoria;
let cambios: CambiosAlHistorialFiscal;

beforeEach(() => {
  unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  repositorio = new DatosFiscalesDeEmpresaEnMemoria();
  documentos = new PeriodosConDocumentosEnMemoria();
  cambios = new CambiosAlHistorialFiscal({ repositorio, documentos });
});

const guardar = (cambio: Omit<CambioDeDatosFiscales, 'empresaId'>) =>
  new GuardarDatosFiscalesDeEmpresa({
    unidadDeTrabajo,
    repositorio,
    cambios,
    auditoria,
    reloj: new RelojFijo('2026-10-04'),
    configuracion: new ConfiguracionFiscalEnMemoria(),
  }).ejecutar(operador, { empresaId, ...cambio });

const vigencias = () => repositorio.vigencias.get(empresaId) ?? [];
const regimenes = () => vigencias().map((v) => [v.vigenteDesde, v.datos.instantanea().regimenIva]);

describe('guardar los datos fiscales de la empresa', () => {
  it('caso 1, la primera vez: crea la base y no audita, sea cual sea la fecha', async () => {
    await guardar({ datos: general, vigenteDesde: '2026-03-01' });

    expect(regimenes()).toEqual([[null, 'general']]);
    expect(auditoria.entradas).toEqual([]);
    expect(repositorio.bloqueos).toEqual([`${empresaId}:actualizar`]);
  });

  it('caso 2, los mismos datos que rigen: no cambia nada ni audita', async () => {
    await guardar({ datos: general });
    await guardar({ datos: general, vigenteDesde: '2026-12-01' });

    expect(vigencias()).toHaveLength(1);
    expect(auditoria.entradas).toEqual([]);
  });

  it('caso 3, la fecha es la de una vigencia: la corrige y audita con el historial anterior', async () => {
    await guardar({ datos: general });

    await guardar({ datos: pequeno, vigenteDesde: null });

    expect(regimenes()).toEqual([[null, 'pequeno_contribuyente']]);
    expect(auditoria.acciones()).toEqual([`${RECURSO}:corregir`]);
    expect(auditoria.entradas[0]).toMatchObject({
      registroId: empresaId,
      anterior: { empresaId, historial: [{ vigenteDesde: null, vigenteHasta: null, regimenIva: 'general' }] },
    });
  });

  it('caso 4, la fecha cae dentro de un escalón: parte el escalón desde ese mes y audita', async () => {
    await guardar({ datos: general });

    await guardar({ datos: pequeno, vigenteDesde: '2026-11-01' });

    expect(regimenes()).toEqual([
      [null, 'general'],
      ['2026-11-01', 'pequeno_contribuyente'],
    ]);
    expect(auditoria.acciones()).toEqual([`${RECURSO}:corregir`]);
  });

  it('caso 5, el escalón repetido no se crea y no se audita', async () => {
    await guardar({ datos: general });
    await guardar({ datos: pequeno, vigenteDesde: '2026-11-01' });
    auditoria.entradas.length = 0;

    await guardar({ datos: pequeno, vigenteDesde: '2027-01-01' });

    expect(vigencias()).toHaveLength(2);
    expect(auditoria.entradas).toEqual([]);
  });

  it('caso 6, solo cambia el tipo de persona: cambia todas las vigencias, aunque tengan documentos', async () => {
    await guardar({ datos: general });
    await guardar({ datos: pequeno, vigenteDesde: '2026-11-01' });
    documentos.periodos = ['2026-08-01', '2026-11-01'];

    await guardar({ datos: { ...general, tipoDePersona: 'individual' } });

    expect(vigencias().map((v) => v.datos.instantanea().tipoDePersona)).toEqual(['individual', 'individual']);
    expect(auditoria.acciones()).toEqual([`${RECURSO}:corregir`, `${RECURSO}:corregir`]);
  });

  it('sin vigenteDesde corrige la vigencia de hoy y no crea escalones', async () => {
    await guardar({ datos: general });
    await guardar({ datos: pequeno, vigenteDesde: '2026-08-01' });

    await guardar({ datos: general });

    expect(regimenes()).toEqual([[null, 'general']]);
  });

  it('una vigencia que usan documentos vigentes no cambia: informa el primer período', async () => {
    await guardar({ datos: general });
    documentos.periodos = ['2026-09-01', '2026-10-01'];

    const corregir = guardar({ datos: pequeno, vigenteDesde: null });

    await expect(corregir).rejects.toThrow(VigenciaFiscalEnUso);
    await expect(corregir).rejects.toMatchObject({
      codigo: 'vigencia_fiscal_en_uso',
      detalles: { campo: 'secciones.libro-de-compras.vigenteDesde', periodo: '2026-09-01' },
    });
    expect(regimenes()).toEqual([[null, 'general']]);
  });

  it('un cambio a partir de noviembre se permite con documentos de octubre, no con los de noviembre', async () => {
    await guardar({ datos: general });
    documentos.periodos = ['2026-10-01'];

    await guardar({ datos: pequeno, vigenteDesde: '2026-11-01' });
    documentos.periodos = ['2026-10-01', '2026-12-01'];

    await expect(guardar({ datos: general, vigenteDesde: '2026-11-01' })).rejects.toThrow(VigenciaFiscalEnUso);
    expect(vigencias()).toHaveLength(2);
  });

  it('partir un escalón con los mismos datos se permite aunque tenga documentos', async () => {
    await guardar({ datos: general });
    documentos.periodos = ['2026-10-01'];

    await guardar({ datos: { ...general, esAgenteDeRetencionIsr: true }, vigenteDesde: '2026-10-01' });

    expect(vigencias()).toHaveLength(1);
  });

  it('rechaza fechas fuera de lo permitido', async () => {
    await guardar({ datos: general });

    for (const vigenteDesde of ['2026-11-05', '1999-12-01', '2028-01-01']) {
      await expect(guardar({ datos: pequeno, vigenteDesde })).rejects.toThrow(DatosFiscalesInvalidos);
    }
    expect(regimenes()).toEqual([[null, 'general']]);
  });

  it('rechaza datos contradictorios sin guardar ni auditar', async () => {
    const contradictorios = { ...pequeno, agenteDeRetencionIva: 'otro' } as const;

    await expect(guardar({ datos: contradictorios })).rejects.toThrow(DatosFiscalesInvalidos);
    expect(vigencias()).toEqual([]);
    expect(auditoria.entradas).toEqual([]);
  });

  it('el régimen agropecuario no puede iniciar después de su derogación', async () => {
    const persona = { ...general, tipoDePersona: 'individual' } as const;
    const agropecuario = { ...persona, regimenIva: 'contribuyente_agropecuario', regimenIsr: null } as const;
    await guardar({ datos: persona });

    await expect(
      guardar({ datos: { ...agropecuario, esAgenteDeRetencionIsr: false }, vigenteDesde: '2026-11-01' }),
    ).rejects.toThrow(DatosFiscalesInvalidos);
  });
});

describe('quitar una vigencia', () => {
  const quitar = (vigenciaId: string, empresa = empresaId) =>
    new QuitarVigenciaFiscalDeEmpresa({
      unidadDeTrabajo,
      repositorio,
      cambios,
      acceso: new AccesoAEmpresasEnMemoria([empresaId]),
      auditoria,
    }).ejecutar(operador, empresa, vigenciaId);

  beforeEach(async () => {
    await guardar({ datos: general });
    await guardar({ datos: pequeno, vigenteDesde: '2026-11-01' });
    auditoria.entradas.length = 0;
  });

  it('quita una vigencia sin documentos y audita `eliminar` con la quitada y el historial', async () => {
    const [, noviembre] = vigencias();

    await quitar(noviembre!.id!);

    expect(regimenes()).toEqual([[null, 'general']]);
    expect(auditoria.acciones()).toEqual([`${RECURSO}:eliminar`]);
    expect(auditoria.entradas[0]).toMatchObject({
      registroId: empresaId,
      anterior: {
        quitada: { vigenteDesde: '2026-11-01', regimenIva: 'pequeno_contribuyente' },
        historial: [{ vigenteDesde: null }, { vigenteDesde: '2026-11-01' }],
      },
    });
  });

  it('no la quita si su escalón tiene documentos vigentes que cambiarían de régimen', async () => {
    documentos.periodos = ['2026-12-01'];
    const [, noviembre] = vigencias();

    await expect(quitar(noviembre!.id!)).rejects.toThrow(VigenciaFiscalEnUso);
    expect(vigencias()).toHaveLength(2);
    expect(auditoria.entradas).toEqual([]);
  });

  it('la base no se quita', async () => {
    const [base] = vigencias();

    await expect(quitar(base!.id!)).rejects.toThrow(VigenciaBaseNoSeQuita);
  });

  it('una vigencia que no existe, o de una empresa sin acceso, no se encuentra', async () => {
    await expect(quitar(crypto.randomUUID())).rejects.toThrow(RecursoNoEncontrado);
    await expect(quitar(crypto.randomUUID(), crypto.randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });
});

describe('leer los datos fiscales de la empresa', () => {
  const obtener = (permitidas: string[] = [empresaId]) =>
    new ObtenerDatosFiscalesDeEmpresa({
      unidadDeTrabajo,
      repositorio,
      documentos,
      acceso: new AccesoAEmpresasEnMemoria(permitidas),
      reloj: new RelojFijo('2026-12-10'),
    });

  it('sin datos guardados devuelve el formulario vacío, sin tipo de persona, y trabaja con la empresa pedida', async () => {
    const otraEmpresa = crypto.randomUUID();

    const dto = await obtener([otraEmpresa]).ejecutar(operador, otraEmpresa);

    expect(dto).toEqual({
      empresaId: otraEmpresa,
      guardado: false,
      vigenteDesde: null,
      tipoDePersona: null,
      regimenIva: 'general',
      regimenIsr: 'utilidades',
      agenteDeRetencionIva: 'ninguno',
      esAgenteDeRetencionIsr: true,
      historial: [],
    });
    expect(unidadDeTrabajo.contextos.at(-1)).toEqual({ ...operador, empresaId: otraEmpresa });
  });

  it('con historial devuelve lo de hoy y las vigencias con su fin y si tienen documentos', async () => {
    await guardar({ datos: general });
    await guardar({ datos: pequeno, vigenteDesde: '2026-11-01' });
    await guardar({ datos: general, vigenteDesde: '2027-02-01' });
    documentos.periodos = ['2026-12-01'];

    const dto = await obtener().ejecutar(operador, empresaId);

    expect(dto).toMatchObject({
      guardado: true,
      vigenteDesde: '2026-11-01',
      tipoDePersona: 'juridica',
      regimenIva: 'pequeno_contribuyente',
      regimenIsr: null,
    });
    expect(dto.historial.map((v) => [v.vigenteDesde, v.vigenteHasta, v.conDocumentos])).toEqual([
      [null, '2026-10-01', false],
      ['2026-11-01', '2027-01-01', true],
      ['2027-02-01', null, false],
    ]);
  });

  it('una empresa a la que el operador no tiene acceso responde como si no existiera', async () => {
    await expect(obtener([]).ejecutar(operador, empresaId)).rejects.toThrow(RecursoNoEncontrado);
  });
});
