# Dónde quedamos

Última sesión: **2026-09-28**. Este archivo se reescribe al final de cada sesión.

## Hecho en esta sesión (en `main`)

- **Bancos B6**: Notas y Transferencias con pantalla propia (Operación);
  Movimientos pasó a **reporte** (saldo anterior, corrido y final; imprimir y
  exportar con filtros); el **saldo inicial** se captura en la ficha de la cuenta y
  se importa/exporta desde Cuentas bancarias. Migración de permisos de roles.
- **Selector con buscador** en todos los `CampoSelector` (sin tildes, teclado,
  dentro de ventanas), con su corrección del clic dentro de ventanas.
- **Superacceso** puede autorizar la conciliación que él mismo elaboró.
- **Configuración** solo la ve y la cambia el superacceso (ni el Propietario).
- **L0 Mediator** entre módulos: órdenes y avisos en la misma transacción,
  contratos en `core/contratos`, revisión del módulo activo
  (`docs/ARQUITECTURA.md` §4.8).
- **Planes**: `docs/modulos/libro-de-compras.md`, `docs/modulos/cuentas-por-pagar.md`,
  sección **B7** de `docs/modulos/bancos.md` y `docs/HOJA-DE-RUTA.md`.

## En curso: Bancos B7 (rama `b7-en-curso`)

El agente se quedó sin tokens a mitad del paso. La rama tiene el servidor
**a medias**:
- Hecho en parte: `Movimiento.revertir`, anular notas y transferencias con inverso,
  eliminar lo limpio (notas, transferencias, saldo inicial), **blanquear cheques**,
  política `bancos.anulaciones.misma_fecha`, migración `0011`.
- Falta: **15 errores de ESLint** (funciones largas, demasiados parámetros, archivos
  largos), correr y completar las pruebas, el caso del **cheque de un mes
  conciliado** (nota inversa), los **compensados en la conciliación** (marcados
  juntos y visibles), todo el **cliente** y la documentación.
- Para seguir: `git switch b7-en-curso`, corregir, `npm run revisar` y
  `npm run probar`, y unir a `main`.
- **Ojo:** si la base de desarrollo ya tiene aplicada la migración `0011` de la
  rama, `main` no la conoce. Para trabajar en `main` antes de terminar el B7,
  revisar `bancos.__drizzle_migrations` o restaurar la base.

Especificación completa del B7: sección «B7» de `docs/modulos/bancos.md`, más estos
cambios del usuario que aún no están en ese documento:
- **Cheque anulado** en un mes **abierto**: solo se marca anulado (sin nota inversa)
  y no cuenta en el saldo. En un mes **ya conciliado** (cheque en circulación que
  nunca se cobró): nota de crédito inversa con la fecha de la anulación.
- **Blanquear cheque**: si se registró por error y no se imprimió ni entregó, vuelve
  a disponible y su movimiento se elimina (con auditoría y motivo). Permiso
  `bancos.cheques.blanquear`.
- **Conciliación**: original e inverso que nunca pasaron por el banco **aparecen**
  en la conciliación, marcados juntos.

## Siguiente

1. Terminar el **B7**.
2. **Libro de compras** L1 a L5 (con el generador: `npm run generar -- modulo`,
   `definicion`, `recurso`).
3. **Cuentas por pagar**, incluidos los agregados de `docs/HOJA-DE-RUTA.md`
   (saldos iniciales y reportes).

## Preguntas abiertas para el usuario

- Saldos iniciales de Cuentas por pagar: ¿quedan pendientes para pagarse por
  contraseña, o entran pagados? (ver `HOJA-DE-RUTA.md`).
- Saldo inicial del banco en la primera conciliación de una cuenta: se toma igual al
  saldo de libros al cierre del mes anterior (sin confirmar); se revisa con la
  ventana de saldos iniciales con notas y cheques.
- Patrón común de reversión (`Reversible`): se discute antes de programarlo.
