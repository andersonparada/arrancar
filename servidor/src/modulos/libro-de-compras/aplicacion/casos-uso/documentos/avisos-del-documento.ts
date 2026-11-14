import { avisosDeRetenciones, type ContextoDeEntero } from '../../../dominio/avisos-de-retenciones.js';
import { avisosDeFechaDeInicio } from '../../../dominio/avisos-de-fecha-de-inicio.js';
import { avisosDelProveedor } from '../../../dominio/avisos-del-proveedor.js';
import { avisosDeLaFacturaEspecial } from '../../../dominio/factura-especial.js';
import { avisosDeLaFamilia } from '../../../dominio/familia-del-documento.js';
import { avisosDeConsumidorFinal } from '../../../dominio/fuera-del-libro.js';
import { avisoDeNotaDeDebitoTardiaSobreFacturaAnterior } from '../../../dominio/fechas-de-factura-anterior.js';
import { AVISO_DE_NOTA_DE_DEBITO_TARDIA, esNotaDeDebitoTardia } from '../../../dominio/plazo-de-la-nota-de-debito.js';
import { avisosDeNotaTardia } from '../../../dominio/reglas-de-notas-de-credito.js';
import { avisosDeNotaDeDebito } from '../../../dominio/reglas-de-notas-de-debito.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import type { DocumentoResuelto } from './armado-del-documento.js';
import type { ContextoFiscal } from './cargador-de-contexto-fiscal.js';
import type { FacturaAnteriorResuelta } from './resolutor-de-factura-anterior.js';

const contextoDeEntero = (contexto: ContextoFiscal): ContextoDeEntero => ({
  hoy: contexto.hoy,
  diasHabilesIva: contexto.configuracion.diasHabilesIva,
  diasHabilesIsr: contexto.configuracion.diasHabilesIsr,
  calendario: contexto.calendario,
  empresaConIsrSobreUtilidades: contexto.datosDeLaEmpresa.tieneIsrSobreUtilidades(),
  gruposEnterados: contexto.gruposEnterados,
});

/** Los avisos propios de la factura especial y de la nota de débito; los demás tipos no tienen. */
function avisosDeLaFactura(solicitud: SolicitudDeDocumento, contexto: ContextoFiscal): string[] {
  if (solicitud.tipo === 'nota_de_debito')
    return avisosDeNotaDeDebito({ empresa: contexto.datosDeLaEmpresa, claseDeCargo: solicitud.claseDeCargo });
  if (solicitud.tipo !== 'factura_especial') return [];
  return avisosDeLaFacturaEspecial({ empresa: contexto.datosDeLaEmpresa, proveedor: contexto.datosDelProveedor });
}

/** Los avisos de las fechas: el período propuesto y la emisión anterior a la fecha de inicio de la empresa. */
const avisosDeFechas = (solicitud: SolicitudDeDocumento, contexto: ContextoFiscal): string[] => [
  ...(contexto.avisoDelPeriodo ? [contexto.avisoDelPeriodo] : []),
  ...avisosDeFechaDeInicio({ fechaDeEmision: solicitud.fechaEmision, fechaDeInicio: contexto.fechaDeInicio }),
];

/**
 * Los avisos de la factura del sistema anterior: más de 4 años y, en la nota de débito emitida después de los dos
 * meses de ella, el de las dos fechas (reemplaza al genérico, que no dice cuál es la factura).
 */
function avisosDeLaFacturaAnterior(
  solicitud: SolicitudDeDocumento,
  anterior: FacturaAnteriorResuelta | null,
): string[] {
  if (!anterior) return [];
  const fecha = anterior.guardada.fechaEmision;
  const tardia = solicitud.tipo === 'nota_de_debito' && esNotaDeDebitoTardia(solicitud.fechaEmision, fecha);
  return [...anterior.avisos, ...(tardia ? [avisoDeNotaDeDebitoTardiaSobreFacturaAnterior(fecha)] : [])];
}

/** El aviso genérico de la nota de débito tardía no se repite si ya sale el que lleva la fecha de la factura. */
const sinElAvisoDeDebitoTardio = (avisos: string[], anterior: FacturaAnteriorResuelta | null): string[] =>
  anterior ? avisos.filter((aviso) => aviso !== AVISO_DE_NOTA_DE_DEBITO_TARDIA) : avisos;

/** Los avisos del cálculo y los de la factura del sistema anterior, si la nota cita una. */
const avisosDelCalculo = (solicitud: SolicitudDeDocumento, resuelto: DocumentoResuelto): string[] => [
  ...sinElAvisoDeDebitoTardio(resuelto.calculado.avisos, resuelto.anterior),
  ...avisosDeLaFacturaAnterior(solicitud, resuelto.anterior),
];

/**
 * Todos los avisos del documento, que no bloquean: período, FEL, factura especial, nota de débito, nota tardía, proveedor, retención ya practicada
 * en un documento anulado y retenciones.
 */
export function avisosDelDocumento(
  solicitud: SolicitudDeDocumento,
  contexto: ContextoFiscal,
  resuelto: DocumentoResuelto,
): string[] {
  const { factura } = resuelto;
  return [
    ...avisosDeFechas(solicitud, contexto),
    ...avisosDelCalculo(solicitud, resuelto),
    ...resuelto.lineas.avisos,
    ...resuelto.encabezado.avisos,
    ...avisosDeLaFamilia(solicitud.tipo),
    ...avisosDeLaFactura(solicitud, contexto),
    ...avisosDeConsumidorFinal(
      { motivo: solicitud.motivoFueraDelLibro, total: resuelto.calculado.totales.total },
      contexto.datosDeLaEmpresa.tieneIsrSobreUtilidades(),
    ),
    ...(factura && solicitud.tipo === 'nota_de_credito'
      ? avisosDeNotaTardia(solicitud.fechaEmision, factura.fechaEmision)
      : []),
    ...avisosDelProveedor(contexto.datosDelProveedor),
    ...resuelto.practicada.avisos,
    ...avisosDeRetenciones(resuelto.retenciones, contextoDeEntero(contexto)),
  ];
}
