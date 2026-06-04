---
name: dui
description: Biblioteca de Terminal UI para Node.js (@bdocs/dui). Úsala cuando el proyecto importe de '@bdocs/dui' o cuando necesites crear CLIs con output coloreado, cajas, tablas, spinners, progress bars, prompts interactivos, etc.
---

# DUI — Terminal UI Library for Node.js

`@bdocs/dui` es una librería **zero-dependency** (excepto `string-width`) para construir CLIs con output enriquecido. Soporta colores ANSI true-color, cajas con bordes, tablas, spinners animados, progress bars, prompts interactivos, y más.

**Stack técnico:** TypeScript, ESM only, Vitest, tsdown, Biome, Turborepo, pnpm.

## Instalación

```bash
pnpm add @bdocs/dui
# o
npm install @bdocs/dui
# o
yarn add @bdocs/dui
```

## Importación

Todos los módulos se importan desde `@bdocs/dui`:

```typescript
import {
  configure, colors, box, table, spinner, input, select,
  info, warn, error, success, debug, createLogger,
  bullet, ordered, tasks, steps, divider, confirm,
  multiselect, tree, animate, createProgressBar,
  stripAnsi, visibleLength, wrapAnsiWord, renderLine,
  renderStatic, terminalWidth, formatLog
} from '@bdocs/dui'
```

## Configuración global

```typescript
import { configure, getConfig, resetConfig } from '@bdocs/dui'

// Una vez al inicio del CLI
configure({
  prefix: 'mi-herramienta',  // default: 'dui'
  theme: { /* DuiTheme opcional */ }
})
```

## Sistema de colores

### API chainable (estilo chalk)

```typescript
import { colors } from '@bdocs/dui'

colors.red('texto')
colors.bold.underline.blue('importante')
colors.bgYellow.black('advertencia')
colors.dim('secundario')
colors.green.bold('✓ éxito')

// Colores disponibles:
// fg: black, red, green, yellow, blue, magenta, cyan, white, gray
//      bright-red, bright-green, bright-yellow, bright-blue
//      bright-magenta, bright-cyan, bright-white
// bg: bgBlack, bgRed, bgGreen, bgYellow, bgBlue, bgMagenta, bgCyan, bgWhite, bgGray
//      bgBright-red, bgBright-green, bgBright-yellow, bgBright-blue
//      bgBright-magenta, bgBright-cyan, bgBright-white
// styles: bold, dim, italic, underline, inverse, hidden, strikethrough
```

### Color directo por nombre

```typescript
import { colorMap } from '@bdocs/dui'

colorMap.red('error')
colorMap.green('ok')
```

### Color true-color (hex, rgb, oklch)

```typescript
import { colorize, parseColor, interpolateColor, applyStyle } from '@bdocs/dui'

colorize('hola', '#ff6600', 'fg')        // foreground
colorize('hola', '#ff6600', 'bg')        // background

applyStyle('texto', '#ff6600', '#1a1a2e', ['bold', 'underline'])

parseColor('#ff6600')       // → { r: 255, g: 102, b: 0 }
parseColor('rgb(255, 102, 0)')
parseColor('oklch(0.6 0.15 30)')

interpolateColor('#ff0000', '#0000ff', 0.5)  // → color a medio camino
```

### ANSI sequences directas

```typescript
import { toAnsiFg, toAnsiBg, toAnsiFgBg } from '@bdocs/dui'

toAnsiFg('#ff6600')   // → '\x1b[38;2;255;102;0m'
toAnsiBg('#1a1a2e')   // → '\x1b[48;2;26;26;46m'
```

### Control de color

```typescript
import { isColorSupported, setColorSupported } from '@bdocs/dui'

isColorSupported  // boolean, respeta NO_COLOR y TTY
setColorSupported(false)  // forzar desactivado (útil en tests)
```

## Logger semántico

