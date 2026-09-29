import { eq } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type {
  CargaInicialDto,
  DatosDeIdentificacionDto,
  DatosFiscalesDto,
} from '../../aplicacion/dto/datos-de-empresa.dto.js';
import type { ConsultasDeDatosDeEmpresa } from '../../aplicacion/puertos/consultas-de-datos-de-empresa.js';
import { cargasIniciales } from './cargas-iniciales.tablas.js';
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
  return { empresaId, fechaDeInicio: null, cerrada: false, cerradaEn: null, cerradaPor: null };
}

async function aDtoDeCarga(empresaId: string, fila: FilaDeCarga | undefined): Promise<CargaInicialDto> {
  if (!fila) return cargaSinFecha(empresaId);
  return {
    empresaId,
    fechaDeInicio: fila.fechaDeInicio,
    cerrada: fila.cerradaEn !== null,
    cerradaEn: fila.cerradaEn,
    cerradaPor: await nombreDelUsuario(fila.cerradaPor),
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

  async datosDeIdentificacion(empresaId: string): Promise<DatosDeIdentificacionDto> {
    const [empresa] = await transaccionEnCurso()
      .select({ nombre: empresas.nombre, nit: empresas.nit })
      .from(empresas)
      .where(eq(empresas.id, empresaId));
    if (!empresa) throw new RecursoNoEncontrado('La empresa');
    return { ...empresa, ...(await textosFiscales(empresaId)) };
  }
}
