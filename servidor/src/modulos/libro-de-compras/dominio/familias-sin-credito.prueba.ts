import { describe, expect, it } from 'vitest';
import { configuracionDelLibroDeCompras } from '../configuracion.js';
import { calcularDocumento, type DatosParaCalcular } from './calculo-de-documento.js';
import { calcularRetenciones } from './calculador-de-retenciones.js';
import { configuracionDeRetenciones } from './configuracion-de-retenciones.js';
import { DatosFiscalesDeEmpresa } from './datos-fiscales-de-empresa.js';
import { DatosFiscalesDeProveedor, type RegimenDeIvaDeProveedor } from './datos-fiscales-de-proveedor.js';
import { MOTIVO_DE_LA_FAMILIA, type TipoDeDocumento } from './tipos-de-documento.js';

const REGIMEN_DE_LA_FAMILIA = {
  factura_pequeno_contribuyente: 'pequeno_contribuyente',
  factura_pequeno_contribuyente_electronico: 'pequeno_contribuyente_electronico',
  factura_contribuyente_agropecuario: 'contribuyente_agropecuario',
  factura_primario_pecuario: 'primario',
} as const satisfies Partial<Record<TipoDeDocumento, RegimenDeIvaDeProveedor>>;

const FAMILIAS_SIN_IVA = Object.keys(REGIMEN_DE_LA_FAMILIA) as Array<keyof typeof REGIMEN_DE_LA_FAMILIA>;
const AGENTES = ['contribuyente_especial', 'otro', 'sector_publico', 'exportador'] as const;

const predeterminados = new Map(configuracionDelLibroDeCompras.map((c) => [c.clave, c.predeterminado]));
const configuracion = configuracionDeRetenciones((clave) => predeterminados.get(clave) as number | boolean);

const datos = (cambios: Partial<DatosParaCalcular> = {}): DatosParaCalcular => ({
  tipo: 'factura',
  muestraEnReportesSat: true,
  noVinculado: false,
  empresaConCreditoFiscal: true,
  empresaConIsrSobreUtilidades: true,
  fechaDeEmision: '2025-05-15',
  fechaDeRecepcion: '2025-05-20',
  periodo: '2025-05-01',
  lineas: [{ total: 1_000_000, exento: 0 }],
  tasaDeIva: 1200,
  mesActual: '2025-05-01',
  ...cambios,
});

/** Las retenciones de la familia con una empresa que es agente de todo y un proveedor que sería sujeto de ellas. */
function retencionesDe(familia: keyof typeof REGIMEN_DE_LA_FAMILIA, agente: (typeof AGENTES)[number]) {
  return [REGIMEN_DE_LA_FAMILIA[familia], 'general' as const].flatMap((regimenIva) =>
    calcularRetenciones({
      tipo: familia,
      muestraEnReportesSat: true,
      documento: calcularDocumento(datos({ tipo: familia })),
      datosDeLineas: [{ esProductoAgropecuario: true, tipo: 'bien' }],
      empresa: DatosFiscalesDeEmpresa.crear({
        ...DatosFiscalesDeEmpresa.porOmision().instantanea(),
        agenteDeRetencionIva: agente,
        esAgenteDeRetencionIsr: true,
      }),
      proveedor: DatosFiscalesDeProveedor.porOmision({ regimenIva, regimenIsr: 'opcional_simplificado' }),
      configuracion,
    }),
  );
}

describe.each(FAMILIAS_SIN_IVA)('%s', (familia) => {
  it('lleva IVA 0, todo en la base, y el motivo de su familia', () => {
    const documento = calcularDocumento(datos({ tipo: familia }));

    expect(documento.totales).toMatchObject({ total: 1_000_000, base: 1_000_000, iva: 0, ivaNoAcreditable: 0 });
    expect(documento.motivoSinCredito).toBe(MOTIVO_DE_LA_FAMILIA[familia]);
    expect(documento.avisos).toEqual([]);
  });

  it('conserva su motivo aunque la empresa no dé crédito o la marquen como no vinculada', () => {
    const documento = calcularDocumento(datos({ tipo: familia, empresaConCreditoFiscal: false, noVinculado: true }));

    expect(documento.motivoSinCredito).toBe(MOTIVO_DE_LA_FAMILIA[familia]);
  });

  it('fuera del libro (casilla desmarcada) no lleva motivo', () => {
    expect(calcularDocumento(datos({ tipo: familia, muestraEnReportesSat: false })).motivoSinCredito).toBeNull();
  });

  it('una nota de crédito sobre su factura tampoco cobra IVA y hereda el motivo', () => {
    const nota = calcularDocumento(
      datos({
        tipo: 'nota_de_credito',
        motivoDeLaFactura: MOTIVO_DE_LA_FAMILIA[familia],
        lineas: [{ total: 100_000, exento: 0 }],
      }),
    );

    expect(nota.totales.iva).toBe(0);
    expect(nota.motivoSinCredito).toBe(MOTIVO_DE_LA_FAMILIA[familia]);
  });
});

/** El pequeño contribuyente (FPEQ/FCAP) conserva su retención del 5 %; las otras tres no retienen nada. */
describe.each(FAMILIAS_SIN_IVA.filter((familia) => familia !== 'factura_pequeno_contribuyente'))('%s', (familia) => {
  it('no se le retiene nada aunque la empresa sea agente de todo y el proveedor sea sujeto de retención', () => {
    for (const agente of AGENTES) expect(retencionesDe(familia, agente)).toEqual([]);
  });
});

describe('motivos de las familias', () => {
  it('cada familia sin IVA tiene el suyo; el electrónico comparte el de pequeño contribuyente', () => {
    expect(MOTIVO_DE_LA_FAMILIA).toEqual({
      factura_pequeno_contribuyente: 'pequeno_contribuyente',
      factura_pequeno_contribuyente_electronico: 'pequeno_contribuyente',
      factura_contribuyente_agropecuario: 'contribuyente_agropecuario',
      factura_primario_pecuario: 'primario_pecuario',
    });
  });

  it('la factura general no cambia: con IVA y sin motivo', () => {
    const documento = calcularDocumento(datos());

    expect(documento.totales.iva).toBeGreaterThan(0);
    expect(documento.motivoSinCredito).toBeNull();
  });
});
