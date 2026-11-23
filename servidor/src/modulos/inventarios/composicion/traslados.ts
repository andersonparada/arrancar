import { AnularTraslado } from '../aplicacion/casos-uso/traslados/anular-traslado.js';
import type { DependenciasDeTraslados } from '../aplicacion/casos-uso/traslados/dependencias-de-traslados.js';
import { ObtenerBoleta } from '../aplicacion/casos-uso/traslados/obtener-boleta.js';
import { RecibirTraslado } from '../aplicacion/casos-uso/traslados/recibir-traslado.js';
import { TrasladarArticulos } from '../aplicacion/casos-uso/traslados/trasladar-articulos.js';
import { TrasladosControlador } from '../http/traslados.controlador.js';
import { rutasTraslados } from '../http/traslados.rutas.js';
import { TransitoEnConfiguracion } from '../infraestructura/entorno-del-kardex.js';
import { ConsultasDeTrasladosDrizzle } from '../infraestructura/persistencia/consultas-de-traslados.drizzle.js';
import { dependenciasDelKardex } from './movimientos.js';

function dependenciasDeTraslados(): DependenciasDeTraslados {
  return {
    ...dependenciasDelKardex(),
    transito: new TransitoEnConfiguracion(),
    traslados: new ConsultasDeTrasladosDrizzle(),
  };
}

/** Raíz de composición de los traslados entre bodegas y su boleta. */
export function rutasDeTraslados() {
  const dependencias = dependenciasDeTraslados();
  return rutasTraslados(
    new TrasladosControlador({
      trasladar: new TrasladarArticulos(dependencias),
      recibir: new RecibirTraslado(dependencias),
      anular: new AnularTraslado(dependencias),
      boleta: new ObtenerBoleta(dependencias),
    }),
  );
}
