---
title: Plugin
sidebarPosition: 16
description: Sistema de plugins para extender DUI con funcionalidad personalizada.
---

```ts
import { usePlugin, type DuiPlugin, type PluginAPI, type PluginEvents } from '@bdocs/dui'
```

DUI incluye un sistema de plugins ligero que permite extender el núcleo con
funcionalidad personalizada. Los plugins reciben utilidades compartidas y pueden
conectarse a eventos del ciclo de vida.

## Crear un plugin

Un plugin es un objeto con un `name` y una función `setup`. La función `setup`
recibe un objeto `PluginAPI` con utilidades y hooks de eventos.

```ts
import { usePlugin, type DuiPlugin } from '@bdocs/dui'

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

usePlugin(myPlugin)
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
```

## Plugins disponibles

| Paquete | Descripción |
|---------|-------------|
| [@dui-toolkit/plugin-markdown](/docs/es/plugins/markdown) | Renderiza markdown a terminal con colores ANSI |

```ts
import { usePlugin } from '@bdocs/dui'
import { markdownPlugin } from '@dui-toolkit/plugin-markdown'

usePlugin(markdownPlugin)
```

Visita la [sección de Plugins](/docs/es/plugins) para documentación detallada.
