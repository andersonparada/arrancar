import { beforeEach, describe, expect, it } from 'vitest';
import { AVISO_DE_PERIODO_PASADO } from '../../../dominio/periodo-del-libro.js';
import { crearEscenario, operador, solicitud } from '../../../pruebas/escenario-de-documentos-en-memoria.soporte.js';
import { PeriodoDeclarado } from '../../errores-de-periodos.js';
import { AnularDocumento } from './anular-documento.js';
import { EliminarDocumento } from './eliminar-documento.js';
import { PrevisualizarDocumento } from './previsualizar-documento.js';
import { RegistrarDocumento } from './registrar-documento.js';

const OCTUBRE = '2026-10-01';
const DECLARACION = { formulario: 'SAT-2237', numeroDeFormulario: '8841', fecha: '2026-10-12' };

let e = crearEscenario();
const registrar = (cambios = {}) =>
  new RegistrarDocumento(e.dependencias).ejecutar(operador, {
    solicitud: solicitud(cambios),
    puedeAjustarRetenciones: false,
  });
const previsualizar = (cambios = {}) =>
  new PrevisualizarDocumento(e.dependencias).ejecutar(operador, {
    solicitud: solicitud(cambios),
    puedeAjustarRetenciones: false,
  });
const declarar = (periodo: string, bloqueo: boolean) => {
  e.control.declarados.set(periodo, DECLARACION);
  e.control.bloqueo = bloqueo;
};

beforeEach(() => {
  e = crearEscenario();
});

describe('registrar con el período declarado', () => {
  it('con el bloqueo encendido rechaza el período pedido y propone el primer período abierto', async () => {
    declarar(OCTUBRE, true);

    const error = await registrar({ periodo: OCTUBRE }).catch((causa: unknown) => causa);

    expect(error).toBeInstanceOf(PeriodoDeclarado);
    expect((error as PeriodoDeclarado).detalles).toMatchObject({
      periodo: OCTUBRE,
      periodoPropuesto: '2026-11-01',
      propuestaEnPlazo: true,
    });
    expect(e.repositorio.agregados).toHaveLength(0);
  });

  it('sin período pedido propone el primer período abierto y lo explica en un aviso', async () => {
    declarar(OCTUBRE, true);

    const { documento, avisos } = await registrar();

    expect(documento.periodo).toBe('2026-11-01');
    expect(avisos.join(' ')).toContain('2026-10 está declarado y no admite documentos: se propone 2026-11');
  });

  it('con el bloqueo apagado registra en el período declarado y avisa con la declaración, no con el aviso genérico', async () => {
    declarar(OCTUBRE, false);

    const { documento, avisos } = await registrar({ periodo: OCTUBRE });

    expect(documento.periodo).toBe(OCTUBRE);
    expect(avisos).toContain('El período 2026-10 se declaró el 2026-10-12 (SAT-2237 nº 8841): tendrá que rectificar.');
    expect(avisos).not.toContain(AVISO_DE_PERIODO_PASADO);
  });

  it('registra con normalidad en un período abierto aunque otro esté declarado y bloqueado', async () => {
    declarar('2026-09-01', true);

    const { documento } = await registrar();

    expect(documento.periodo).toBe(OCTUBRE);
  });
});

describe('vista previa con el período declarado', () => {
  it('avisa que registrar fallaría y qué hacer, pero no bloquea', async () => {
    declarar(OCTUBRE, true);

    const { documento, avisos } = await previsualizar({ periodo: OCTUBRE });

    expect(documento.periodo).toBe(OCTUBRE);
    expect(avisos.join(' ')).toContain('El período 2026-10 está declarado y no admite documentos.');
    expect(avisos.join(' ')).toContain('Puede registrarla en 2026-11, que sigue abierto.');
  });
});

describe('anular y eliminar con el período declarado', () => {
  let documentoId = '';
  const bajas = () => ({ ...e.dependencias, repositorio: e.guardados });

  beforeEach(async () => {
    await registrar();
    const documento = e.repositorio.agregados[0]!;
    documentoId = documento.id;
    e.guardados.sembrar(documento);
  });

  it('con el bloqueo encendido no deja anular ni eliminar y no cambia nada', async () => {
    declarar(OCTUBRE, true);

    const anular = new AnularDocumento(bajas()).ejecutar(operador, {
      documentoId,
      causa: 'error_de_captura',
      motivo: 'Duplicada',
    });
    const eliminar = new EliminarDocumento(bajas()).ejecutar(operador, { documentoId });

    await expect(anular).rejects.toBeInstanceOf(PeriodoDeclarado);
    await expect(eliminar).rejects.toBeInstanceOf(PeriodoDeclarado);
    expect(e.auditoria.entradas).toHaveLength(0);
    expect(e.destinos.avisosDeAnular).toHaveLength(0);
  });

  it('con el bloqueo apagado sigue anulando y eliminando como siempre', async () => {
    declarar(OCTUBRE, false);

    const { documento } = await new AnularDocumento(bajas()).ejecutar(operador, {
      documentoId,
      causa: 'error_de_captura',
      motivo: 'Duplicada',
    });

    expect(documento.estado).toBe('anulado');
  });
});
