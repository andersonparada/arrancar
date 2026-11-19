import { RelojFijo, UnidadDeTrabajoEnMemoria } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { Arqueo } from '../../../dominio/arqueos.js';
import type { Comprobante } from '../../../dominio/comprobantes.js';
import type { Reposicion } from '../../../dominio/reposiciones.js';
import type { ComprobanteDeReporte, LecturasDeReportesDeCajaChica } from '../../puertos/puertos-de-reportes.js';
import type { DependenciasDeReportes } from './reportes-de-comprobantes.js';

export const comprobante = (cambios: Partial<Comprobante>): Comprobante => ({
  id: 'c1',
  fondoId: 'f1',
  clase: 'documento',
  estado: 'vigente',
  fecha: '2026-10-10',
  montoCentavos: 10_000,
  resta: false,
  esNotaDeCredito: false,
  documentoDeCompraId: 'd1',
  documentoAfectadoId: null,
  proveedorId: 'p1',
  conRetencion: false,
  montoRetenidoCentavos: 0,
  motivoConRetencion: null,
  conActivoFijo: false,
  sobreElTope: false,
  motivoSobreElTope: null,
  sinBancarizar: false,
  valeProvisionalId: null,
  destinoDelFaltante: null,
  numero: null,
  anioDeNumero: 0,
  descripcion: null,
  pagadoA: null,
  conceptoDeGastoId: null,
  motivoSinDocumento: null,
  asignadoEn: null,
  asignadoPor: null,
  motivoDeAnulacion: null,
  reposicionNumero: null,
  documento: {
    tipo: 'FACT',
    serie: 'A',
    numero: '12',
    proveedorNombre: 'Veterinaria El Quiroa',
    fechaEmision: '2026-10-10',
    totalCentavos: 10_000,
    enElLibro: true,
    motivoFueraDelLibro: null,
  },
  ...cambios,
});

export const deReporte = (
  cambios: Partial<Comprobante>,
  concepto = 'Medicinas',
  fondoNombre = 'Fondo Central',
): ComprobanteDeReporte => ({ comprobante: comprobante(cambios), fondoNombre, concepto });

export const vale = (cambios: Partial<Comprobante> = {}) =>
  deReporte(
    {
      id: 'v1',
      clase: 'vale_de_gasto',
      documento: null,
      documentoDeCompraId: null,
      numero: 5,
      pagadoA: 'Pedro López',
      motivoSinDocumento: 'El peaje no da factura',
      montoCentavos: 5_000,
      ...cambios,
    },
    'Peajes',
  );

export const lecturas = (parcial: Partial<LecturasDeReportesDeCajaChica>): LecturasDeReportesDeCajaChica => ({
  pendientesAlCorte: async () => [],
  reposicionesDelPeriodo: async () => [],
  sinDocumentoFiscal: async () => [],
  fondosAlCorte: async () => [],
  arqueosDelPeriodo: async () => [],
  ...parcial,
});

export const dependencias = (parcial: Partial<LecturasDeReportesDeCajaChica>): DependenciasDeReportes => ({
  unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
  reloj: new RelojFijo('2026-10-20'),
  zonaHoraria: { zonaHoraria: async () => 'America/Guatemala' },
  lecturas: lecturas(parcial),
});

export const reposicion = (cambios: Partial<Reposicion> = {}): Reposicion => ({
  id: 'r1',
  fondoId: 'f1',
  numero: 3,
  anioDeNumero: 0,
  fecha: '2026-10-15',
  forma: 'cheque',
  montoCentavos: 12_500,
  movimientoId: 'm1',
  custodio: 'Juan Pérez',
  laHizoElCustodio: false,
  estado: 'vigente',
  fechaDeAnulacion: null,
  motivoDeAnulacion: null,
  ...cambios,
});

export const arqueo = (cambios: Partial<Arqueo>): Arqueo => ({
  id: 'a1',
  fondoId: 'f1',
  numero: 1,
  anioDeNumero: 0,
  realizadoEn: '2026-10-18T15:00:00Z',
  arqueadoPor: 'u1',
  custodio: 'Juan Pérez',
  custodioUsuarioId: null,
  loHizoElCustodio: false,
  conteo: [],
  efectivoContadoCentavos: 100_000,
  valoresPorCambiarCentavos: 0,
  montoDelFondoCentavos: 100_000,
  pendienteDeReponerCentavos: 0,
  valesAbiertosCentavos: 0,
  efectivoEsperadoCentavos: 100_000,
  diferenciaCentavos: 0,
  comprobantesCompletos: true,
  motivoDeDiferencia: null,
  observaciones: null,
  estado: 'vigente',
  fechaDeAnulacion: null,
  motivoDeAnulacion: null,
  ...cambios,
});