```typescript
import { info, warn, error, success, debug } from '@bdocs/dui'

info('Procesando archivos...')
success('¡Operación completada!')
warn('Deprecado: usa la nueva API')
error('No se encontró el archivo', err)  // err se loggea después
debug('Valor de x:', { color: { fg: '#888' } })  // solo con DEBUG o BOLTDOCS_DEBUG env

// Con overrides de color por llamada
success('Hecho', { color: '#00ff00' })
```

### Logger con prefijo personalizado

```typescript
import { createLogger } from '@bdocs/dui'

const log = createLogger('build')
log.info('Compilando...')
log.error('Falló')
```

## Box (cajas con bordes)

Tres estilos: `"single"` (┏━┓), `"double"` (╔═╗), `"round"` (╭─╮).

```typescript
import { box, double, single, round } from '@bdocs/dui'

// Uso básico
console.log(double(['Línea 1', 'Línea 2']))

// Con título y opciones
console.log(single(['Contenido'], {
  title: 'Título',
  padding: 2,
  color: '#ff6600',
  colors: {
    border: '#888',
    title: { fg: '#fff', bg: '#ff6600' },
  }
}))

// Responsive: usa terminalWidth() con máximo 80
const result = round(['Texto con word-wrap automático'])
```

## Divider

```typescript
import { divider, dividerLog } from '@bdocs/dui'

divider()                    // → '────' (hasta 72 chars o terminalWidth)
divider('═', 40)             // 40 chars de ═
divider('─', 30, { color: '#888' })  // con color
dividerLog()                 // imprime directamente
```

## Listas

```typescript
import { bullet, ordered, tasks } from '@bdocs/dui'

// Bullet list
console.log(bullet(['Primero', 'Segundo', 'Tercero']))
//   • Primero
//   • Segundo

// Ordered list
console.log(ordered(['Paso 1', 'Paso 2']))
//   1. Paso 1
//   2. Paso 2

// Task list (checklist)
console.log(tasks([
  { label: 'Instalar dependencias', done: true },
  { label: 'Configurar ESLint', done: false },
]))
//   ✔ Instalar dependencias
//   ✘ Configurar ESLint

// Con colores personalizados
bullet(['Item'], { colors: { bullet: '#ff6600' } })
```

## Tabla

```typescript
import { table } from '@bdocs/dui'

const headers = ['Nombre', 'Edad', 'Ciudad']
const rows = [
  ['Ana', '28', 'Madrid'],
  ['Juan', '35', 'Barcelona'],
]

console.log(table(headers, rows))
// ┏━━━━━━━━┳━━━━━━┳━━━━━━━━━━┓
// ┃ Nombre ┃ Edad ┃ Ciudad   ┃
// ┣━━━━━━━━╋━━━━━━╋━━━━━━━━━━┫
// ┃ Ana    ┃ 28   ┃ Madrid   ┃
// ┃ Juan   ┃ 35   ┃ Barcelona┃
// ┗━━━━━━━━┻━━━━━━┻━━━━━━━━━━┛

// Con opciones
console.log(table(headers, rows, {
  style: 'double',         // 'single' | 'double' | 'round' | 'none'
  headerSeparator: true,
  padding: 2,
  columns: {
    0: { align: 'left' },
    1: { align: 'center' },
    2: { align: 'right' },
  },
  colors: {
    header: { fg: '#fff', bg: '#333' },
    border: '#888',
  },
}))
```

## Spinner animado

```typescript
import { createSpinner } from '@bdocs/dui'

const spinner = createSpinner('Descargando...')

spinner.start()

// Actualizar mensaje
spinner.update('Procesando...')

// Detener con estado
spinner.stop('success', '¡Descarga completada!')
spinner.stop('fail', 'Error de conexión')
spinner.stop('warn', 'Advertencia')
spinner.stop('info', 'Información')

// Con opciones
const s = createSpinner('Cargando', {
  prefix: 'build',
  frames: ['◜', '◝', '◞', '◟'],  // frames personalizados
  colors: { frame: '#ff6600', success: '#00ff00' }
})

// TTY: animación inline con ocultación de cursor
// non-TTY: muestra "... " estático
```

## Progress Bar

