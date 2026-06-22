# 🌱 Sprout Track — Roadmap de Mejoras (To-Do estratégica)

Lista de desarrollo a futuro para nuestro fork de Sprout Track, **ordenada desde
lo más crítico** (salud y alertas del bebé) **hasta lo menos importante** (cosas
estéticas o de nicho).

> Claude Code es buen candidato para resolver estas tareas: maneja Next.js,
> bases de datos con Prisma y llamadas a APIs de terceros. **Importante:** ir
> **paso por paso**, abriendo tareas individuales — no pedir todo de una vez —
> para no romper la app. Ver [Cómo trabajar esto con Claude Code](#-cómo-trabajar-esto-con-claude-code)
> al final.

---

## 🐛 Bugs conocidos (corregir cuanto antes)

### B1. La importación SQLite → PostgreSQL pierde la fila `Settings` de la familia
- **Severidad:** Alta — la familia migrada queda **sin poder iniciar sesión**
  ("Invalid credentials"). Los datos parecen importados (bebé, sueño, tomas), pero
  falta la fila `Settings`, y el login lee el PIN/`authType` desde `Settings`.
- **Causa raíz:** en [`app/api/utils/db-backup.ts`](app/api/utils/db-backup.ts), el
  mapa `BOOLEAN_COLUMNS.Settings` **omite** la columna `includeSolidsInFeedTimer`
  (un `Boolean` del esquema, ver [`prisma/schema.prisma:509`](prisma/schema.prisma#L509)).
  SQLite la guarda como `0/1`; sin convertir, la inserción en PostgreSQL (tipado
  estricto) falla. Fallan tanto el `createMany` por lote como el `create` fila a
  fila del fallback, y la fila se **descarta en silencio** con un simple
  `console.warn`. Las demás tablas importan bien, así que el fallo es invisible.
- **Solo afecta** a migraciones **entre proveedores** (SQLite↔PostgreSQL).
  SQLite→SQLite copia el `.db` tal cual y no pasa por esta conversión.
- **Workaround aplicado** (caso real, junio 2026): crear la fila `Settings` a mano
  vía Prisma (`familyId`, `securityPin`, `authType: 'SYSTEM'`).

**Arreglos (de menor a mayor alcance):**
- [ ] **Inmediato:** añadir `'includeSolidsInFeedTimer'` a `BOOLEAN_COLUMNS.Settings`.
- [ ] **Robusto:** dejar de mantener a mano `BOOLEAN_COLUMNS`/`DATE_COLUMNS` y
      derivar las columnas booleanas/fecha desde el DMMF de Prisma
      (`Prisma.dmmf.datamodel.models`), para que no se vuelvan a desincronizar
      cuando se agregue una columna nueva.
- [ ] **Seguridad:** que el importador **no falle en silencio** — acumular filas/tablas
      descartadas y devolverlas; mostrar "N filas no se importaron" en la UI de restauración
      (y fallar ruidosamente si una tabla núcleo como `Settings`/`Family`/`Caretaker` pierde filas).
- [ ] **Guard:** tras una restauración entre proveedores, verificar que cada `Family`
      tenga su fila `Settings`; back-fill o error si falta.

---

## 🚨 Nivel 1 — Alertas Críticas de Salud (lo más urgente)

Hoy la app es **pasiva** (tú la miras para ver qué pasa). Queremos hacerla
**proactiva** para que te avise si algo va mal.

### 1.1. Motor de Reglas de Alerta (Backend — Prisma & Cron Jobs)
- [ ] Crear un script/endpoint que corra **cada ~10 minutos** analizando la base
      de datos de logs.
- [ ] **Alerta de alimentación:** más de **4–5 horas** sin registrar toma de leche.
- [ ] **Alerta de deshidratación:** más de **8 horas** sin registrar pañal mojado (pipí).
- [ ] **Alerta de temperatura:** si se registra una temperatura **≥ 38 °C** (fiebre).

### 1.2. Integración de Notificaciones (Telegram / WhatsApp / Email)
- [ ] Conectar el motor de alertas (1.1) con un **bot de Telegram** o un servicio
      de correo como **Resend** (plan gratuito).
- [ ] Enviar una **notificación push real al celular** cuando se dispare una regla
      del paso 1.1.

---

## 🧠 Nivel 2 — Inteligencia y Predicciones (el "cerebro" de la app)

Para competir con apps de pago como **Huckleberry**, la app debería **anticipar**
las necesidades del bebé.

### 2.1. Calculadora de "Ventanas de Sueño" (Wake Windows)
- [ ] Crear un algoritmo (o pequeña integración opcional con un modelo de IA) que
      analice la hora a la que el bebé despertó de su última siesta.
- [ ] Mostrar en el **Dashboard principal** un contador visual:
      *"Tu bebé debería dormir su próxima siesta a las XX:XX (en 2 h 15 min)"*,
      basado en su **edad** y su **último registro de sueño**.

### 2.2. Recomendaciones de estimulación y salud según la edad
- [ ] Crear una sección/pestaña que, según la **edad actual** del bebé (calculada
      desde su fecha de nacimiento), muestre:
  - **Actividades de estimulación temprana** apropiadas para esa semana/mes:
    juguetes recomendados, canciones, juegos sensoriales.
  - **Recomendaciones de salud y desarrollo** según la edad, tomando como
    referencia inicial el calendario **NHS** (Reino Unido); diseñar el sistema
    para poder parametrizar por país en el futuro (calendario pediátrico local).
  - **Vacunas** e **hitos del desarrollo (milestones)** correspondientes a ese
    mes específico.

---

## 📅 Nivel 3 — Fechas Clave & Trámites (plazos reales)

Recordatorios de obligaciones legales y administrativas con **plazos** — se
apoyan en el motor de notificaciones del Nivel 1.2.

### 3.1. Registro nacional de nacimiento
- [ ] Mostrar un recordatorio prominente (y notificación push) para **inscribir al
      bebé en el registro civil** nacional, con el **plazo legal** según el país de
      nacimiento.
  - Ejemplo UK: plazo de **42 días** desde el nacimiento.
  - Diseñar para ser parametrizable por país.

### 3.2. Registro consular / embajada
- [ ] Recordatorio para **registrar al bebé en la embajada o consulado** del país
      de nacionalidad de los padres (relevante para expatriados).
  - Incluir enlace a la página oficial del consulado (configurable por país).
  - Sin plazo fijo universal → mostrar como tarea pendiente desde el nacimiento.

### 3.3. Calendario oficial de salud (NHS u organismo local)
- [ ] Importar/codificar el **calendario de controles y visitas pediátricas** del
      NHS (UK) como punto de partida: revisiones a las 6–8 semanas, 1 año,
      2–2.5 años, etc.
- [ ] Mostrar la **próxima cita recomendada** en el dashboard y enviar
      notificación cuando se acerque.
- [ ] Diseñar la estructura de datos para poder añadir calendarios de otros países
      sin cambiar la lógica central.

---

## 🌐 Nivel 4 — Localización e Idioma (comodidad indispensable)

La v1.0 ya tiene traducciones básicas, pero a veces no se adaptan al vocabulario
de cada país.

### 4.1. Localización al Español Latino / Neutro
- [ ] Revisar los archivos de traducción (`src/localization/translations/es.json`)
      para cambiar modismos de España por términos más naturales:
      - "hacer caquita" → "pañal sucio" / "evacuación"
      - "tomas" → "biberón" / "pecho"
- [ ] (Relacionado) Revisar las 8 traducciones francesas marcadas con prefijo
      `[AI]` en `fr.json` y validarlas a mano.

---

## 🎨 Nivel 5 — Usabilidad y UI/UX (comodidad del día a día)

Mejorar la experiencia visual, sobre todo para las **desveladas nocturnas**.

### 5.1. Consejo del día (con énfasis ecológico)
- [ ] Mostrar **un consejo al día** en el dashboard (o como notificación matutina).
- [ ] Mezcla de categorías: bienestar, sueño, seguridad, estimulación — pero con
      **al menos 2 consejos por semana de crianza ecológica/sostenible** (pañales
      de tela, cosmética natural, reducir plásticos, etc.).
- [ ] Implementar como colección de consejos en la base de datos, categorizados y
      con peso de frecuencia (los "verdes" se muestran ≥ 2× por semana).

### 5.2. Widget de Entrada Rápida de 1 clic (Quick Logs)
- [ ] Diseñar una **barra flotante persistente** en la parte inferior de la
      pantalla móvil.
- [ ] Permitir registrar con **un solo toque** un "pañal mojado estándar" o una
      "toma rápida de leche", sin abrir menús ni llenar formularios complejos.

> Nota: ya existe el **Quick Search (Ctrl/Cmd + K)** con acciones de "Quick Log";
> este punto es la versión **táctil de 1 toque** para móvil.

### 5.3. Perfeccionamiento del Modo Noche en "Nursery Mode"
- [ ] Hacer **personalizable** el color de la luz nocturna en pantalla (luz de
      noche integrada): un tono **rojo cálido o ámbar** que no interfiera con la
      melatonina del bebé.

---

## ⚙️ Nivel 6 — Automatización y Domótica (para techies — menos crítico)

Hacer que tu casa reaccione a tu bebé.

### 6.1. Extensión de Webhooks para Home Assistant
- [ ] Configurar **eventos específicos** sobre los webhooks existentes de Sprout Track.
- [ ] Ejemplo: cuando el cronómetro de **"Siesta"** comience → enviar un webhook
      para **apagar las luces inteligentes** del cuarto y **poner ruido blanco**
      en la bocina inteligente.

---

## 🤖 Cómo trabajar esto con Claude Code

Para avanzar de forma **segura** sin romper la app, **no pedir todo a la vez**.
Ir paso por paso, abriendo tareas individuales. Ejemplo de prompt para empezar
por la prioridad #1:

> "Claude, vamos a trabajar en la lista de mejoras de nuestro fork de Sprout
> Track. Empecemos por la prioridad número 1: crear el motor de reglas de alertas
> críticas de salud. Necesito que analices el esquema de Prisma para ver cómo se
> estructuran las tablas de *feeding*, *diaper* y *measurements*. Diseña un
> sistema de backend (puede ser una API Route de Next.js que podamos llamar con un
> cron job) para detectar si un bebé lleva más de 4 horas sin comer o más de 8
> horas sin un pañal mojado. **Dime cuál es tu plan antes de escribir código.**"

### Orden recomendado de ataque
1. **Nivel 1.1** → motor de reglas (la base de todo lo proactivo).
2. **Nivel 1.2** → notificaciones (las alertas + recordatorios de trámites del Nivel 3 las necesitan).
3. **Nivel 2.1** → ventanas de sueño.
4. **Nivel 2.2** → estimulación por edad + calendario NHS.
5. **Nivel 3** → fechas clave y trámites (registro civil, consular, controles pediátricos).
6. Resto de niveles según necesidad.
