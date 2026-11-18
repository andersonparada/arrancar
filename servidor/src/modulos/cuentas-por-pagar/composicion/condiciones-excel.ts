import type { FastifyPluginAsync } from 'fastify';
import type { UnidadDeTrabajo } from '../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { ImportarPlazoDeProveedor } from '../aplicacion/casos-uso/condiciones/importar-plazo-de-proveedor.js';
import { ListarPlazosDeProveedores } from '../aplicacion/casos-uso/condiciones/listar-plazos-de-proveedores.js';
import type { GuardarCondicionesDeProveedor } from '../aplicacion/casos-uso/condiciones/guardar-condiciones-de-proveedor.js';
import type { PlazoDeProveedorDto } from '../aplicacion/dto/plazo-de-proveedor.dto.js';
import {
  columnasDePlazos,
  esquemaDePlazoEnExcel,
  NOTAS_DE_PLAZOS,
  type PlazoEnExcel,
} from '../http/condiciones.columnas.js';
import { rutasDeExcelDePlazos } from '../http/condiciones.excel.rutas.js';
import { rutasDeListaDePlazos } from '../http/condiciones.lista.rutas.js';
import { ProveedoresDeLosPlazosDrizzle } from '../infraestructura/persistencia/proveedores-de-los-plazos.drizzle.js';

/** El Excel «Plazos de proveedores»: cada fila pasa por el mismo guardado del formulario, sin crear proveedores. */
export function intercambioDePlazos(casos: { listar: ListarPlazosDeProveedores; importar: ImportarPlazoDeProveedor }) {
  return crearIntercambio<PlazoDeProveedorDto, PlazoEnExcel>({
    nombre: 'Plazos de proveedores',
    columnas: columnasDePlazos(),
    notasDeInstrucciones: NOTAS_DE_PLAZOS,
    validar: validadorDeZod(esquemaDePlazoEnExcel),
    listar: (operador) => casos.listar.ejecutar(operador),
    crear: (operador, { nit, proveedorNombre, diasDeCredito, contarDesdeLaRecepcion }) =>
      casos.importar.ejecutar(
        operador,
        { nit, proveedorNombre },
        { diasDeCredito: diasDeCredito ?? null, contarDesdeLaRecepcion: contarDesdeLaRecepcion ?? false },
      ),
  });
}

/** Las rutas del Excel «Plazos de proveedores», con sus casos de uso armados. */
export function excelDePlazos(dependencias: {
  unidadDeTrabajo: UnidadDeTrabajo;
  guardar: GuardarCondicionesDeProveedor;
}): FastifyPluginAsync {
  const proveedores = new ProveedoresDeLosPlazosDrizzle();
  const { unidadDeTrabajo, guardar } = dependencias;
  const listar = new ListarPlazosDeProveedores({ unidadDeTrabajo, proveedores });
  const excel = rutasDeExcelDePlazos(
    intercambioDePlazos({
      listar,
      importar: new ImportarPlazoDeProveedor({ unidadDeTrabajo, proveedores, guardar }),
    }),
  );
  const lista = rutasDeListaDePlazos(listar);
  return async (app) => {
    await app.register(lista);
    await app.register(excel);
  };
}