```typescript
import { createProgressBar } from '@bdocs/dui'

const bar = createProgressBar({
  width: 30,           // ancho de la barra
  barChar: '█',
  emptyChar: '░',
  prefix: '[build]',
  suffix: 'archivos',
})

bar.start(100)          // total opcional (default 100)
bar.update(50, 'Compilando...')  // current, mensaje opcional
bar.update(100)
bar.stop('¡Listo!')     // mensaje final opcional

// TTY: renderiza inline con actualización cada 100ms
// non-TTY: imprime una línea por cada update
```

## Animation engine (keyframes)

```typescript
import { animate, lerp } from '@bdocs/dui'

const anim = animate({
  keyframes: [
    { offset: 0, content: '⠋', fg: '#ff0000' },
    { offset: 0.5, content: '⠙', fg: '#00ff00' },
    { offset: 1, content: '⠹', fg: '#0000ff' },
  ],
  duration: 1000,
  loop: true,
  easing: 'ease-in-out',  // 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | ((t) => t)
  onFrame: (frame) => {
    console.log(frame.content, frame.fg, frame.bg)
  },
})

// Detener
anim.stop()

// Callback al completar (cuando no es loop)
anim.then(() => console.log('Animación terminada'))

// Lerp para interpolar números
lerp(0, 100, 0.5) // → 50
```

## Prompts interactivos

### Confirm

```typescript
import { confirm } from '@bdocs/dui'

const respuesta = await confirm('¿Quieres continuar?')
// → [dui] ¿Quieres continuar? (Y/n):
// Si default = true → "(Y/n)", default = false → "(y/N)"
// SIGINT → resuelve con default

const si = await confirm('¿Seguro?', true)  // default true
const no = await confirm('¿Seguro?', false) // default false
```

### Input

```typescript
import { input } from '@bdocs/dui'

const nombre = await input('¿Cómo te llamas?')
const email = await input('Email', {
  default: 'user@example.com',
  placeholder: 'tu@email.com',
  validate: (v) => v.includes('@') ? true : 'Email inválido',
  colors: {
    message: '#ff0',
    value: '#fff',
    placeholder: { fg: '#888' },
    error: '#f00',
  }
})
// Atajos: ← → home end, backspace delete, Ctrl+U borrar línea, Ctrl+K borrar hasta el final
// Escape → reject con Error, Ctrl+C → process.exit(1)
// Non-TTY → usa readline.question con validación
```

### Select

```typescript
import { select } from '@bdocs/dui'

const color = await select('Elige un color', {
  choices: [
    { label: 'Rojo', value: '#ff0000' },
    { label: 'Verde', value: '#00ff00' },
    { label: 'Azul (desactivado)', value: '#0000ff', disabled: true },
  ],
  pageSize: 5,  // items visibles antes de scroll
  colors: {
    pointer: '#0ff',
    selected: '#0ff',
    label: '#fff',
    message: '#ff0',
  }
})
// ↑↓ navegar, Enter seleccionar, Escape → reject, Ctrl+C → exit
// Non-TTY → lista numerada, input por número
```

### Multiselect

```typescript
import { multiselect } from '@bdocs/dui'

const seleccionados = await multiselect('¿Qué opciones?', {
  choices: [
    { label: 'Opción A', value: 'a', checked: true },
    { label: 'Opción B', value: 'b' },
    { label: 'Opción C (desactivada)', value: 'c', disabled: true },
  ],
  pageSize: 10,
  required: true,  // evita submit vacío
  colors: {
    pointer: '#0ff',
    selected: '#0ff',
    checked: '#0f0',
    label: '#fff',
    message: '#ff0',
  }
})
// Space: toggle, Enter: confirmar, required evita submit sin selección
```

### Tree

