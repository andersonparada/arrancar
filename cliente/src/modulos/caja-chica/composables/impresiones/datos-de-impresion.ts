import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearFechaHora, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { Arqueo } from '../../servicios/tipos-de-arqueos';
import type { Reposicion, SolicitudDeReposicion } from '../../servicios/tipos-de-reposiciones';
import type { Vale } from '../../servicios/tipos-de-vales';
import { FORMAS_DE_REPOSICION } from '../movimientos/detalles-de-movimientos';

export const FIRMAS_DE_LA_SOLICITUD = ['Presentó (custodio)', 'Revisó', 'Autorizó'];
export const FIRMAS_DE_LA_REPOSICION = ['Recibió (custodio)', 'Revisó', 'Autorizó'];
export const FIRMAS_DEL_ARQUEO = ['Arqueó', 'Custodio del fondo', 'Revisó'];
export const FIRMAS_DEL_VALE = ['Recibí el efectivo (nombre)', 'Entregó (custodio)', 'Autorizó'];

/** Los datos del encabezado de la hoja de una reposición ya registrada. */
export function datosDeLaReposicion(reposicion: Reposicion): DetalleDeRegistro[] {
  const datos: DetalleDeRegistro[] = [
    { etiqueta: 'Reposición', valor: `No. ${reposicion.numero}` },
    { etiqueta: 'Fecha', valor: formatearFecha(reposicion.fecha) },
    { etiqueta: 'Custodio', valor: reposicion.custodio },
    { etiqueta: 'Forma', valor: FORMAS_DE_REPOSICION[reposicion.forma] },
  ];
  if (reposicion.estado === 'anulada') {
    datos.push({
      etiqueta: 'Estado',
      valor: `ANULADA${reposicion.fechaDeAnulacion ? ` el ${formatearFecha(reposicion.fechaDeAnulacion)}` : ''}`,
      largo: true,
    });
  }
  return datos;
}

/** Los datos del encabezado de la solicitud: todavía no hay número ni cheque, solo lo pendiente y quién lo presenta. */
export function datosDeLaSolicitud(solicitud: SolicitudDeReposicion, hoy: Date): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Fondo', valor: solicitud.fondoNombre },
    { etiqueta: 'Custodio', valor: solicitud.custodio ?? '—' },
    { etiqueta: 'Fecha de la solicitud', valor: formatearFecha(hoy) },
  ];
}

/** Los datos del acta de arqueo: quién contó, lo contado y lo que el sistema esperaba. */
export function datosDelArqueo(arqueo: Arqueo): DetalleDeRegistro[] {
  const datos: DetalleDeRegistro[] = [
    { etiqueta: 'Arqueo', valor: `No. ${arqueo.numero}` },
    { etiqueta: 'Fecha y hora', valor: formatearFechaHora(arqueo.realizadoEn) },
    { etiqueta: 'Arqueó', valor: arqueo.arqueadoPor },
    { etiqueta: 'Custodio', valor: arqueo.custodio },
    { etiqueta: 'Monto del fondo', valor: formatearMonto(arqueo.montoDelFondo) },
    { etiqueta: 'Pendiente de reponer', valor: formatearMonto(arqueo.pendienteDeReponer) },
    { etiqueta: 'Vales provisionales abiertos', valor: formatearMonto(arqueo.valesAbiertos) },
    { etiqueta: 'Comprobantes completos', valor: arqueo.comprobantesCompletos ? 'Sí' : 'No' },
  ];
  if (arqueo.estado === 'anulado') datos.push({ etiqueta: 'Estado', valor: 'ANULADO', largo: true });
  return datos;
}

/** El cuadro del arqueo: contado más por cambiar frente a lo esperado, con la diferencia en palabras. */
export function cuadroDelArqueo(arqueo: Arqueo): DetalleDeRegistro[] {
  const diferencia = Number(arqueo.diferencia);
  const resultado =
    diferencia === 0
      ? 'Cuadra'
      : `${diferencia < 0 ? 'Faltante' : 'Sobrante'} de ${formatearMonto(Math.abs(diferencia).toFixed(2))}`;
  return [
    { etiqueta: 'Efectivo contado', valor: formatearMonto(arqueo.efectivoContado) },
    { etiqueta: 'Cheques y valores por cambiar', valor: formatearMonto(arqueo.valoresPorCambiar) },
    { etiqueta: 'El sistema esperaba', valor: formatearMonto(arqueo.efectivoEsperado) },
    { etiqueta: 'Resultado', valor: resultado },
  ];
}

/** Los datos del vale para firmar: a quién, cuánto y para qué, más cómo terminó si ya no está abierto. */
export function datosDelVale(vale: Vale): DetalleDeRegistro[] {
  const datos: DetalleDeRegistro[] = [
    { etiqueta: 'Vale provisional', valor: `No. ${vale.numero}` },
    { etiqueta: 'Fecha', valor: formatearFecha(vale.fecha) },
    { etiqueta: 'Entregado a', valor: vale.entregadoA },
    { etiqueta: 'Monto', valor: formatearMonto(vale.monto) },
    { etiqueta: 'Para', valor: vale.motivo, largo: true },
  ];
  if (vale.estado === 'liquidado') {
    datos.push({ etiqueta: 'Gastado', valor: formatearMonto(vale.gastado) });
    datos.push({ etiqueta: 'Regresó al fondo', valor: formatearMonto(vale.devuelto) });
  }
  if (vale.estado === 'anulado') datos.push({ etiqueta: 'Estado', valor: 'ANULADO', largo: true });
  return datos;
}
