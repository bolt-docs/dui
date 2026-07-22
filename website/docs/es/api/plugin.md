---
title: Plugin
sidebarPosition: 16
description: Sistema de plugins para extender DUI con funcionalidad personalizada.
---

```ts
import { usePluginAsync, renderWith, type DuiPlugin, type PluginAPI, type PluginEvents, type Renderer } from '@bdocs/dui'
```

DUI incluye un sistema de plugins ligero que permite extender el núcleo con
funcionalidad personalizada. Los plugins reciben utilidades compartidas, pueden
conectarse a eventos del ciclo de vida, registrar renderizadores para que otros
plugins los descubran, y encadenar hooks de render asíncronos.

## Crear un plugin

Un plugin es un objeto con un `name` y una función `setup`. La función `setup`
recibe un objeto `PluginAPI` con utilidades y hooks de eventos.

```ts
import { usePluginAsync, type DuiPlugin } from '@bdocs/dui'

const myPlugin: DuiPlugin = {
  name: 'mi-plugin',
  setup(api) {
    const { colors, terminalWidth, getConfig } = api.utils

    api.on('register', () => {
      console.log(colors.green('Plugin registrado!'))
    })

    api.on('configure', (config) => {
      console.log('Config actualizado:', config)
    })
  },
}

await usePluginAsync(myPlugin)
```

## PluginAPI

La función `setup` recibe un `PluginAPI` con estas propiedades:

### utils

Utilidades del núcleo compartidas con el plugin:

```ts
api.utils.colors           // API de colores encadenable
api.utils.configure        // Función global configure
api.utils.getConfig        // Obtener configuración actual
api.utils.terminalWidth    // Obtener ancho del terminal en columnas
api.utils.visibleLength    // Ancho visible de un string
api.utils.stripAnsi        // Eliminar secuencias ANSI
api.utils.resolveColor     // Resolver un ColorStyle a función ANSI
api.utils.countRenderLines // Contar filas del terminal que ocupa una línea
```

### on

Suscribirse a eventos del ciclo de vida:

```ts
api.on('register', () => { /* se llama al registrarse */ })
api.on('configure', (config) => { /* se llama en configure() */ })
api.on('theme-changed', (theme) => { /* se llama al cambiar el tema */ })
api.on('before-render', (ctx) => { /* se llama antes de renderizar */ })
api.on('after-render', (ctx) => { /* se llama después de renderizar */ })
```

### registerThemeSlot

Registra un color por defecto para un slot del tema (ej. `"markdown.heading1"`).
Los valores del plugin se usan solo cuando el usuario no ha proporcionado un
valor mediante `configure({ theme: { … } })`.

```ts
api.registerThemeSlot('miplugin.border', '#646478')
api.registerThemeSlot('miplugin.bg', { fg: '#96c8ff', bg: '#282c34' })
```

### registerRenderHook

Registra un hook de render asíncrono para un canal nombrado. Múltiples plugins
pueden registrar hooks para el mismo canal; se encadenan en orden de registro.
Los hooks pueden ser síncronos o asíncronos.

```ts
api.registerRenderHook('md', async (input, ctx) => {
  return input + '\n[renderizado por miplugin]'
})
```

Invoca la cadena con `runRenderHookAsync(nombre, input, ctx)`:

```ts
import { runRenderHookAsync } from '@bdocs/dui'

const output = await runRenderHookAsync('md', '# Hola')
```

### registerRenderer

Registra un renderizador que otros plugins pueden descubrir y llamar mediante
`api.getRenderer(name)` o la función exportada `renderWith(name, input, opts)`.

```ts
api.registerRenderer('miplugin.format', async (input, options) => {
  const prefix = options?.prefix ?? ''
  return prefix + input.toUpperCase()
})
```

### getRenderer

Obtiene un renderizador registrado por cualquier plugin. Retorna `undefined`
si no hay ningún renderizador registrado con ese nombre.

```ts
const formatter = api.getRenderer('miplugin.format')
if (formatter) {
  const result = await formatter('hola')
}
```

## Funciones de la API de Plugins

### usePluginAsync (recomendada)