```typescript
import { tree } from '@bdocs/dui'

const resultado = await tree('Navega y selecciona', {
  tree: [
    {
      label: 'src',
      children: [
        {
          label: 'components',
          children: [
            { label: 'Button.tsx', value: 'src/components/Button.tsx' },
            { label: 'Input.tsx (disabled)', value: '', disabled: true },
          ]
        },
        { label: 'utils.ts', value: 'src/utils.ts' },
      ]
    },
    { label: 'README.md', value: 'README.md' },
  ],
  pageSize: 10,
  initialExpanded: true,  // expandir todo inicialmente
  colors: {
    pointer: '#0ff',
    selected: '#0ff',
    label: '#fff',
    message: '#ff0',
    branch: '#888',
  }
})
// ← → expandir/colapsar, ← en leaf → colapsa ancestro, Enter seleccionar leaf
// Space: toggle expand, Escape → reject, Ctrl+C → exit
```

## Steps

```typescript
import { steps } from '@bdocs/dui'

console.log(steps([
  { label: 'Instalando dependencias', status: 'success' },
  { label: 'Compilando...', status: 'running', details: 'src/index.ts → dist/' },
  { label: 'Ejecutando tests', status: 'pending' },
  { label: 'Publicando', status: 'error', details: 'Error de autenticación' },
]))
//   ✔  Instalando dependencias
//   │
//   ●  Compilando...
//   │  └─ src/index.ts → dist/
//   │
//   ○  Ejecutando tests
//   │
//   ✖  Publicando
//      └─ Error de autenticación
```

## Utilidades de texto

```typescript
import {
  stripAnsi, visibleLength, terminalWidth,
  padCenter, padRight, fitWidth,
  wrapAnsiWord, tokenizeAnsi,
  renderLine, renderStatic
} from '@bdocs/dui'

// Limpiar ANSI
stripAnsi('\x1b[31mHola\x1b[0m')  // → 'Hola'

// Longitud visible (sin códigos ANSI)
visibleLength('\x1b[31mHola\x1b[0m')  // → 4

// Ancho de terminal
terminalWidth()  // → número de columnas

// Padding ANSI-safe
padCenter('hola', 10)    // '   hola   '
padRight('hola', 10)     // 'hola      '
fitWidth('hola', 10)     // 'hola      '

// Word-wrap que preserva ANSI
wrapAnsiWord(texto, 40)

// Tokenizer para ANSI (útil para implementar wrap propio)
tokenizeAnsi(texto)
// → [{ type: 'word' | 'space' | 'ansi' | 'newline', value, width }]

// Renderizado inline (sobrescribe línea actual)
renderLine('Cargando...')           // stdout
renderLine('Error!', process.stderr)  // stderr

// Renderizado final (con newline)
renderStatic('¡Listo!')
```

## Sistema de temas

### DuiTheme completo

```typescript
import type { ColorStyle, DuiTheme } from '@bdocs/dui'

const theme: DuiTheme = {
  // Colores globales (fallback para componentes)
  success: '#00ff00',
  error: '#ff0000',
  warning: '#ffff00',
  info: '#00ffff',
  muted: '#888888',
  accent: '#ff6600',

  // Logger
  logger: {
    info: '#888',
    warn: '#ff0',
    error: '#f00',
    success: '#0f0',
    debug: '#888',
  },

  // Box
  box: {
    border: '#888',
    title: { fg: '#fff', bg: '#333' },
    arrow: '#0f0',
    url: '#0ff',
    hint: '#888',
    label: '#fff',
    value: '#fff',
  },

  // Spinner
  spinner: {
    frame: '#0ff',
    success: '#0f0',
    fail: '#f00',
    warn: '#ff0',
    info: '#00f',
  },

  // Listas
  list: {
    bullet: '#888',
    number: '#888',
    check: '#0f0',
    cross: '#f00',
  },

  // Steps
  steps: {
    success: '#0f0',
    error: '#f00',
    running: '#0ff',
    pending: '#888',
    detail: '#888',
    connector: '#888',
  },

  // Divider
  divider: { line: '#888' },

  // Prompts
  prompt: { message: '#ff0', suffix: '#888' },
  input: {
    message: '#ff0',
    value: '#fff',
    placeholder: '#888',
    error: '#f00',
  },
  select: {
    pointer: '#0ff',
    selected: '#0ff',
    label: '#fff',
    message: '#ff0',
  },
  multiselect: {
    pointer: '#0ff',
    selected: '#0ff',
    checked: '#0f0',
    label: '#fff',
    message: '#ff0',
  },
  tree: {
    pointer: '#0ff',
    selected: '#0ff',
    label: '#fff',
    message: '#ff0',
    branch: '#888',
  },

  // Progress
  progress: { bar: '#0ff' },

  // Table
  table: { header: 'bold', border: '#888' },
}
```

