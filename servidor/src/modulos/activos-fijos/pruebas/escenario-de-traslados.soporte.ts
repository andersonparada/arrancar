import { AnularTraslado } from '../aplicacion/casos-uso/traslados/anular-traslado.js';
import { ObtenerBoleta } from '../aplicacion/casos-uso/traslados/obtener-boleta.js';
import { TrasladarActivos } from '../aplicacion/casos-uso/traslados/trasladar-activos.js';
import type { SolicitudDeTraslado } from '../aplicacion/dto/traslado.dto.js';
import type { Activo } from '../dominio/activo.js';
import {
  armarUso,
  DEPARTAMENTO_DEL_SUR,
  LOCALIDAD_NORTE,
  LOCALIDAD_SUR,
  operador,
  uso,
} from './escenario-de-uso.soporte.js';

export { operador };

export { LOCALIDAD_NORTE, LOCALIDAD_SUR, DEPARTAMENTO_DEL_SUR };

/** Una entrega de los renglones dados a la localidad norte el 10 de junio de 2027; `cambios` la ajusta. */
export const solicitudDeTraslado = (
  activos: readonly Activo[],
  cambios: Partial<SolicitudDeTraslado> = {},
): SolicitudDeTraslado => ({
  fecha: '2027-06-10',
  localidadId: LOCALIDAD_NORTE,
  departamentoId: null,
  responsable: 'Marta López',
  recibidoPor: 'Marta López',
  motivo: 'Entrega para su uso',
  aBodega: false,
  marcarOcioso: false,
  renglones: activos.map((activo) => ({ activoId: activo.id.valor })),
  ...cambios,
});

/** Los traslados y sus boletas con todo en memoria, sobre activos puestos en uso o todavía en construcción. */
export function armarTraslados() {
  const base = armarUso();
  const { traslados, ubicaciones, publicador, reloj } = base;
  const dependencias = {
    ...base.dependencias,
    consultas: base.activos,
    consultasDeTraslados: traslados,
  };
  const trasladar = new TrasladarActivos(dependencias);
  const anular = new AnularTraslado(dependencias);
  const boleta = new ObtenerBoleta(dependencias);

  /** Un activo del balance de la clase de maquinaria; en uso desde el 10 de marzo de 2027 si `enUso`. */
  const activo = async (opciones: { enUso?: boolean; datos?: Parameters<typeof base.activoConCosto>[2] } = {}) => {
    const { enUso = false, datos = {} } = opciones;
    const clase = await base.claseDe('maquinaria_y_vehiculos', '20.00');
    const nuevo = await base.activoConCosto(clase, '1000.00', datos);
    if (enUso) await base.poner(nuevo, uso());
    return nuevo;
  };

  return {
    ...base,
    traslados,
    ubicaciones,
    publicador,
    reloj,
    activo,
    trasladar: (solicitud: SolicitudDeTraslado) => trasladar.ejecutar(operador, solicitud),
    anular: (grupoId: string, motivo = 'Se registró por error') => anular.ejecutar(operador, { grupoId, motivo }),
    boleta: (grupoId: string) => boleta.ejecutar(operador, grupoId),
  };
}

export type EscenarioDeTraslados = ReturnType<typeof armarTraslados>;
