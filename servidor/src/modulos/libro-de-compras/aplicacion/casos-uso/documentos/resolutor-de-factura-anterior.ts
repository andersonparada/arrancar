import { aCentavos, deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { RegimenDeIva } from '../../../dominio/datos-fiscales-de-empresa.js';
import { DESTINO_DE_VISTA_PREVIA, type DestinoDeDocumento } from '../../../dominio/destinos-de-documento.js';
import {
  FacturaAnteriorConOtrosDatos,
  FacturaAnteriorEstaEnElLibro,
} from '../../../dominio/errores-de-factura-anterior.js';
import {
  normalizarFacturaAnterior,
  tienenLosMismosDatos,
  type DatosDeFacturaAnterior,
  type FacturaAnterior,
} from '../../../dominio/factura-anterior.js';
import { revisarLasFechasDeLaFacturaAnterior } from '../../../dominio/fechas-de-factura-anterior.js';
import type { FacturaAnteriorSolicitada } from '../../dto/solicitud-de-documento.js';
import type { FacturaParaNota } from '../../puertos/puertos-de-documentos.js';
import type {
  ClaveDeFacturaAnterior,
  FacturaAnteriorConNotas,
  RepositorioDeFacturasAnteriores,
} from '../../puertos/puertos-de-facturas-anteriores.js';

/** La nota que cita la factura: lo que importa para buscarla y presentarla como la factura de la nota. */
export interface NotaSobreFacturaAnterior {
  proveedorId: string;
  /** `null` en la vista previa, que no exige destino. */
  destino: DestinoDeDocumento | null;
  muestraEnReportesSat: boolean;
  fechaDeRecepcion: string;
  fechaDeInicio: string | null;
  regimenDeLaEmpresa: RegimenDeIva;
}

/** Qué se hace con la fila de la factura anterior al registrar la nota. */
export type AccionSobreLaFacturaAnterior = 'crear' | 'reutilizar' | 'corregir';

export interface FacturaAnteriorResuelta {
  /** La factura anterior presentada como la factura de la nota, con sus topes. */
  factura: FacturaParaNota;
  /** Lo que queda guardado (con su id: el de la fila que ya existía o uno nuevo). */
  guardada: FacturaAnterior;
  accion: AccionSobreLaFacturaAnterior;
  /** Cómo estaba la fila antes de corregirla; `null` en las demás acciones. */
  anterior: FacturaAnterior | null;
  /** Avisos que no bloquean (más de 4 años). */
  avisos: string[];
}

const datosDeLaSolicitud = (pedida: FacturaAnteriorSolicitada): DatosDeFacturaAnterior => ({
  tipo: pedida.tipo,
  serie: pedida.serie,
  numero: pedida.numero,
  autorizacionFel: pedida.autorizacionFel,
  fechaEmision: pedida.fechaEmision,
  total: aCentavos(pedida.total),
  iva: aCentavos(pedida.iva),
  notasDeDebitoAnterioresTotal: aCentavos(pedida.notasDeDebitoAnterioresTotal ?? '0'),
  notasDeDebitoAnterioresIva: aCentavos(pedida.notasDeDebitoAnterioresIva ?? '0'),
  motivoSinCredito: pedida.motivoSinCredito,
  detalleDelMotivo: pedida.detalleDelMotivo,
});

/** Los datos guardados que se le muestran a quien escribió otros. */
const detallesDeLosGuardados = (factura: FacturaAnterior) => ({
  serie: factura.serie,
  numero: factura.numero,
  fechaEmision: factura.fechaEmision,
  total: deCentavos(factura.total),
  iva: deCentavos(factura.iva),
});

/**
 * Qué hacer con la fila: crearla si no existe; reutilizarla si tiene los mismos datos; corregirla si tiene otros pero
 * solo notas anuladas; rechazar si otra nota vigente la cita con otros datos (o es de otro proveedor).
 */
function decidir(existente: FacturaAnteriorConNotas | null, datos: DatosDeFacturaAnterior, proveedorId: string) {
  if (!existente) {
    const guardada = { ...datos, id: crypto.randomUUID(), proveedorId };
    return { guardada, accion: 'crear' as const, anterior: null, notas: null };
  }
  const { notas, ...guardada } = existente;
  if (tienenLosMismosDatos(guardada, datos) && guardada.proveedorId === proveedorId) {
    return { guardada, accion: 'reutilizar' as const, anterior: null, notas };
  }
  if (notas.vigentes > 0 || guardada.proveedorId !== proveedorId) {
    throw new FacturaAnteriorConOtrosDatos(detallesDeLosGuardados(guardada));
  }
  return {
    guardada: { ...datos, id: guardada.id, proveedorId },
    accion: 'corregir' as const,
    anterior: guardada,
    notas,
  };
}

const SIN_NOTAS = {
  vigentes: 0,
  totalDeNotasDeCredito: 0,
  ivaDeNotasDeCredito: 0,
  totalDeNotasDeDebito: 0,
  ivaDeNotasDeDebito: 0,
};

/** La factura anterior como `FacturaParaNota`: así el cálculo y los topes no cambian (diseño §2.1). */
function comoFacturaParaLaNota(
  guardada: FacturaAnterior,
  notas: FacturaAnteriorConNotas['notas'] | null,
  nota: NotaSobreFacturaAnterior,
): FacturaParaNota {
  const { totalDeNotasDeCredito, ivaDeNotasDeCredito, totalDeNotasDeDebito, ivaDeNotasDeDebito } = notas ?? SIN_NOTAS;
  return {
    id: guardada.id,
    tipo: guardada.tipo,
    estado: 'vigente',
    proveedorId: guardada.proveedorId,
    destino: nota.destino ?? DESTINO_DE_VISTA_PREVIA,
    motivoSinCredito: guardada.motivoSinCredito,
    regimenIvaDeLaEmpresa: guardada.motivoSinCredito === null ? 'general' : nota.regimenDeLaEmpresa,
    fechaEmision: guardada.fechaEmision,
    muestraEnReportesSat: nota.muestraEnReportesSat,
    total: guardada.total,
    iva: guardada.iva,
    totalDeNotasDeCredito,
    ivaDeNotasDeCredito,
    totalDeNotasDeDebito: totalDeNotasDeDebito + guardada.notasDeDebitoAnterioresTotal,
    ivaDeNotasDeDebito: ivaDeNotasDeDebito + guardada.notasDeDebitoAnterioresIva,
  };
}

/**
 * Resuelve la factura del sistema anterior que cita una nota (diseño §4.1, reglas 2 a 6): revisa las fechas, que la
 * factura no esté en el libro, y busca (o prepara) su fila. No escribe nada: `RegistrarDocumento` la guarda.
 */
export class ResolutorDeFacturaAnterior {
  constructor(private readonly repositorio: RepositorioDeFacturasAnteriores) {}

  /**
   * @throws FacturaAnteriorSinFechaDeInicio, NotaRecibidaAntesDeLaFechaDeInicio,
   *   FacturaAnteriorPosteriorALaFechaDeInicio o FacturaAnteriorMuyAntigua según las fechas.
   * @throws FacturaAnteriorInvalida si un dato no sirve.
   * @throws FacturaAnteriorEstaEnElLibro si la factura ya está en el libro.
   * @throws FacturaAnteriorConOtrosDatos si ya existe con otros datos y tiene notas vigentes.
   */
  async resolver(
    pedida: FacturaAnteriorSolicitada,
    nota: NotaSobreFacturaAnterior,
    bloquear: boolean,
  ): Promise<FacturaAnteriorResuelta> {
    const avisos = revisarLasFechasDeLaFacturaAnterior({
      fechaDeInicio: nota.fechaDeInicio,
      fechaDeRecepcionDeLaNota: nota.fechaDeRecepcion,
      fechaDeLaFactura: pedida.fechaEmision,
    });
    const datos = normalizarFacturaAnterior(datosDeLaSolicitud(pedida));
    const clave: ClaveDeFacturaAnterior = {
      proveedorId: nota.proveedorId,
      serie: datos.serie,
      numero: datos.numero,
      autorizacionFel: datos.autorizacionFel,
    };
    const delLibro = await this.repositorio.buscarFacturaDelLibro(clave);
    if (delLibro) throw new FacturaAnteriorEstaEnElLibro(delLibro.id);
    const existente = await this.repositorio.buscar(clave, bloquear);
    const { guardada, accion, anterior, notas } = decidir(existente, datos, nota.proveedorId);
    return { factura: comoFacturaParaLaNota(guardada, notas, nota), guardada, accion, anterior, avisos };
  }
}
