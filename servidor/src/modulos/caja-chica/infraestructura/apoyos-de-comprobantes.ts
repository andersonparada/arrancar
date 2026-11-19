import { and, eq, sql } from 'drizzle-orm';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { EvaluacionDeBancarizacion } from '../../core/contratos/libro-de-compras.contratos.js';
import '../../core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { conceptosDeGasto } from '../../libro-de-compras/infraestructura/persistencia/conceptos-de-gasto.tablas.js';
import type {
  BancarizacionDelLibro,
  ConceptosDeGasto,
  ConfiguracionDeComprobantes,
  PagosDeCajaChica,
  PedidoDeEvaluacion,
} from '../aplicacion/puertos/puertos-de-comprobantes.js';

const quetzalesACentavos = (quetzales: number): number => Math.round(quetzales * 100);

/** Los topes y la opción de los vales de gasto, de la configuración por niveles (empresa → instalación). */
export class ConfiguracionDeComprobantesEnConfiguracion implements ConfiguracionDeComprobantes {
  async topePorOmisionCentavos({ cuentaId, empresaId }: Operador): Promise<number> {
    const tope = await configuracion.lector.obtener<number>('caja-chica.comprobantes.tope_por_omision', {
      cuentaId,
      empresaId,
    });
    return quetzalesACentavos(tope);
  }

  async valesDeGasto({ cuentaId, empresaId }: Operador): Promise<{ permitidos: boolean; topeCentavos: number }> {
    const destino = { cuentaId, empresaId };
    const permitidos = await configuracion.lector.obtener<boolean>('caja-chica.vales_de_gasto.permitidos', destino);
    const tope = await configuracion.lector.obtener<number>('caja-chica.vales_de_gasto.tope', destino);
    return { permitidos, topeCentavos: quetzalesACentavos(tope) };
  }
}

/** Lee del libro (con su seguridad por empresa) que el concepto exista y esté activo. */
export class ConceptosDeGastoDrizzle implements ConceptosDeGasto {
  async estaActivo(conceptoId: string): Promise<boolean> {
    const filas = await transaccionEnCurso()
      .select({ id: conceptosDeGasto.id })
      .from(conceptosDeGasto)
      .where(and(eq(conceptosDeGasto.id, conceptoId), eq(conceptosDeGasto.activo, true)));
    return filas.length > 0;
  }
}

/** La bancarización de un pago en efectivo la evalúa el libro: orden `libro-de-compras.evaluar_bancarizacion`. */
export class BancarizacionDelLibroEnMediador implements BancarizacionDelLibro {
  evaluar(operador: Operador, pedido: PedidoDeEvaluacion): Promise<EvaluacionDeBancarizacion> {
    return mediador.enviar(operador, 'libro-de-compras.evaluar_bancarizacion', pedido);
  }
}

/** El último día del mes de `mes` (`AAAA-MM-01`). */
export function ultimoDiaDelMes(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(anio, numero, 0)).toISOString().slice(0, 10);
}

/**
 * Suma lo pagado por **todos** los fondos de la empresa con la función `caja_chica.pagado_en_efectivo_al_proveedor`
 * (`security definer`: la empresa sale de `app.empresa_id`, no de un parámetro, y devuelve solo el total y cuántos son).
 * Con la seguridad por alcance de cada fondo la suma saldría corta para quien no los ve todos.
 */
export class PagosDeCajaChicaEnFuncion implements PagosDeCajaChica {
  async delProveedorEnElMes(proveedorId: string, mes: string): Promise<{ totalCentavos: number; cantidad: number }> {
    const resultado = await transaccionEnCurso().execute<{ total: string; cantidad: number }>(
      sql`select total::text, cantidad from caja_chica.pagado_en_efectivo_al_proveedor(${proveedorId}::uuid, ${mes}::date, ${ultimoDiaDelMes(mes)}::date)`,
    );
    const fila = resultado.rows[0];
    return { totalCentavos: fila ? aCentavos(fila.total) : 0, cantidad: fila ? Number(fila.cantidad) : 0 };
  }
}