```ts
import { usePluginAsync } from '@bdocs/dui'

await usePluginAsync(myPlugin)
await usePluginAsync(otroPlugin)
// El evento `register` se dispara una vez después de que la cola se vacíe
```

Registro asíncrono de plugins. Las llamadas encadenadas se ejecutan en orden
y el evento `register` se dispara una vez después de que la cola se vacíe.

### usePlugin (deprecated)

Registro síncrono. Usa `usePluginAsync` en su lugar.

### unregisterPlugin

```ts
import { unregisterPlugin } from '@bdocs/dui'

unregisterPlugin('mi-plugin') // ejecuta cleanup, elimina slots/hooks/handlers
```

Elimina un plugin previamente registrado: ejecuta su cleanup, elimina los slots
de tema, hooks de render, renderizadores y manejadores de eventos que aportó.

### renderWith

```ts
import { renderWith } from '@bdocs/dui'

const result = await renderWith('md', '# Hola Mundo')
```

Invoca un renderizador registrado por cualquier plugin. Lanza un error si no
hay ningún renderizador registrado con ese nombre.

### runRenderHookAsync

```ts
import { runRenderHookAsync } from '@bdocs/dui'

const output = await runRenderHookAsync('md', '# Hola')
```

Ejecuta la cadena de hooks de render para un canal. Soporta hooks síncronos y
asíncronos. Los hooks se ejecutan en orden de registro, cada uno recibiendo la
salida del hook anterior.

### emitRenderEvent

```ts
import { emitRenderEvent } from '@bdocs/dui'

emitRenderEvent('before-render', { width: 80 })
emitRenderEvent('after-render', { width: 80 })
```

## Composición de plugins

Los plugins pueden componerse entre sí a través del registro de renderizadores:

```ts
const pluginA: DuiPlugin = {
  name: 'plugin-a',
  setup(api) {
    api.registerRenderer('transform.mayus', async (input) => input.toUpperCase())
  },
}

const pluginB: DuiPlugin = {
  name: 'plugin-b',
  setup(api) {
    const mayus = api.getRenderer('transform.mayus')
    api.registerRenderer('transform.compuesto', async (input, opts) => {
      const suffix = (opts?.suffix as string) ?? ''
      const enMayus = mayus ? await mayus(input) : input
      return enMayus + suffix
    })
  },
}

await usePluginAsync(pluginA)
await usePluginAsync(pluginB)

const result = await renderWith('transform.compuesto', 'hola', { suffix: '!!' })
// result: "HOLA!!"
```

## Plugins disponibles

| Paquete | Descripción | Renderizadores registrados |
|---------|-------------|---------------------------|
| [@dui-toolkit/plugin-markdown](/docs/es/plugins/markdown) | Renderiza markdown a terminal con colores ANSI | `"md"` |
| [@dui-toolkit/plugin-diff](/docs/es/plugins/diff) | Diffs unificados y lado a lado | `"diff"` |
| [@dui-toolkit/plugin-image](/docs/es/plugins/image) | Renderizador de imágenes en terminal (PNG, JPG, GIF) | `"image"` |
| [@dui-toolkit/plugin-qrcode](/docs/es/plugins/qrcode) | Generador de códigos QR | `"qrcode"` |
| [@dui-toolkit/plugin-chart](/docs/es/plugins/chart) | Gráficos de barras, líneas, pastel y sparklines | `"chart.bar"`, `"chart.line"`, `"chart.pie"`, `"chart.sparkline"` |

```ts
import { usePluginAsync, renderWith } from '@bdocs/dui'
import { markdownPlugin } from '@dui-toolkit/plugin-markdown'
import { chartPlugin } from '@dui-toolkit/plugin-chart'

await usePluginAsync(markdownPlugin)
await usePluginAsync(chartPlugin)

// A través de la API de plugins:
const mdOutput = await renderWith('md', '# Hola')

// O directamente (mismo resultado):
import { md } from '@dui-toolkit/plugin-markdown'
const mdOutput2 = await md('# Hola')
```

## Tipos de TypeScript

```ts
import type { DuiPlugin, PluginAPI, PluginEvents, RenderContext, Renderer } from '@bdocs/dui'
```
