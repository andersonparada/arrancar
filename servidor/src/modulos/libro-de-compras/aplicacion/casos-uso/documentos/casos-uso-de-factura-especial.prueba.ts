import { beforeEach, describe, expect, it } from 'vitest';
import { NotaSobreFacturaEspecial, VendedorNoCoincide } from '../../../dominio/errores-de-factura-especial.js';
import {
  crearEscenario,
  NIT_DEL_PROVEEDOR,
  operador,
  proveedorId,
  solicitud,
} from '../../../pruebas/escenario-de-documentos-en-memoria.soporte.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import { RegistrarDocumento } from './registrar-documento.js';

const NIT_DE_LA_EMPRESA = '12345679';
const CUI = '1234567890101';
let { proveedores, consultas, repositorio, completadorDeNit, completadorDeDpi, dependencias } = crearEscenario();

const facturaEspecial = (cambios: Partial<SolicitudDeDocumento> = {}) =>
  solicitud({
    tipo: undefined,
    tipoDte: 'FESP',
    nitEmisor: null,
    nitReceptor: NIT_DEL_PROVEEDOR,
    datosFiscalesDelProveedor: null,
    ...cambios,
  });
const registrar = (cambios: Partial<SolicitudDeDocumento> = {}) =>
  new RegistrarDocumento(dependencias).ejecutar(operador, {
    solicitud: facturaEspecial(cambios),
    puedeAjustarRetenciones: false,
  });

beforeEach(() => {
  ({ proveedores, consultas, repositorio, completadorDeNit, completadorDeDpi, dependencias } = crearEscenario());
});

describe('registrar una factura especial', () => {
  it('emite la empresa, el vendedor va en el receptor y el nombre del vendedor en el emisor', async () => {
    const { documento } = await registrar();

    expect(documento).toMatchObject({
      tipo: 'factura_especial',
      tipoDte: 'FESP',
      nitEmisor: NIT_DE_LA_EMPRESA,
      nitReceptor: NIT_DEL_PROVEEDOR,
      nombreEmisor: 'Veterinaria',
    });
    expect(completadorDeNit.llamadas).toEqual([{ proveedorId, nit: NIT_DEL_PROVEEDOR }]);
    expect(completadorDeDpi.llamadas).toEqual([]);
  });

  it('un vendedor con CUI completa el DPI del proveedor, no su NIT', async () => {
    await registrar({ nitReceptor: CUI });

    expect(completadorDeDpi.llamadas).toEqual([{ proveedorId, dpi: CUI }]);
    expect(completadorDeNit.llamadas).toEqual([]);
  });

  it('con el DPI guardado no completa nada, y con otro dato distinto la rechaza', async () => {
    proveedores.filas.set(proveedorId, { ...proveedores.filas.get(proveedorId)!, dpi: CUI });
    await registrar({ nitReceptor: CUI });
    expect(completadorDeDpi.llamadas).toEqual([]);

    await expect(registrar({ nitReceptor: NIT_DEL_PROVEEDOR, numero: '2' })).rejects.toThrow(VendedorNoCoincide);
    expect(repositorio.agregados).toHaveLength(1);
  });

  it('retiene el IVA y el ISR con la fecha de emisión y la recepción propuesta es la emisión', async () => {
    const { documento } = await registrar({ fechaEmision: '2026-09-28', fechaRecepcion: null });

    expect(documento.fechaRecepcion).toBe('2026-09-28');
    expect(documento.retenciones.map((r) => [r.regla, r.base, r.monto, r.fecha])).toEqual([
      ['iva_factura_especial', '120.00', '120.00', '2026-09-28'],
      ['isr_factura_especial', '1000.00', '50.00', '2026-09-28'],
    ]);
  });

  it('guarda al proveedor como no inscrito en el IVA cuando no tenía datos fiscales', async () => {
    await registrar();

    const datos = await dependencias.datosFiscalesDeProveedor.buscar(proveedorId);
    expect(datos?.instantanea().regimenIva).toBe('sin_inscripcion');
  });

  it('una nota de crédito sobre ella dice que se anula y se registra de nuevo', async () => {
    const { documento } = await registrar();
    consultas.facturas.set(documento.id!, {
      id: documento.id!,
      tipo: 'factura_especial',
      estado: 'vigente',
      proveedorId,
      destino: 'cuentas-por-pagar',
      fechaEmision: '2026-10-01',
      motivoSinCredito: null,
      regimenIvaDeLaEmpresa: 'general',
      iva: 12000,
      total: 112000,
      muestraEnReportesSat: true,
      totalDeNotasDeCredito: 0,
      ivaDeNotasDeCredito: 0,
      totalDeNotasDeDebito: 0,
      ivaDeNotasDeDebito: 0,
    });

    const nota = solicitud({
      tipo: 'nota_de_credito',
      documentoAfectadoId: documento.id!,
      nitEmisor: NIT_DE_LA_EMPRESA,
      numero: '9',
    });

    await expect(
      new RegistrarDocumento(dependencias).ejecutar(operador, { solicitud: nota, puedeAjustarRetenciones: false }),
    ).rejects.toThrow(NotaSobreFacturaEspecial);
  });
});
