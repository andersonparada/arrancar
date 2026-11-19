import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { ActualizarFormatoDeCheque } from '../aplicacion/casos-uso/formatos-de-cheque/actualizar-formato-de-cheque.js';
import { ArmarPruebaDeAlineacion } from '../aplicacion/casos-uso/formatos-de-cheque/armar-prueba-de-alineacion.js';
import { CambiarEstadoDeFormatoDeCheque } from '../aplicacion/casos-uso/formatos-de-cheque/cambiar-estado-de-formato-de-cheque.js';
import {
  ListarFormatosDeCheque,
  ListarPlantillasDeCheque,
  ObtenerFormatoDeCheque,
} from '../aplicacion/casos-uso/formatos-de-cheque/consultar-formatos-de-cheque.js';
import { CrearFormatoDeCheque } from '../aplicacion/casos-uso/formatos-de-cheque/crear-formato-de-cheque.js';
import { EliminarFormatoDeCheque } from '../aplicacion/casos-uso/formatos-de-cheque/eliminar-formato-de-cheque.js';
import { MarcarFormatoDeChequeProbado } from '../aplicacion/casos-uso/formatos-de-cheque/marcar-formato-de-cheque-probado.js';
import { FormatosDeChequeControlador } from '../http/formatos-de-cheque.controlador.js';
import { rutasFormatosDeCheque } from '../http/formatos-de-cheque.rutas.js';
import { LugarDeEmisionEnConfiguracion } from '../infraestructura/lugar-de-emision.configuracion.js';
import { ConsultasFormatosDeChequeDrizzle } from '../infraestructura/persistencia/consultas-formatos-de-cheque.drizzle.js';
import { RepositorioFormatosDeChequeDrizzle } from '../infraestructura/persistencia/repositorio-formatos-de-cheque.drizzle.js';

/** Las dependencias de los casos de uso de formatos de cheque; también las usa la impresión. */
export function dependenciasDeFormatosDeCheque() {
  const { unidadDeTrabajo, auditoria, reloj } = dependenciasCompartidas();
  return {
    unidadDeTrabajo,
    auditoria,
    reloj,
    repositorio: new RepositorioFormatosDeChequeDrizzle(),
    consultas: new ConsultasFormatosDeChequeDrizzle(),
    lugarDeEmision: new LugarDeEmisionEnConfiguracion(),
  };
}

/** Raíz de composición de los formatos de cheque: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeFormatosDeCheque() {
  const dependencias = dependenciasDeFormatosDeCheque();
  return rutasFormatosDeCheque(
    new FormatosDeChequeControlador({
      listar: new ListarFormatosDeCheque(dependencias),
      obtener: new ObtenerFormatoDeCheque(dependencias),
      crear: new CrearFormatoDeCheque(dependencias),
      actualizar: new ActualizarFormatoDeCheque(dependencias),
      cambiarEstado: new CambiarEstadoDeFormatoDeCheque(dependencias),
      eliminar: new EliminarFormatoDeCheque(dependencias),
      marcarProbado: new MarcarFormatoDeChequeProbado(dependencias),
      plantillas: new ListarPlantillasDeCheque(),
      prueba: new ArmarPruebaDeAlineacion(dependencias),
    }),
  );
}
