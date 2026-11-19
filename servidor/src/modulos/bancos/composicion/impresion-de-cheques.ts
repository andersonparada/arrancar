import { HistorialDeImpresiones } from '../aplicacion/casos-uso/impresion-de-cheques/historial-de-impresiones.js';
import { ImprimirCheques } from '../aplicacion/casos-uso/impresion-de-cheques/imprimir-cheques.js';
import { ReimprimirCheque } from '../aplicacion/casos-uso/impresion-de-cheques/reimprimir-cheque.js';
import { VistaPreviaDeImpresion } from '../aplicacion/casos-uso/impresion-de-cheques/vista-previa-de-impresion.js';
import { ImpresionDeChequesControlador } from '../http/impresion-de-cheques.controlador.js';
import { rutasImpresionDeCheques } from '../http/impresion-de-cheques.rutas.js';
import {
  DatosDeLaEmpresaParaChequesEnMediador,
  DetallesDelOrigenEnMediador,
} from '../infraestructura/detalles-del-origen-en-mediador.js';
import { LugarDeEmisionEnConfiguracion } from '../infraestructura/lugar-de-emision.configuracion.js';
import { ConsultasChequesDrizzle } from '../infraestructura/persistencia/consultas-cheques.drizzle.js';
import { ConsultasDeImpresionDeChequesDrizzle } from '../infraestructura/persistencia/consultas-de-impresion-de-cheques.drizzle.js';
import { RepositorioChequesDrizzle } from '../infraestructura/persistencia/repositorio-cheques.drizzle.js';
import { RepositorioDeImpresionesDeChequesDrizzle } from '../infraestructura/persistencia/repositorio-de-impresiones-de-cheques.drizzle.js';
import { RepositorioFormatosDeChequeDrizzle } from '../infraestructura/persistencia/repositorio-formatos-de-cheque.drizzle.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';

/** Raíz de composición de la impresión de cheques y su comprobante de egreso. */
export function rutasDeImpresionDeCheques() {
  const { unidadDeTrabajo, auditoria } = dependenciasCompartidas();
  const dependencias = {
    unidadDeTrabajo,
    auditoria,
    repositorio: new RepositorioChequesDrizzle(),
    consultasDeCheques: new ConsultasChequesDrizzle(),
    consultas: new ConsultasDeImpresionDeChequesDrizzle(),
    impresiones: new RepositorioDeImpresionesDeChequesDrizzle(),
    formatos: new RepositorioFormatosDeChequeDrizzle(),
    lugarDeEmision: new LugarDeEmisionEnConfiguracion(),
    empresa: new DatosDeLaEmpresaParaChequesEnMediador(),
    origen: new DetallesDelOrigenEnMediador(),
  };
  return rutasImpresionDeCheques(
    new ImpresionDeChequesControlador({
      vistaPrevia: new VistaPreviaDeImpresion(dependencias),
      imprimir: new ImprimirCheques(dependencias),
      reimprimir: new ReimprimirCheque(dependencias),
      historial: new HistorialDeImpresiones(dependencias),
    }),
  );
}
