import { expect } from 'vitest';
import { documentoDePrueba, haceDias, type EscenarioDeDocumentos } from './escenario-de-documentos.js';

const NOMBRES = [
  ['Marta', 'Quiñonez'],
  ['Ernesto', 'Cifuentes'],
  ['Olga', 'Tzoc'],
  ['Hugo', 'Barrientos'],
  ['Silvia', 'Ixcoy'],
  ['Rodolfo', 'Mazariegos'],
  ['Carmen', 'Xicay'],
  ['Walter', 'Orellana'],
  ['Ingrid', 'Batres'],
  ['Mauricio', 'Pocasangre'],
  ['Lucia', 'Chavajay'],
  ['Teodoro', 'Samayoa'],
  ['Gladys', 'Ajanel'],
  ['Fidel', 'Monzon'],
  ['Berta', 'Coc'],
  ['Anibal', 'Villatoro'],
  ['Zoila', 'Ramirez'],
  ['Cesar', 'Tujab'],
  ['Dora', 'Lemus'],
  ['Eduardo', 'Gudiel'],
  ['Flor', 'Estrada'],
  ['Gustavo', 'Menchu'],
  ['Hilda', 'Sagastume'],
  ['Ivan', 'Revolorio'],
] as const;

/** La emisión que usan las pruebas de la factura especial: hace pocos días, dentro del período abierto. */
export const EMISION_DE_PRUEBA = haceDias(5);

/** Vendedores (personas individuales que son proveedores) y facturas especiales de prueba de un escenario. */
export class VendedoresDePrueba {
  private usados = 0;

  constructor(private readonly escenario: EscenarioDeDocumentos) {}

  /** Un proveedor persona individual, con los datos de identidad (NIT o DPI) y la sección fiscal que se pidan. */
  async nuevo(identidad: { nit?: string; dpi?: string } = {}, seccion?: Record<string, unknown>) {
    const [nombres, apellidos] = NOMBRES[this.usados]!;
    this.usados += 1;
    const tercero = await this.escenario.cuenta.propietario.post('/api/terceros', {
      tipo: 'individual',
      nombres,
      apellidos,
      papel: { tipo: 'proveedor' },
      ...(seccion ? { secciones: { 'libro-de-compras': seccion } } : {}),
      ...identidad,
    });
    expect(tercero.estado, JSON.stringify(tercero.cuerpo)).toBe(201);
    const ficha = await this.ficha(tercero.cuerpo.id);
    return {
      terceroId: tercero.cuerpo.id as string,
      proveedorId: ficha.proveedor.id as string,
      nombre: `${nombres} ${apellidos}`,
    };
  }

  async ficha(terceroId: string) {
    return (await this.escenario.cuenta.propietario.get(`/api/terceros/${terceroId}`)).cuerpo;
  }

  /** El cuerpo de una factura especial de Q5,600.00 (IVA Q600.00) emitida hace pocos días. */
  cuerpo(proveedorId: string, cambios: Record<string, unknown> = {}) {
    return documentoDePrueba(this.escenario, {
      proveedorId,
      tipoDte: 'FESP',
      nitEmisor: null,
      fechaEmision: EMISION_DE_PRUEBA,
      fechaRecepcion: null,
      lineas: [{ conceptoId: this.escenario.conceptoId, total: '5600.00' }],
      datosFiscalesDelProveedor: null,
      ...cambios,
    });
  }
}
