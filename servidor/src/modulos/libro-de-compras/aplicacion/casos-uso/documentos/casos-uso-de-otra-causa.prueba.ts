import { beforeEach, describe, expect, it } from 'vitest';
import { OtraCausaSinDetalle, OtraCausaSoloEnFacturas } from '../../../dominio/errores-de-factura-anterior.js';
import { crearEscenario, operador, solicitud } from '../../../pruebas/escenario-de-documentos-en-memoria.soporte.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import { RegistrarDocumento } from './registrar-documento.js';

let e = crearEscenario();

const registrar = (cambios: Partial<SolicitudDeDocumento> = {}) =>
  new RegistrarDocumento(e.dependencias).ejecutar(operador, {
    solicitud: solicitud(cambios),
    puedeAjustarRetenciones: false,
  });

beforeEach(() => {
  e = crearEscenario();
});

describe('«otra causa» a mano en una factura', () => {
  const otraCausa = (cambios: Partial<SolicitudDeDocumento> = {}) =>
    registrar({ otraCausaSinCredito: true, observaciones: 'Factura sin los requisitos del art. 18', ...cambios });

  it('con detalle la deja sin crédito y con el IVA al costo', async () => {
    const { documento } = await otraCausa();

    expect(documento.motivoSinCredito).toBe('otra_causa_sin_credito');
    expect(documento.totales).toMatchObject({ iva: '120.00', ivaNoAcreditable: '120.00' });
  });

  it('sin detalle se rechaza', async () => {
    await expect(otraCausa({ observaciones: null })).rejects.toThrow(OtraCausaSinDetalle);
  });

  it('en una nota se rechaza: hereda el motivo de su factura', async () => {
    await expect(otraCausa({ tipo: 'nota_de_credito', documentoAfectadoId: crypto.randomUUID() })).rejects.toThrow(
      OtraCausaSoloEnFacturas,
    );
  });
});
