import { beforeEach, describe, expect, it } from 'vitest';
import {
  DocumentoConConstancia,
  DocumentoConRetencionEnterada,
} from '../../../dominio/retenciones/errores-de-retenciones.js';
import { crearEscenario, operador, solicitud } from '../../../pruebas/escenario-de-documentos-en-memoria.soporte.js';
import { AnularDocumento } from './anular-documento.js';
import { EliminarDocumento } from './eliminar-documento.js';
import { RegistrarDocumento } from './registrar-documento.js';

let e = crearEscenario();
let documentoId = '';
const bajas = () => ({ ...e.dependencias, repositorio: e.guardados });
const anular = () =>
  new AnularDocumento(bajas()).ejecutar(operador, { documentoId, causa: 'error_de_captura', motivo: 'Error' });
const eliminar = () => new EliminarDocumento(bajas()).ejecutar(operador, { documentoId });

/** El documento retuvo 15.00 de IVA en septiembre, con o sin constancia. */
const retenerEnSeptiembre = (conConstancia: boolean) =>
  e.retenciones.porDocumento.set(documentoId, [
    { regla: 'iva_contribuyente_especial', fecha: '2026-09-10', monto: 1500, conConstancia },
  ]);

beforeEach(async () => {
  e = crearEscenario();
  await new RegistrarDocumento(e.dependencias).ejecutar(operador, {
    solicitud: solicitud(),
    puedeAjustarRetenciones: false,
  });
  const documento = e.repositorio.agregados[0]!;
  documentoId = documento.id;
  e.guardados.sembrar(documento);
});

describe('anular un documento con retenciones', () => {
  it('deja sus retenciones por resolver y avisa cuántas son', async () => {
    retenerEnSeptiembre(false);

    const { avisos } = await anular();

    expect(avisos).toEqual([expect.stringContaining('Queda 1 retención por resolver')]);
    expect(e.retenciones.dejadasPorResolver).toEqual([documentoId]);
  });

  it('si el mes y grupo ya se enteró, avisa que hay que rectificar', async () => {
    retenerEnSeptiembre(false);
    e.enteros.agregarVigente('2026-09-01', 'iva_agentes');

    const { avisos } = await anular();

    expect(avisos).toContain('Ese mes ya se enteró: rectifique el entero.');
  });

  it('un pago de otro grupo no cuenta como entero', async () => {
    retenerEnSeptiembre(false);
    e.enteros.agregarVigente('2026-09-01', 'isr_opcional');

    const { avisos } = await anular();

    expect(avisos).toHaveLength(1);
  });

  it('sin retenciones con monto no deja nada por resolver ni avisa', async () => {
    const { avisos } = await anular();

    expect(avisos).toEqual([]);
    expect(e.retenciones.dejadasPorResolver).toEqual([]);
  });
});

describe('eliminar un documento con retenciones', () => {
  it('queda bloqueado si una retención tiene constancia: solo se anula', async () => {
    retenerEnSeptiembre(true);

    await expect(eliminar()).rejects.toBeInstanceOf(DocumentoConConstancia);

    expect(e.guardados.eliminados).toEqual([]);
    expect(e.auditoria.entradas).toEqual([]);
    expect(e.destinos.avisosDeEliminar).toEqual([]);
  });

  it('queda bloqueado si el mes y grupo de una retención ya tiene un entero', async () => {
    retenerEnSeptiembre(false);
    e.enteros.agregarVigente('2026-09-01', 'iva_agentes');

    await expect(eliminar()).rejects.toBeInstanceOf(DocumentoConRetencionEnterada);
  });

  it('sin constancia ni entero se elimina como siempre', async () => {
    retenerEnSeptiembre(false);

    await eliminar();

    expect(e.guardados.eliminados).toEqual([documentoId]);
  });
});
