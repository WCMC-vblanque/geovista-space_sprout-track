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

### 2.2. Recomendaciones inteligentes según el desarrollo
- [ ] Crear una pestaña que, según la **edad actual** del bebé (calculada desde su
      fecha de nacimiento), sugiera **actividades de estimulación temprana**.
- [ ] Recordar qué **vacunas** o **hitos del desarrollo (milestones)** corresponden
      a ese mes específico.

---

## 🌐 Nivel 3 — Localización e Idioma (comodidad indispensable)

La v1.0 ya tiene traducciones básicas, pero a veces no se adaptan al vocabulario
de cada país.

### 3.1. Localización al Español Latino / Neutro
- [ ] Revisar los archivos de traducción (`src/localization/translations/es.json`)
      para cambiar modismos de España por términos más naturales:
      - "hacer caquita" → "pañal sucio" / "evacuación"
      - "tomas" → "biberón" / "pecho"
- [ ] (Relacionado) Revisar las 8 traducciones francesas marcadas con prefijo
      `[AI]` en `fr.json` y validarlas a mano.

---

## 🎨 Nivel 4 — Usabilidad y UI/UX (comodidad del día a día)

Mejorar la experiencia visual, sobre todo para las **desveladas nocturnas**.

### 4.1. Widget de Entrada Rápida de 1 clic (Quick Logs)
- [ ] Diseñar una **barra flotante persistente** en la parte inferior de la
      pantalla móvil.
- [ ] Permitir registrar con **un solo toque** un "pañal mojado estándar" o una
      "toma rápida de leche", sin abrir menús ni llenar formularios complejos.

> Nota: ya existe el **Quick Search (Ctrl/Cmd + K)** con acciones de "Quick Log";
> este punto es la versión **táctil de 1 toque** para móvil.

### 4.2. Perfeccionamiento del Modo Noche en "Nursery Mode"
- [ ] Hacer **personalizable** el color de la luz nocturna en pantalla (luz de
      noche integrada): un tono **rojo cálido o ámbar** que no interfiera con la
      melatonina del bebé.

---

## ⚙️ Nivel 5 — Automatización y Domótica (para techies — menos crítico)

Hacer que tu casa reaccione a tu bebé.

### 5.1. Extensión de Webhooks para Home Assistant
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
2. **Nivel 1.2** → notificaciones (para que las alertas lleguen al celular).
3. **Nivel 2.1** → ventanas de sueño.
4. Resto de niveles según necesidad.
