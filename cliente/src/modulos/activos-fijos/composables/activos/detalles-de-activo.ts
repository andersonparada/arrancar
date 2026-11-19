import {
  formatearFecha,
  formatearMonto,
  formatearOpcion,
  formatearSiNo,
  formatearTexto,
} from '@/modulos/core/utilidades/formato';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Activo } from '../../servicios/activos.api';
import { OPCIONES_DE_ORIGEN, OPCIONES_DE_TENENCIA, OPCIONES_DE_TIPO } from './edicion-de-activo';

const ESTADOS: Record<Activo['estado'], string> = {
  en_construccion: 'En construcción',
  en_uso: 'En uso',
  dado_de_baja: 'Dado de baja',
};

/** Lo que muestra la tarjeta de la lista, ya con formato. */
export const detallesDeTarjeta = (activo: Activo): DetalleDeRegistro[] => [
  { etiqueta: 'Clase', valor: activo.claseNombre },
  { etiqueta: 'Localidad', valor: formatearTexto(activo.localidadNombre) },
  { etiqueta: 'Departamento', valor: formatearTexto(activo.departamentoNombre) },
  { etiqueta: 'Responsable', valor: formatearTexto(activo.responsable) },
];

/** Datos de la ubicación y del origen, para la ficha. */
const detallesDeOrigen = (activo: Activo): DetalleDeRegistro[] => [
  { etiqueta: 'Tipo', valor: formatearOpcion(OPCIONES_DE_TIPO, activo.tipoDeRegistro) },
  { etiqueta: 'Origen', valor: formatearOpcion(OPCIONES_DE_ORIGEN, activo.origen) },
  { etiqueta: 'Propietario', valor: formatearTexto(activo.propietario) },
  { etiqueta: 'Forma de tenencia', valor: formatearOpcion(OPCIONES_DE_TENENCIA, activo.formaDeTenencia) },
  { etiqueta: 'Fecha de adquisición', valor: formatearFecha(activo.fechaDeAdquisicion) },
  { etiqueta: 'Inicio de uso', valor: formatearFecha(activo.fechaDeInicioDeUso) },
];

const detallesDeUbicacion = (activo: Activo): DetalleDeRegistro[] => [
  { etiqueta: 'Localidad', valor: formatearTexto(activo.localidadNombre) },
  { etiqueta: 'Departamento', valor: formatearTexto(activo.departamentoNombre) },
  { etiqueta: 'Responsable', valor: formatearTexto(activo.responsable) },
  { etiqueta: 'En bodega de activos', valor: formatearSiNo(activo.enBodega) },
];

const detallesDelBien = (activo: Activo): DetalleDeRegistro[] => [
  { etiqueta: 'Marca', valor: formatearTexto(activo.marca) },
  { etiqueta: 'Modelo', valor: formatearTexto(activo.modelo) },
  { etiqueta: 'Número de serie', valor: formatearTexto(activo.numeroDeSerie) },
  { etiqueta: 'Placa', valor: formatearTexto(activo.placa) },
  { etiqueta: 'Cantidad', valor: String(activo.cantidad) },
];

/** Solo los edificios llevan matrícula y catastro; solo los reproductores, su valor como ganado común. */
function detallesFiscales(activo: Activo): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [];
  if (activo.valorDeMatricula !== null)
    detalles.push({ etiqueta: 'Valor de matrícula', valor: formatearMonto(activo.valorDeMatricula) });
  if (activo.valorCatastral !== null)
    detalles.push({ etiqueta: 'Valor catastral', valor: formatearMonto(activo.valorCatastral) });
  if (activo.valorComoGanadoComun !== null)
    detalles.push({ etiqueta: 'Valor como ganado común', valor: formatearMonto(activo.valorComoGanadoComun) });
  return detalles;
}

/** Los datos de la ficha del activo, ya con formato. */
export function detallesDeFicha(activo: Activo): DetalleDeRegistro[] {
  const ocio: DetalleDeRegistro[] = activo.ocioso
    ? [
        { etiqueta: 'Ocioso desde', valor: formatearFecha(activo.ociosoDesde) },
        { etiqueta: 'Motivo', valor: formatearTexto(activo.motivoDeOcio), largo: true },
      ]
    : [];
  return [
    { etiqueta: 'Clase', valor: activo.claseNombre },
    { etiqueta: 'Estado', valor: ESTADOS[activo.estado] },
    { etiqueta: 'Costo', valor: formatearMonto(activo.costo) },
    ...detallesDeOrigen(activo),
    ...detallesDeUbicacion(activo),
    ...detallesDelBien(activo),
    ...detallesFiscales(activo),
    ...ocio,
    { etiqueta: 'Observaciones', valor: formatearTexto(activo.observaciones), largo: true },
  ];
}
