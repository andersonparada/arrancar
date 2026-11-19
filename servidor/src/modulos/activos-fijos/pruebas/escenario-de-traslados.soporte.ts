import {
  CorrelativosEnMemoria,
  PublicadorEventosEnMemoria,
  RelojFijo,
} from '../../core/compartido/pruebas/dobles-compartidos.js';
import { AnularTraslado } from '../aplicacion/casos-uso/traslados/anular-traslado.js';
import { ObtenerBoleta } from '../aplicacion/casos-uso/traslados/obtener-boleta.js';
import { TrasladarActivos } from '../aplicacion/casos-uso/traslados/trasladar-activos.js';
import type { SolicitudDeTraslado } from '../aplicacion/dto/traslado.dto.js';
import type { Activo } from '../dominio/activo.js';
import { UbicacionesEnMemoria } from './dobles-de-activos.js';
import { TrasladosEnMemoria } from './dobles-de-traslados.js';
import { armarUso, operador, uso } from './escenario-de-uso.soporte.js';

export { operador };

export const LOCALIDAD_NORTE = '11111111-1111-4111-8111-111111111111';
export const LOCALIDAD_SUR = '22222222-2222-4222-8222-222222222222';
export const DEPARTAMENTO_DEL_SUR = '33333333-3333-4333-8333-333333333333';

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
  const traslados = new TrasladosEnMemoria(base.activos);
  const ubicaciones = new UbicacionesEnMemoria();
  ubicaciones.localidades.set(LOCALIDAD_NORTE, { id: LOCALIDAD_NORTE, codigo: 'N', nombre: 'Norte', activo: true });
  ubicaciones.localidades.set(LOCALIDAD_SUR, { id: LOCALIDAD_SUR, codigo: 'S', nombre: 'Sur', activo: true });
  ubicaciones.departamentos.set(DEPARTAMENTO_DEL_SUR, {
    id: DEPARTAMENTO_DEL_SUR,
    codigo: 'D',
    nombre: 'Taller',
    activo: true,
    localidadId: LOCALIDAD_SUR,
  });
  const publicador = new PublicadorEventosEnMemoria();
  const reloj = new RelojFijo('2027-06-15');
  const dependencias = {
    ...base.dependencias,
    consultas: base.activos,
    correlativos: new CorrelativosEnMemoria(),
    reloj,
    publicadorEventos: publicador,
    ubicaciones,
    traslados,
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
    traslados.registrarAlta(nuevo);
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
