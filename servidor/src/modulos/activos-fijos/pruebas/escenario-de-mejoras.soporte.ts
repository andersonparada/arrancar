import {
  CorrelativosEnMemoria,
  PublicadorEventosEnMemoria,
  RelojFijo,
} from '../../core/compartido/pruebas/dobles-compartidos.js';
import { AnularMejora } from '../aplicacion/casos-uso/mejoras/anular-mejora.js';
import { CambiarValorFiscalDelInmueble } from '../aplicacion/casos-uso/mejoras/cambiar-valor-fiscal.js';
import { RegistrarMejora } from '../aplicacion/casos-uso/mejoras/registrar-mejora.js';
import { RevisarEstimacion } from '../aplicacion/casos-uso/mejoras/revisar-estimacion.js';
import type { SolicitudDeMejora } from '../aplicacion/dto/mejora.dto.js';
import type { IncisoFiscal } from '../dominio/incisos-fiscales.js';
import { DescartesEnMemoria, LineasEnMemoria } from './dobles-de-costos.js';
import { HistorialEnMemoria, MejorasEnMemoria } from './dobles-de-mejoras.js';
import { armarUso, operador, uso } from './escenario-de-uso.soporte.js';

export { operador };

/** Una mejora de Q50,000.00 escrita a mano el 10 de junio de 2027; `cambios` la ajusta. */
export const solicitudDeMejora = (cambios: Partial<SolicitudDeMejora> = {}): SolicitudDeMejora => ({
  clase: 'mejora',
  fecha: '2027-06-10',
  descripcion: 'Motor nuevo',
  vidaUtilRestanteContableMeses: null,
  noEsEdificacion: false,
  lineas: [],
  costosManuales: [
    {
      claseDeCosto: 'otro',
      montoCentavos: 5_000_000,
      documentoDeSoporte: 'Factura 55',
      descripcion: null,
      aplicaAlLibroFiscal: true,
      motivoFueraDelLibroFiscal: null,
    },
  ],
  ...cambios,
});

interface OpcionesDeActivoEnUso {
  inciso?: IncisoFiscal;
  monto?: string;
  porcentaje?: string;
  datos?: Parameters<ReturnType<typeof armarUso>['activoConCosto']>[2];
}

/** Las mejoras, las revisiones y el cambio de matrícula con todo en memoria, sobre un activo puesto en uso. */
export function armarMejoras() {
  const base = armarUso();
  const mejoras = new MejorasEnMemoria(base.costos);
  const historial = new HistorialEnMemoria();
  const publicador = new PublicadorEventosEnMemoria();
  const reloj = new RelojFijo('2027-06-15');
  const lineas = new LineasEnMemoria(base.costos, new DescartesEnMemoria());
  const dependencias = {
    ...base.dependencias,
    consultas: base.activos,
    mejoras,
    consultasDeMejoras: mejoras,
    historial,
    reloj,
    lineas,
    correlativos: new CorrelativosEnMemoria(),
    publicadorEventos: publicador,
  };
  const registrar = new RegistrarMejora(dependencias);
  const anular = new AnularMejora(dependencias);

  /** Un activo en uso desde el 10 de marzo de 2027 con Q250,000.00 de costo (por omisión, el pick-up del §7.5). */
  const activoEnUso = async (opciones: OpcionesDeActivoEnUso = {}) => {
    const { inciso = 'maquinaria_y_vehiculos', monto = '250000.00', porcentaje = '20.00', datos = {} } = opciones;
    const activo = await base.activoConCosto(await base.claseDe(inciso, porcentaje), monto, datos);
    await base.poner(activo, uso());
    return activo;
  };

  return {
    ...base,
    mejoras,
    historial,
    publicador,
    reloj,
    lineas,
    activoEnUso,
    registrar: (activoId: string, solicitud = solicitudDeMejora()) =>
      registrar.ejecutar(operador, { activoId, solicitud }),
    anular: (mejoraId: string, motivo = 'Se registró por error') => anular.ejecutar(operador, { mejoraId, motivo }),
    revisarEstimacion: new RevisarEstimacion(dependencias),
    cambiarValorFiscal: new CambiarValorFiscalDelInmueble(dependencias),
    vigentes: (activoId: string) => base.tramos.vigentesConIdDeActivo(activoId),
  };
}

export type EscenarioDeMejoras = ReturnType<typeof armarMejoras>;
