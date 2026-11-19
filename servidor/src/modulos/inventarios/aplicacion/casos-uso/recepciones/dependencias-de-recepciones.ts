import type { AlmacenDeLotes } from '../../puertos/almacen-de-lotes.js';
import type { ConsultasDeRecepciones } from '../../puertos/consultas-de-recepciones.js';
import type { ConsultasPorRecibir } from '../../puertos/consultas-por-recibir.js';
import type { LineasDeCompra } from '../../puertos/lineas-de-compra.js';
import type { MarcaDeInventarioEnElLibro } from '../../puertos/marca-de-inventario-en-el-libro.js';
import type { RepositorioDeDescartes } from '../../puertos/repositorio-de-descartes.js';
import type { DependenciasDelKardex } from '../../kardex/dependencias-del-kardex.js';

/** Lo que usan los casos de uso de la bandeja «Por recibir», las recepciones, devoluciones, rebajas y descartes. */
export interface DependenciasDeRecepciones extends DependenciasDelKardex {
  lineas: LineasDeCompra;
  recepciones: ConsultasDeRecepciones;
  porRecibir: ConsultasPorRecibir;
  descartes: RepositorioDeDescartes;
  marcas: MarcaDeInventarioEnElLibro;
  lotes: AlmacenDeLotes;
}
