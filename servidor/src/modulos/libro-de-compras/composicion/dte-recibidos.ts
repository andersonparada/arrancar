import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { interpretarErrorDePostgres } from '../../core/compartido/infraestructura/errores-de-postgres.js';
import { ArmadorDeSolicitudDelDte } from '../aplicacion/casos-uso/bandeja/armador-de-solicitud-del-dte.js';
import { CompletarDteRecibidos } from '../aplicacion/casos-uso/bandeja/completar-dte-recibidos.js';
import { ConfirmadorDeFila } from '../aplicacion/casos-uso/bandeja/confirmador-de-fila.js';
import { ConfirmarDteRecibidos } from '../aplicacion/casos-uso/bandeja/confirmar-dte-recibidos.js';
import {
  DescartarDteRecibidos,
  RestaurarDteRecibido,
} from '../aplicacion/casos-uso/bandeja/descartar-y-restaurar-dte-recibidos.js';
import { ListarDteRecibidos } from '../aplicacion/casos-uso/bandeja/listar-dte-recibidos.js';
import { ObtenerSolicitudDeDte } from '../aplicacion/casos-uso/bandeja/obtener-solicitud-de-dte.js';
import { ProponedorDeDte } from '../aplicacion/casos-uso/bandeja/proponedor-de-dte.js';
import { VistaPreviaDeDteRecibidos } from '../aplicacion/casos-uso/bandeja/vista-previa-de-dte-recibidos.js';
import { GuardiaDelPeriodo } from '../aplicacion/casos-uso/documentos/guardia-del-periodo.js';
import { PrevisualizarDocumento } from '../aplicacion/casos-uso/documentos/previsualizar-documento.js';
import { RegistrarDocumento } from '../aplicacion/casos-uso/documentos/registrar-documento.js';
import { DteRecibidosControlador } from '../http/dte-recibidos.controlador.js';
import { rutasDeDteRecibidos } from '../http/dte-recibidos.rutas.js';
import { AutorizacionesRegistradasFueraDrizzle } from '../infraestructura/persistencia/autorizaciones-registradas-fuera.drizzle.js';
import { ConsultasDeLaBandejaDrizzle } from '../infraestructura/persistencia/consultas-de-la-bandeja.drizzle.js';
import { RepositorioDeDteRecibidosDrizzle } from '../infraestructura/persistencia/repositorio-de-dte-recibidos.drizzle.js';
import { RepositorioDeLotesDeDteDrizzle } from '../infraestructura/persistencia/repositorio-de-lotes-de-dte.drizzle.js';
import { CreadorDeProveedoresEnMediador } from '../infraestructura/vecinos-en-mediador.js';
import { dependenciasDeDocumentos } from './documentos.js';

type Documentos = ReturnType<typeof dependenciasDeDocumentos>;

/** Lo que comparten los casos de uso de la bandeja: sus repositorios y cómo se proponen las filas. */
function dependenciasDeLaBandeja(documentos: Documentos) {
  const { unidadDeTrabajo, auditoria } = dependenciasCompartidas();
  const consultasDeLaBandeja = new ConsultasDeLaBandejaDrizzle();
  const guardiaDelPeriodo = new GuardiaDelPeriodo(documentos);
  return {
    unidadDeTrabajo,
    auditoria,
    consultasDeLaBandeja,
    filas: new RepositorioDeDteRecibidosDrizzle(),
    autorizaciones: new AutorizacionesRegistradasFueraDrizzle(),
    armador: new ArmadorDeSolicitudDelDte(documentos),
    crearProponedor: (operador: Operador) =>
      new ProponedorDeDte({ ...documentos, consultasDeLaBandeja, guardiaDelPeriodo }, operador),
  };
}

type Bandeja = ReturnType<typeof dependenciasDeLaBandeja>;

/** El registro de cada fila es el mismo `RegistrarDocumento` del formulario. */
function confirmadorDeFila(documentos: Documentos, bandeja: Bandeja): ConfirmadorDeFila {
  return new ConfirmadorDeFila({
    ...documentos,
    ...bandeja,
    lotes: new RepositorioDeLotesDeDteDrizzle(),
    creadorDeProveedores: new CreadorDeProveedoresEnMediador(),
    registrar: new RegistrarDocumento(documentos),
  });
}

/** Raíz de composición de la bandeja de DTE recibidos: confirma con el mismo registro que usa el formulario. */
export function rutasDeDteRecibidosComponidas() {
  const documentos = dependenciasDeDocumentos();
  const bandeja = dependenciasDeLaBandeja(documentos);
  const previsualizar = new PrevisualizarDocumento(documentos);
  return rutasDeDteRecibidos(
    new DteRecibidosControlador({
      listar: new ListarDteRecibidos(bandeja),
      completar: new CompletarDteRecibidos({ ...documentos, ...bandeja }),
      vistaPrevia: new VistaPreviaDeDteRecibidos({ ...bandeja, previsualizar }),
      confirmar: new ConfirmarDteRecibidos({
        ...bandeja,
        confirmador: confirmadorDeFila(documentos, bandeja),
        interpretarError: interpretarErrorDePostgres,
      }),
      solicitud: new ObtenerSolicitudDeDte(bandeja),
      descartar: new DescartarDteRecibidos(bandeja),
      restaurar: new RestaurarDteRecibido(bandeja),
    }),
  );
}
