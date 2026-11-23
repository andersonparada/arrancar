import { date, numeric, text, uuid } from 'drizzle-orm/pg-core';
import { archivos } from '../../../core/archivos/infraestructura/persistencia/archivos.tablas.js';
import { autoria, idPrimario, marcasDeTiempo, politicaPorEmpresa } from '../../../core/base-datos/columnas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { CategoriaDeIusi, FuenteDeValor, OrigenDeValor } from '../../dominio/tipos-de-valor-de-inmueble.js';
import { esquemaEmpresas } from './esquema.tablas.js';
import {
  llavesEIndicesDeValoresDeInmueble,
  restriccionesDeValoresDeInmueble,
} from './valores-de-inmueble.restricciones.js';

const dinero = (nombre: string) => numeric(nombre, { precision: 14, scale: 2 });

/**
 * El histórico de valores de cada inmueble, en dos series (matrícula fiscal y catastro municipal). No se edita: un
 * valor nuevo rige desde su fecha. La categoría del IUSI va con el de matrícula. Solo `politicaPorEmpresa()`: se lee
 * unido al inmueble, que lleva el alcance por localidad, y el caso de uso lo carga antes de escribir.
 */
export const valoresDeInmueble = esquemaEmpresas.table(
  'valores_de_inmueble',
  {
    id: idPrimario(),
    empresaId: uuid()
      .notNull()
      .references(() => empresas.id, { onDelete: 'cascade' }),
    inmuebleId: uuid().notNull(),
    fuente: text().$type<FuenteDeValor>().notNull(),
    vigenteDesde: date({ mode: 'string' }).notNull(),
    origen: text().$type<OrigenDeValor>().notNull(),
    valorTerreno: dinero('valor_terreno'),
    valorConstrucciones: dinero('valor_construcciones'),
    valorCultivosPermanentes: dinero('valor_cultivos_permanentes'),
    valorTotal: dinero('valor_total').notNull(),
    categoriaIusi: text().$type<CategoriaDeIusi>(),
    documento: text(),
    archivoId: uuid().references(() => archivos.id),
    ...marcasDeTiempo,
    ...autoria,
  },
  (t) => [...llavesEIndicesDeValoresDeInmueble(t), ...restriccionesDeValoresDeInmueble(t), politicaPorEmpresa()],
);
