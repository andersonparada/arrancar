import '../../core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { AnularDocumento, type GuardiaDeAnulacion } from '../aplicacion/casos-uso/movimientos/anular-documento.js';
import type { DependenciasDeRecepciones } from '../aplicacion/casos-uso/recepciones/dependencias-de-recepciones.js';
import { DescartarLinea } from '../aplicacion/casos-uso/recepciones/descartar-linea.js';
import { DevolverLineaALaBandeja } from '../aplicacion/casos-uso/recepciones/devolver-linea-a-la-bandeja.js';
import { ListarPorRecibir } from '../aplicacion/casos-uso/recepciones/listar-por-recibir.js';
import { RechazarDocumentoConRecepciones } from '../aplicacion/casos-uso/recepciones/rechazar-documento-con-recepciones.js';
import { RecibirLineas } from '../aplicacion/casos-uso/recepciones/recibir-lineas.js';
import { RegistrarDevolucionAProveedor } from '../aplicacion/casos-uso/recepciones/registrar-devolucion.js';
import { RegistrarRebajaDeCosto } from '../aplicacion/casos-uso/recepciones/registrar-rebaja.js';
import { RecepcionConDocumentosPosteriores } from '../dominio/errores-de-recepcion.js';
import { RecepcionesControlador } from '../http/recepciones.controlador.js';
import { rutasRecepciones } from '../http/recepciones.rutas.js';
import { MarcaDeInventarioEnMediador } from '../infraestructura/marca-de-inventario-en-mediador.js';
import { AlmacenDeLotesDrizzle } from '../infraestructura/persistencia/almacen-de-lotes.drizzle.js';
import { ConsultasDeRecepcionesDrizzle } from '../infraestructura/persistencia/consultas-de-recepciones.drizzle.js';
import { ConsultasPorRecibirDrizzle } from '../infraestructura/persistencia/consultas-por-recibir.drizzle.js';
import { LineasDeCompraDrizzle } from '../infraestructura/persistencia/lineas-de-compra.drizzle.js';
import { RepositorioDeDescartesDrizzle } from '../infraestructura/persistencia/repositorio-de-descartes.drizzle.js';
import { dependenciasDelKardex } from './movimientos.js';

function dependenciasDeRecepciones(): DependenciasDeRecepciones {
  return {
    ...dependenciasDelKardex(),
    lineas: new LineasDeCompraDrizzle(),
    recepciones: new ConsultasDeRecepcionesDrizzle(),
    porRecibir: new ConsultasPorRecibirDrizzle(),
    descartes: new RepositorioDeDescartesDrizzle(),
    marcas: new MarcaDeInventarioEnMediador(),
    lotes: new AlmacenDeLotesDrizzle(),
  };
}

/** Una recepción con devoluciones o rebajas vigentes no se anula: primero se anulan ellas. */
const sinDocumentosPosteriores =
  ({ recepciones }: DependenciasDeRecepciones): GuardiaDeAnulacion =>
  async (documento) => {
    const numeros = await recepciones.documentosQueDependenDe(documento.id);
    if (numeros.length > 0) throw new RecepcionConDocumentosPosteriores(numeros);
  };

/**
 * Raíz de composición de la bandeja «Por recibir», las recepciones, devoluciones y rebajas: sus rutas y los avisos del
 * libro. Inventarios escucha `documento_por_anular` y `documento_por_eliminar` (llegan a todos los módulos, no solo al
 * destino del documento) y los rechaza si el documento tiene movimientos vigentes (R-1); con el módulo inactivo el
 * mediador no lo llama.
 */
export function rutasDeRecepciones() {
  const dependencias = dependenciasDeRecepciones();
  const rechazar = new RechazarDocumentoConRecepciones(dependencias);
  mediador.escuchar('inventarios', 'libro-de-compras.documento_por_anular', (aviso, operador) =>
    rechazar.ejecutar(operador, aviso),
  );
  mediador.escuchar('inventarios', 'libro-de-compras.documento_por_eliminar', (aviso, operador) =>
    rechazar.ejecutar(operador, aviso),
  );
  return rutasRecepciones(
    new RecepcionesControlador({
      listar: new ListarPorRecibir(dependencias),
      recibir: new RecibirLineas(dependencias),
      devolver: new RegistrarDevolucionAProveedor(dependencias),
      rebajar: new RegistrarRebajaDeCosto(dependencias),
      descartar: new DescartarLinea(dependencias),
      devolverALaBandeja: new DevolverLineaALaBandeja(dependencias),
      anularRecepcion: new AnularDocumento(dependencias, 'recepcion_de_compra', sinDocumentosPosteriores(dependencias)),
      anularDevolucion: new AnularDocumento(dependencias, 'devolucion_a_proveedor'),
      anularRebaja: new AnularDocumento(dependencias, 'rebaja_de_costo'),
    }),
  );
}
