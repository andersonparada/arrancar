import { beforeEach, describe, expect, it } from 'vitest';
import { BajaInvalida } from '../../../dominio/errores-de-baja.js';
import { armarBajas, solicitudDeVenta, type EscenarioDeBajas } from '../../../pruebas/escenario-de-bajas.soporte.js';

let e: EscenarioDeBajas;

beforeEach(() => {
  e = armarBajas();
});

const SIMPLIFICADO = {
  tipoDePersona: 'individual',
  regimenDeIva: 'general',
  regimenDeIsr: 'opcional_simplificado',
  llevaContabilidadCompleta: false,
} as const;
const PEQUENO = {
  tipoDePersona: 'individual',
  regimenDeIva: 'pequeno_contribuyente',
  regimenDeIsr: null,
  llevaContabilidadCompleta: false,
} as const;

/** Un taladro de Q800.00 con su documento de compra, bien de control. */
async function taladro(monto: string | null = '800.00') {
  const clase = await e.claseDe('herramientas', '25.00');
  return e.activoConCosto(clase, monto, { tipoDeRegistro: 'bien_de_control' });
}

const codigos = (avisos: { codigo: string }[]) => avisos.map((aviso) => aviso.codigo);

describe('venta de un bien de control', () => {
  it('la sociedad vende con valor en libros cero, costo fiscal cero y todo el precio como resultado', async () => {
    const venta = await e.vender(solicitudDeVenta(await taladro()));

    expect(venta).toMatchObject({
      causa: 'venta',
      costo: '0.00',
      valorEnLibros: '0.00',
      costoFiscal: '0.00',
      resultadoContable: '100000.00',
      resultadoFiscal: '100000.00',
      origenDelCostoFiscal: 'en_libros',
      motivoDelCostoFiscal: null,
    });
    expect(codigos(venta.avisos)).toEqual(['sin_acta', 'venta_con_iva', 'isr_de_venta_de_control']);
    expect(e.publicador.nombres()).toEqual(['activos-fijos.activo_vendido']);
    expect(e.publicador.publicados[0]!.datos).toMatchObject({
      resultadoContableCentavos: 10000000,
      resultadoFiscalCentavos: 10000000,
    });
  });

  it('el opcional simplificado sin contabilidad completa sostiene el costo documentado', async () => {
    e.bajas.datosFiscales = SIMPLIFICADO;

    const venta = await e.vender(solicitudDeVenta(await taladro()));

    expect(venta).toMatchObject({
      valorEnLibros: '0.00',
      costoFiscal: '800.00',
      resultadoContable: '100000.00',
      resultadoFiscal: '99200.00',
      origenDelCostoFiscal: 'documentado',
    });
  });

  it('la sociedad en el opcional simplificado que lleva contabilidad completa queda en cero aunque tenga documento', async () => {
    e.bajas.datosFiscales = { ...SIMPLIFICADO, tipoDePersona: 'juridica', llevaContabilidadCompleta: true };

    const venta = await e.vender(solicitudDeVenta(await taladro()));

    expect(venta).toMatchObject({ costoFiscal: '0.00', origenDelCostoFiscal: 'en_libros' });
  });

  it('el pequeño contribuyente sostiene el costo documentado y su aviso de IVA es el suyo', async () => {
    e.bajas.datosFiscales = PEQUENO;
    const solicitud = solicitudDeVenta(await taladro());

    const venta = await e.vender({ ...solicitud, venta: { ...solicitud.venta!, iva: '0.00' } });

    expect(venta).toMatchObject({ iva: '0.00', costoFiscal: '800.00', origenDelCostoFiscal: 'documentado' });
    expect(venta.avisos.find((aviso) => aviso.codigo === 'venta_con_iva')!.mensaje).toContain('pequeño contribuyente');
  });

  it('sin documento de compra el costo fiscal es cero y avisa', async () => {
    e.bajas.datosFiscales = SIMPLIFICADO;

    const venta = await e.vender(solicitudDeVenta(await taladro(null)));

    expect(venta).toMatchObject({
      costoFiscal: '0.00',
      resultadoFiscal: '100000.00',
      origenDelCostoFiscal: 'sin_documento',
    });
    expect(codigos(venta.avisos)).toContain('costo_fiscal_sin_documento');
  });

  it('una venta por menos del costo documentado es pérdida de capital', async () => {
    e.bajas.datosFiscales = SIMPLIFICADO;
    const caro = await taladro('5000.00');
    const solicitud = solicitudDeVenta(caro);

    const venta = await e.vender({ ...solicitud, venta: { ...solicitud.venta!, precio: '3000.00', iva: '360.00' } });

    expect(venta.resultadoFiscal).toBe('-2000.00');
    expect(codigos(venta.avisos)).toContain('perdida_de_capital');
  });

  it('el contador sostiene otro costo con su motivo y queda en la auditoría con lo que daba la regla', async () => {
    const solicitud = solicitudDeVenta(await taladro());

    const venta = await e.vender({ ...solicitud, costoFiscalDelContador: { monto: '800.00', motivo: 'Factura 123' } });

    expect(venta).toMatchObject({
      costoFiscal: '800.00',
      resultadoFiscal: '99200.00',
      origenDelCostoFiscal: 'criterio_del_contador',
      motivoDelCostoFiscal: 'Factura 123',
    });
    expect(codigos(venta.avisos)).toContain('costo_sostenido_por_el_contador');
    expect(e.auditoria.entradas).toMatchObject([
      {
        recurso: 'activos-fijos.bajas',
        accion: 'corregir',
        motivo: 'Factura 123',
        anterior: { costoFiscalSegunLaRegla: '0.00', origenSegunLaRegla: 'en_libros', costoFiscalSostenido: '800.00' },
      },
    ]);
  });

  it('el costo del contador sin motivo o negativo no registra la venta', async () => {
    const solicitud = solicitudDeVenta(await taladro());

    await expect(
      e.vender({ ...solicitud, costoFiscalDelContador: { monto: '800.00', motivo: ' ' } }),
    ).rejects.toBeInstanceOf(BajaInvalida);
    await expect(
      e.vender({ ...solicitud, costoFiscalDelContador: { monto: '-1.00', motivo: 'Factura' } }),
    ).rejects.toBeInstanceOf(BajaInvalida);
    expect(e.bajas.registros.size).toBe(0);
  });

  it('el costo del contador solo vale al vender un bien de control', async () => {
    const camioneta = await e.activoEnUso();
    const costoFiscalDelContador = { monto: '800.00', motivo: 'Factura 123' };

    await expect(e.vender({ ...solicitudDeVenta(camioneta), costoFiscalDelContador })).rejects.toBeInstanceOf(
      BajaInvalida,
    );
    expect(e.bajas.registros.size).toBe(0);
  });

  it('la venta de un activo con libros guarda que su costo fiscal sale de ellos', async () => {
    const venta = await e.vender(solicitudDeVenta(await e.activoEnUso()));

    expect(venta).toMatchObject({ origenDelCostoFiscal: 'en_libros', motivoDelCostoFiscal: null });
  });

  it('una baja sin venta no guarda origen del costo fiscal', async () => {
    const baja = await e.darDeBaja({ ...solicitudDeVenta(await taladro()), causa: 'destruccion', venta: null });

    expect(baja).toMatchObject({ origenDelCostoFiscal: null, costoFiscal: '0.00' });
  });

  it('el pequeño contribuyente no puede escribir IVA: el error cae en el campo venta.iva', async () => {
    e.bajas.datosFiscales = PEQUENO;
    const solicitud = solicitudDeVenta(await taladro());

    const error = await e.vender(solicitud).catch((falla: unknown) => falla);

    expect(error).toBeInstanceOf(BajaInvalida);
    expect((error as BajaInvalida).detalles).toMatchObject([{ campo: 'venta.iva' }]);
    expect(e.bajas.registros.size).toBe(0);
  });

  it('un principal de control con un componente con libros se vende: el precio es del componente', async () => {
    e.bajas.datosFiscales = SIMPLIFICADO;
    const principal = await taladro();
    const clase = await e.claseDe('maquinaria_y_vehiculos', '20.00');
    const hijo = await e.activoConCosto(clase, '5000.00', { activoPadreId: principal.id.valor });
    await e.poner(hijo);

    const venta = await e.vender(solicitudDeVenta(principal));

    const registros = [...e.bajas.registros.values()].map((baja) => baja.instantanea());
    const delPrincipal = registros.find((baja) => baja.activoId === principal.id.valor)!;
    const delHijo = registros.find((baja) => baja.activoId === hijo.id.valor)!;
    expect(delPrincipal).toMatchObject({ causa: 'otra', venta: null, cifras: { costoFiscalCentavos: 0 } });
    expect(delHijo.venta).toMatchObject({ precioCentavos: 10000000 });
    expect(venta.componentes).toHaveLength(1);
  });
});
