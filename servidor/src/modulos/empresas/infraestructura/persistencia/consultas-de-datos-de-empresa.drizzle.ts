import { eq } from 'drizzle-orm';
import { archivos } from '../../../core/archivos/infraestructura/persistencia/archivos.tablas.js';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type {
  BalanceDeAperturaDto,
  CargaInicialDto,
  DatosDeIdentificacionDto,
  DatosFiscalesDto,
} from '../../aplicacion/dto/datos-de-empresa.dto.js';
import type { UltimoCierreDto } from '../../aplicacion/dto/historial-de-carga.dto.js';
import type { ConsultasDeDatosDeEmpresa } from '../../aplicacion/puertos/consultas-de-datos-de-empresa.js';
import { cargasIniciales } from './cargas-iniciales.tablas.js';
import { HistorialDeLaCargaDrizzle } from './historial-de-la-carga.drizzle.js';
import { datosFiscales } from './datos-fiscales.tablas.js';

type FilaDeCarga = typeof cargasIniciales.$inferSelect;

async function nombreDelUsuario(usuarioId: string | null): Promise<string | null> {
  if (!usuarioId) return null;
  const [fila] = await transaccionEnCurso()
    .select({ nombres: usuarios.nombres, apellidos: usuarios.apellidos })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId));
  return fila ? `${fila.nombres} ${fila.apellidos}`.trim() : null;
}

function cargaSinFecha(empresaId: string): CargaInicialDto {
  return {
    empresaId,
    fechaDeInicio: null,
    cerrada: false,
    cerradaEn: null,
    cerradaPor: null,
    ultimoCierre: null,
    balanceDeApertura: null,
  };
}

/** Lo del último cierre; una carga cerrada antes de que se guardara la revisión no tiene entrada y no se inventa una. */
async function ultimoCierreDe(empresaId: string, fila: FilaDeCarga): Promise<UltimoCierreDto | null> {
  if (fila.cerradaEn === null) return null;
  const guardado = await new HistorialDeLaCargaDrizzle().ultimoCierre(empresaId);
  return guardado ?? { diferencias: 0, avisos: 0, motivo: null, revisionGuardada: false };
}

async function balanceDeAperturaDe(fila: FilaDeCarga): Promise<BalanceDeAperturaDto | null> {
  if (fila.balanceDeAperturaArchivoId === null) return null;
  const [archivo] = await transaccionEnCurso()
    .select({
      tamanoBytes: archivos.tamanoBytes,
      paginas: archivos.paginas,
      sha256: archivos.sha256,
      nombreOriginal: archivos.nombreOriginal,
      subidoEn: archivos.creadoEn,
      subidoPor: archivos.subidoPor,
    })
    .from(archivos)
    .where(eq(archivos.id, fila.balanceDeAperturaArchivoId));
  if (!archivo) return null;
  const { subidoPor, ...datos } = archivo;
  return {
    ...datos,
    paginas: datos.paginas ?? 0,
    sha256: datos.sha256 ?? '',
    subidoPorNombre: await nombreDelUsuario(subidoPor),
  };
}

async function aDtoDeCarga(empresaId: string, fila: FilaDeCarga | undefined): Promise<CargaInicialDto> {
  if (!fila) return cargaSinFecha(empresaId);
  return {
    empresaId,
    fechaDeInicio: fila.fechaDeInicio,
    cerrada: fila.cerradaEn !== null,
    cerradaEn: fila.cerradaEn,
    cerradaPor: await nombreDelUsuario(fila.cerradaPor),
    ultimoCierre: await ultimoCierreDe(empresaId, fila),
    balanceDeApertura: await balanceDeAperturaDe(fila),
  };
}

async function textosFiscales(empresaId: string): Promise<Omit<DatosFiscalesDto, 'empresaId'>> {
  const [fila] = await transaccionEnCurso().select().from(datosFiscales).where(eq(datosFiscales.empresaId, empresaId));
  return { razonSocial: fila?.razonSocial ?? null, nombreComercial: fila?.nombreComercial ?? null };
}

export class ConsultasDeDatosDeEmpresaDrizzle implements ConsultasDeDatosDeEmpresa {
  async datosFiscales(empresaId: string): Promise<DatosFiscalesDto> {
    return { empresaId, ...(await textosFiscales(empresaId)) };
  }

  async cargaInicial(empresaId: string): Promise<CargaInicialDto> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(cargasIniciales)
      .where(eq(cargasIniciales.empresaId, empresaId));
    return aDtoDeCarga(empresaId, fila);
  }

  async cargaInicialBloqueandoElCierre(empresaId: string): Promise<CargaInicialDto> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(cargasIniciales)
      .where(eq(cargasIniciales.empresaId, empresaId))
      .for('share');
    return aDtoDeCarga(empresaId, fila);
  }

  async archivoDelBalanceDeApertura(empresaId: string): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ archivoId: cargasIniciales.balanceDeAperturaArchivoId })
      .from(cargasIniciales)
      .where(eq(cargasIniciales.empresaId, empresaId));
    return fila?.archivoId ?? null;
  }

  async datosDeIdentificacion(empresaId: string): Promise<DatosDeIdentificacionDto> {
    const [empresa] = await transaccionEnCurso()
      .select({ nombre: empresas.nombre, nit: empresas.nit })
      .from(empresas)
      .where(eq(empresas.id, empresaId));
    if (!empresa) throw new RecursoNoEncontrado('La empresa');
    return { ...empresa, ...(await textosFiscales(empresaId)) };
  }
}
