import { and, eq, ilike, inArray, ne, or, sql, type SQL } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  FichaDeTerceroDto,
  FiltrosDeTerceros,
  PapelDeClienteDto,
  PapelDeProveedorDto,
  TerceroDto,
  TerceroEnListadoDto,
  TerceroParecidoDto,
} from '../../aplicacion/dto/tercero.dto.js';
import type { ConsultasContactos, ConsultasTerceros, CriteriosDeParecido } from '../../aplicacion/puertos/consultas.js';
import type { TipoDePapel } from '../../dominio/papeles.js';
import { clientes } from './clientes.tablas.js';
import { proveedores } from './proveedores.tablas.js';
import { mapeadorDeTercero, type FilaTercero } from './tercero.mapeador.js';
import { terceros } from './terceros.tablas.js';

/** Qué tan parecido debe ser un nombre (0 a 1, trigramas de `pg_trgm`) para avisar de un posible duplicado. */
const SIMILITUD_MINIMA_DE_NOMBRE = 0.5;
const SEPARADORES_DE_TELEFONO = /[\s\-().]/g;

function condicionDeBusqueda(texto: string): SQL | undefined {
  const patron = `%${texto}%`;
  const digitos = texto.replace(SEPARADORES_DE_TELEFONO, '');
  return or(
    ilike(terceros.nombreMostrar, patron),
    ilike(terceros.nit, patron),
    ilike(terceros.dpi, patron),
    digitos ? ilike(terceros.telefono, `%${digitos}%`) : undefined,
  );
}

async function terceroIdsConPapel(ids: string[]): Promise<Record<TipoDePapel, Set<string>>> {
  if (ids.length === 0) return { cliente: new Set(), proveedor: new Set() };
  const tx = transaccionEnCurso();
  const [conCliente, conProveedor] = await Promise.all([
    tx.select({ id: clientes.terceroId }).from(clientes).where(inArray(clientes.terceroId, ids)),
    tx.select({ id: proveedores.terceroId }).from(proveedores).where(inArray(proveedores.terceroId, ids)),
  ]);
  const aConjunto = (filas: { id: string }[]) => new Set(filas.map((fila) => fila.id));
  return { cliente: aConjunto(conCliente), proveedor: aConjunto(conProveedor) };
}

export class ConsultasTercerosDrizzle implements ConsultasTerceros {
  constructor(private readonly contactos: ConsultasContactos) {}

  async listar(filtros: FiltrosDeTerceros): Promise<TerceroEnListadoDto[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(terceros)
      .where(
        and(
          filtros.activo === undefined ? undefined : eq(terceros.activo, filtros.activo),
          filtros.texto ? condicionDeBusqueda(filtros.texto) : undefined,
        ),
      )
      .orderBy(terceros.nombreMostrar);
    const papeles = await terceroIdsConPapel(filas.map((fila) => fila.id));
    const conPapeles = filas.map((fila) => ({
      ...mapeadorDeTercero.aDto(fila),
      papeles: { cliente: papeles.cliente.has(fila.id), proveedor: papeles.proveedor.has(fila.id) },
    }));
    const { papel } = filtros;
    return papel ? conPapeles.filter((tercero) => tercero.papeles[papel]) : conPapeles;
  }

  async obtener(terceroId: string): Promise<TerceroDto> {
    return mapeadorDeTercero.aDto(await this.filaDelTercero(terceroId));
  }

  async obtenerFicha(terceroId: string): Promise<FichaDeTerceroDto> {
    const tercero = await this.obtener(terceroId);
    const [contactos, cliente, proveedor] = await Promise.all([
      this.contactos.listarDeTercero(terceroId),
      this.papelDeCliente(terceroId),
      this.papelDeProveedor(terceroId),
    ]);
    return { ...tercero, contactos, cliente, proveedor };
  }

  async buscarParecidos(criterios: CriteriosDeParecido): Promise<TerceroParecidoDto[]> {
    const coincidencias = [
      sql`similarity(${terceros.nombreMostrar}, ${criterios.nombreMostrar}) > ${SIMILITUD_MINIMA_DE_NOMBRE}`,
      criterios.nit ? eq(terceros.nit, criterios.nit) : undefined,
      criterios.dpi ? eq(terceros.dpi, criterios.dpi) : undefined,
    ];
    return transaccionEnCurso()
      .select({ id: terceros.id, nombreMostrar: terceros.nombreMostrar, nit: terceros.nit, dpi: terceros.dpi })
      .from(terceros)
      .where(and(or(...coincidencias), criterios.excepto ? ne(terceros.id, criterios.excepto) : undefined));
  }

  async obtenerPapel(terceroId: string, tipo: TipoDePapel): Promise<PapelDeClienteDto | PapelDeProveedorDto> {
    const papel = tipo === 'cliente' ? await this.papelDeCliente(terceroId) : await this.papelDeProveedor(terceroId);
    if (!papel) throw new RecursoNoEncontrado(`El papel de ${tipo}`);
    return papel;
  }

  private async filaDelTercero(terceroId: string): Promise<FilaTercero> {
    const [fila] = await transaccionEnCurso().select().from(terceros).where(eq(terceros.id, terceroId));
    if (!fila) throw new RecursoNoEncontrado('El cliente o proveedor');
    return fila;
  }

  private async papelDeCliente(terceroId: string): Promise<PapelDeClienteDto | null> {
    const [fila] = await transaccionEnCurso().select().from(clientes).where(eq(clientes.terceroId, terceroId));
    return fila ? mapeadorDeTercero.clienteADto(fila) : null;
  }

  private async papelDeProveedor(terceroId: string): Promise<PapelDeProveedorDto | null> {
    const [fila] = await transaccionEnCurso().select().from(proveedores).where(eq(proveedores.terceroId, terceroId));
    return fila ? mapeadorDeTercero.proveedorADto(fila) : null;
  }
}
