import type { DependenciasCompartidas } from '../../core/compartido/aplicacion/dependencias-compartidas.js';
import { opcionesDe } from '../../core/intercambio/aplicacion/columnas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { validadorDeZod } from '../../core/intercambio/http/rutas-de-intercambio.js';
import { CrearCategoria } from '../aplicacion/casos-uso/categorias/crear-categoria.js';
import { ListarCategorias } from '../aplicacion/casos-uso/categorias/listar-categorias.js';
import { ListarTerceros } from '../aplicacion/casos-uso/terceros/listar-terceros.js';
import { RegistrarTercero } from '../aplicacion/casos-uso/terceros/registrar-tercero.js';
import type { CategoriaDto, SolicitudDeCategoria } from '../aplicacion/dto/categoria.dto.js';
import type { ConsultasCategorias } from '../aplicacion/puertos/consultas.js';
import {
  columnasDeCategorias,
  columnasDeClientes,
  columnasDeProveedores,
  NOTAS_DEL_EXCEL_DE_TERCEROS,
} from '../http/terceros.columnas.js';
import {
  esquemaFilaDeCliente,
  esquemaFilaDeProveedor,
  type FilaDeClienteSolicitada,
  type FilaDeProveedorSolicitada,
} from '../http/terceros.esquemas-excel.js';
import { esquemaCategoria } from '../http/terceros.esquemas-http.js';

interface CasosParaExcel {
  listar: ListarTerceros;
  registrar: RegistrarTercero;
  listarCategorias: ListarCategorias;
  crearCategoria: CrearCategoria;
  consultasCategorias: ConsultasCategorias;
}

/** Cada fila importada pasa por el mismo caso de uso que el formulario de alta. */
function intercambioDeClientes({ listar, registrar }: CasosParaExcel) {
  return crearIntercambio<object, FilaDeClienteSolicitada>({
    nombre: 'Clientes',
    columnas: columnasDeClientes(),
    validar: validadorDeZod(esquemaFilaDeCliente),
    notasDeInstrucciones: NOTAS_DEL_EXCEL_DE_TERCEROS,
    listar: async (operador) =>
      (await listar.ejecutar(operador, { papel: 'cliente' })).map((t) => ({ ...t, clase: t.cliente?.clase })),
    crear: (operador, { clase, ...datos }) => {
      const papel = { tipo: 'cliente', clase, activo: datos.activo, notas: null } as const;
      return registrar.ejecutar(operador, { ...datos, papel, contactos: [] });
    },
  });
}

function intercambioDeProveedores({ listar, registrar, consultasCategorias }: CasosParaExcel) {
  return crearIntercambio<object, FilaDeProveedorSolicitada>({
    nombre: 'Proveedores',
    columnas: columnasDeProveedores(opcionesDe(consultasCategorias, 'nombre')),
    validar: validadorDeZod(esquemaFilaDeProveedor),
    notasDeInstrucciones: NOTAS_DEL_EXCEL_DE_TERCEROS,
    listar: async (operador) =>
      (await listar.ejecutar(operador, { papel: 'proveedor' })).map((t) => ({
        ...t,
        categoriaNombre: t.proveedor?.categoriaNombre,
      })),
    crear: (operador, { categoriaId, ...datos }) => {
      const papel = { tipo: 'proveedor', categoriaId, activo: datos.activo, notas: null } as const;
      return registrar.ejecutar(operador, { ...datos, papel, contactos: [] });
    },
  });
}

function intercambioDeCategorias({ listarCategorias, crearCategoria }: CasosParaExcel) {
  return crearIntercambio<CategoriaDto, SolicitudDeCategoria>({
    nombre: 'Categorías de proveedor',
    columnas: columnasDeCategorias(),
    validar: validadorDeZod(esquemaCategoria),
    listar: (operador) => listarCategorias.ejecutar(operador),
    crear: (operador, solicitud) => crearCategoria.ejecutar(operador, solicitud),
  });
}

type PiezasDeTerceros = ConstructorParameters<typeof RegistrarTercero>[0] & {
  auditoria: DependenciasCompartidas['auditoria'];
  consultasCategorias: ConsultasCategorias;
};

function casosDe(piezas: PiezasDeTerceros): CasosParaExcel {
  const { unidadDeTrabajo, auditoria, categorias, consultas, consultasCategorias } = piezas;
  const deCategorias = { unidadDeTrabajo, auditoria, repositorio: categorias, consultas: consultasCategorias };
  return {
    listar: new ListarTerceros({ unidadDeTrabajo, consultas }),
    registrar: new RegistrarTercero(piezas),
    listarCategorias: new ListarCategorias(deCategorias),
    crearCategoria: new CrearCategoria(deCategorias),
    consultasCategorias,
  };
}

/** El Excel de clientes, de proveedores y de categorías de proveedor. */
export function intercambiosDeTerceros(piezas: PiezasDeTerceros) {
  const casos = casosDe(piezas);
  return {
    clientes: intercambioDeClientes(casos),
    proveedores: intercambioDeProveedores(casos),
    categorias: intercambioDeCategorias(casos),
  };
}

export type IntercambiosDeTerceros = ReturnType<typeof intercambiosDeTerceros>;