### ColorStyle

```typescript
type ColorStyle = string | { fg?: string; bg?: string }
// string → color de foreground (hex, rgb(), oklch())
// { fg: '#ff0', bg: '#333' } → foreground y background
```

### Resolución de colores

El orden de resolución de un slot de color es:
1. Override pasado directamente en la llamada (ej: `info('msg', { color: '#f00' })`)
2. Tema del componente (ej: `theme.logger.error`)
3. Color global (ej: `theme.error`)
4. Default del slot (ej: `logger.error` → red)

## Buenas prácticas

### 1. Configurar al inicio

```typescript
import { configure } from '@bdocs/dui'

// En tu CLI entry point
configure({
  prefix: 'mi-cli',
  theme: myTheme,
})
```

### 2. Detectar TTY vs non-TTY

DUI maneja automáticamente TTY vs non-TTY:
- **Spinner:** TTY → animación inline; non-TTY → `...` estático
- **Progress:** TTY → actualización inline; non-TTY → nueva línea cada update
- **Prompts:** TTY → interactivo raw mode; non-TTY → readline.question

### 3. Respetar NO_COLOR

DUI respeta `NO_COLOR` y desactiva colores si stdout no es TTY. Usa `setColorSupported()` en tests para forzar.

### 4. Usar temas para consistencia

Define un tema global y evita pasar `colors` en cada llamada. Usa overrides solo cuando necesites excepciones.

### 5. Manejo de errores en prompts

Todos los prompts (`input`, `select`, `multiselect`, `tree`) rechazan con `Error('Cancelled')` en Escape. Maneja con try/catch:

```typescript
try {
  const result = await select('Opción:', { choices })
  // usar result
} catch {
  // usuario canceló
}
```

### 6. Usar formatLog para logging manual

```typescript
import { formatLog } from '@bdocs/dui'

console.log(formatLog('mensaje personalizado', 'info'))
console.log(formatLog('crítico', 'error'))
```

### 7. Tests

Correr tests:
```bash
pnpm --filter @bdocs/dui test
pnpm --filter @bdocs/dui test:coverage  # con cobertura
```

Lint y format:
```bash
pnpm exec biome lint --write .
pnpm exec biome format --write .
```

### 8. Archivos clave del proyecto

| Ruta | Propósito |
|---|---|
| `packages/dui/src/index.ts` | Barrel / API pública |
| `packages/dui/src/config.ts` | Config global (prefix, theme) |
| `packages/dui/src/color.ts` | Motor de colores ANSI |
| `packages/dui/src/theme.ts` | Sistema de temas |
| `packages/dui/src/logger.ts` | Logger semántico |
| `packages/dui/src/box.ts` | Cajas con bordes |
| `packages/dui/src/table.ts` | Tablas |
| `packages/dui/src/spinner.ts` | Spinner animado |
| `packages/dui/src/progress.ts` | Barra de progreso |
| `packages/dui/src/animation.ts` | Motor de keyframes |
| `packages/dui/src/prompt.ts` | Confirm prompt |
| `packages/dui/src/input.ts` | Input interactivo |
| `packages/dui/src/select.ts` | Select interactivo |
| `packages/dui/src/multiselect.ts` | Multiselect interactivo |
| `packages/dui/src/tree.ts` | Tree navigation |
| `packages/dui/src/steps.ts` | Indicadores de pasos |
| `packages/dui/src/utils.ts` | Utilidades (wrap, strip, render) |
| `packages/dui/src/divider.ts` | Divisores |
