import { nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { Concepto } from '../../servicios/conceptos.api';
import type { Movimiento } from '../../servicios/movimientos.api';
import { edicionDe } from './edicion-de-nota';
import { usarConceptosDeNota } from './usar-conceptos-de-nota';

const concepto = (id: string, nombre: string, extra: Partial<Concepto> = {}): Concepto => ({
  id,
  nombre,
  aplicaA: 'debito',
  actividadDeFlujo: 'operacion',
  grupoDeFlujo: null,
  esCargoBancario: false,
  pideDatosDeIntereses: false,
  admiteFactura: false,
  activo: true,
  claveDeSistema: null,
  ...extra,
});

const PAGO_A_PROVEEDORES = concepto('c-pago', 'Pago a proveedores', { claveDeSistema: 'pago_a_proveedor' });
const COMISIONES = concepto('c-comisiones', 'Comisiones bancarias');
const VIEJO = concepto('c-viejo', 'Concepto que ya no se usa', { activo: false });

vi.mock('../conceptos/usar-catalogo-de-conceptos', () => ({
  usarCatalogoDeConceptos: () => ({ conceptos: ref([PAGO_A_PROVEEDORES, COMISIONES, VIEJO]), cargando: ref(false) }),
}));
vi.mock('@/modulos/core/almacenes/sesion', () => ({
  usarSesion: () => ({ puede: () => true, config: (_clave: string, predeterminado: unknown) => predeterminado }),
}));
vi.mock('../../servicios/sugerencias.api', () => ({ apiSugerencias: { paraNota: () => Promise.resolve(null) } }));

const notaDeDebito = (conceptoId: string): Movimiento =>
  ({
    id: 'n-1',
    cuentaBancariaId: 'cuenta-1',
    tipo: 'debito',
    fecha: '2026-11-18',
    monto: '800.00',
    conceptoId,
    referencia: null,
    beneficiario: 'Anticipo marcado',
    observaciones: null,
    interesBruto: null,
    isrRetenido: null,
  }) as unknown as Movimiento;

/** La ventana de la nota ya construida (cerrada, como queda al cargar la lista) y luego abierta para corregir una. */
async function abrirParaCorregir(nota: Movimiento) {
  const edicion = ref(edicionDe());
  const conceptoGuardado = ref<string | null>(null);
  const { opcionesDeConceptos } = usarConceptosDeNota(edicion, conceptoGuardado);
  await nextTick();
  edicion.value = edicionDe(nota);
  conceptoGuardado.value = nota.conceptoId;
  await nextTick();
  await nextTick();
  return { edicion, opcionesDeConceptos };
}

describe('el concepto al abrir la corrección de una nota (QA intermedia 2026-11-18)', () => {
  it('conserva el concepto de una nota corriente', async () => {
    const { edicion } = await abrirParaCorregir(notaDeDebito(COMISIONES.id));

    expect(edicion.value.conceptoId).toBe(COMISIONES.id);
  });

  it('ofrece, además, el concepto guardado aunque sea de sistema o esté inactivo', async () => {
    const { opcionesDeConceptos } = await abrirParaCorregir(notaDeDebito(PAGO_A_PROVEEDORES.id));

    expect(opcionesDeConceptos.value.map((opcion) => opcion.valor)).toContain(PAGO_A_PROVEEDORES.id);
  });

  it('no borra el concepto de sistema de una nota marcada al abrirla', async () => {
    const { edicion } = await abrirParaCorregir(notaDeDebito(PAGO_A_PROVEEDORES.id));

    expect(edicion.value.conceptoId).toBe(PAGO_A_PROVEEDORES.id);
  });

  it('no borra un concepto que ya está inactivo al abrir la nota', async () => {
    const { edicion } = await abrirParaCorregir(notaDeDebito(VIEJO.id));

    expect(edicion.value.conceptoId).toBe(VIEJO.id);
  });
});
