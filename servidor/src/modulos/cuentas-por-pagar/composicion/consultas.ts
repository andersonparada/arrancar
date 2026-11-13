import type { FastifyPluginAsync } from 'fastify';
import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { ListarDocumentosPorPagar } from '../aplicacion/casos-uso/consultas/listar-documentos-por-pagar.js';
import { ListarProveedoresConDocumentos } from '../aplicacion/casos-uso/consultas/listar-proveedores-con-documentos.js';
import { ObtenerDocumentoPorPagar } from '../aplicacion/casos-uso/consultas/obtener-documento-por-pagar.js';
import { ObtenerSaldoDelProveedor } from '../aplicacion/casos-uso/consultas/obtener-saldo-del-proveedor.js';
import { VerBandeja } from '../aplicacion/casos-uso/consultas/ver-bandeja.js';
import { ConsultasControlador } from '../http/consultas.controlador.js';
import { rutasDeConsultas } from '../http/consultas.rutas.js';
import { CargaInicialEnMediador } from '../infraestructura/carga-inicial-en-mediador.js';
import { TopeDeDiferenciaEnConfiguracion } from '../infraestructura/tope-de-diferencia-en-configuracion.js';
import { ConsultasDeDocumentosDrizzle } from '../infraestructura/persistencia/consultas-de-documentos.drizzle.js';
import { ConsultasDeSaldosDrizzle } from '../infraestructura/persistencia/consultas-de-saldos.drizzle.js';

/** Raíz de composición de las consultas: bandeja, lista, ficha y saldo del proveedor (solo lectura). */
export function rutasDeConsultasComponidas(): FastifyPluginAsync {
  const { unidadDeTrabajo, reloj } = dependenciasCompartidas();
  const consultas = new ConsultasDeDocumentosDrizzle();
  const dependencias = { unidadDeTrabajo, reloj, consultas };
  const paraLaFicha = {
    ...dependencias,
    cargaInicial: new CargaInicialEnMediador(),
    topeDeDiferencia: new TopeDeDiferenciaEnConfiguracion(),
  };
  const saldos = new ConsultasDeSaldosDrizzle();
  return rutasDeConsultas(
    new ConsultasControlador({
      bandeja: new VerBandeja(dependencias),
      listar: new ListarDocumentosPorPagar(dependencias),
      obtener: new ObtenerDocumentoPorPagar(paraLaFicha),
      saldoDelProveedor: new ObtenerSaldoDelProveedor({ unidadDeTrabajo, reloj, saldos }),
      proveedores: new ListarProveedoresConDocumentos({ unidadDeTrabajo, saldos }),
    }),
  );
}
