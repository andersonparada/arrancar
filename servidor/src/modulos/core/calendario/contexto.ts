import { bd } from '../base-datos/conexion.js';
import type { DependenciasCompartidas } from '../compartido/aplicacion/dependencias-compartidas.js';
import { AgregarAsueto } from './aplicacion/casos-uso/agregar-asueto.js';
import { ListarFeriados } from './aplicacion/casos-uso/listar-feriados.js';
import { QuitarAsueto } from './aplicacion/casos-uso/quitar-asueto.js';
import { CalendarioLaboral } from './aplicacion/calendario-laboral.js';
import { FeriadosControlador } from './http/feriados.controlador.js';
import { rutasFeriados } from './http/feriados.rutas.js';
import { AsuetosDrizzle } from './infraestructura/persistencia/asuetos.drizzle.js';

const asuetos = new AsuetosDrizzle(bd);

/**
 * Los días hábiles de Guatemala. Es uno solo para todo el servidor (guarda en memoria lo
 * que ya leyó); los módulos lo reciben al armarse, igual que `configuracion.lector`.
 */
export const calendarioLaboral = new CalendarioLaboral(asuetos);

/** Raíz de composición del calendario: la API de feriados y asuetos. */
export function componerCalendario({ unidadDeTrabajo, auditoria }: DependenciasCompartidas) {
  const calendario = calendarioLaboral;
  const controlador = new FeriadosControlador({
    listar: new ListarFeriados({ asuetos }),
    agregar: new AgregarAsueto({ unidadDeTrabajo, asuetos, calendario }),
    quitar: new QuitarAsueto({ unidadDeTrabajo, asuetos, auditoria, calendario }),
  });
  return rutasFeriados(controlador);
}
