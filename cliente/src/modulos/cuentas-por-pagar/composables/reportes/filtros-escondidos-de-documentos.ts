import { formatearFecha } from '@/modulos/core/utilidades/formato';
import { OPCIONES_DE_ORIGEN, opcionesDeTipo } from '../filtros-de-documentos';
import { OPCIONES_DE_AUTORIZACION } from './filtros-de-saldos';
import { OPCIONES_DE_ESTADO_DE_PAGO, type FiltrosDeDocumentos } from './vistas-de-documentos';

const textoDe = (opciones: { valor: string; texto: string }[], valor: string): string =>
  opciones.find((opcion) => opcion.valor === valor)?.texto ?? valor;

/**
 * Lo que filtra el reporte desde «Más filtros» (que está plegado), dicho con palabras, para que quien mira solo
 * los filtros de arriba entienda por qué faltan documentos. Vacío si no hay ninguno.
 */
export function resumenDeFiltrosEscondidos(filtros: FiltrosDeDocumentos): string[] {
  const partes: [boolean, string][] = [
    [filtros.autorizacion !== 'todos', `Documentos: ${textoDe(OPCIONES_DE_AUTORIZACION, filtros.autorizacion)}`],
    [!!filtros.tipo, `Tipo: ${textoDe(opcionesDeTipo(), filtros.tipo)}`],
    [!!filtros.origen, `Origen: ${textoDe(OPCIONES_DE_ORIGEN, filtros.origen)}`],
    [!!filtros.estadoDePago, `Estado de pago: ${textoDe(OPCIONES_DE_ESTADO_DE_PAGO, filtros.estadoDePago)}`],
    [!!filtros.emitidosDesde, `Emitidos desde ${formatearFecha(filtros.emitidosDesde)}`],
    [!!filtros.emitidosHasta, `Emitidos hasta ${formatearFecha(filtros.emitidosHasta)}`],
    [!!filtros.venceHasta, `Vencen hasta ${formatearFecha(filtros.venceHasta)}`],
    [filtros.vencidos, 'Solo vencidos'],
    [filtros.sinContrasena, 'Sin contraseña'],
    [filtros.conRetencionesPorPracticar, 'Con retenciones por practicar'],
  ];
  return partes.filter(([activo]) => activo).map(([, texto]) => texto);
}
