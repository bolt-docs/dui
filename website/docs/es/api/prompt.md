---
title: Prompt
sidebarPosition: 11
description: Prompts de confirmación interactivos.
---

import TerminalPreview from '../../../components/TerminalPreview'

```ts
import { confirm, formatLog, input, multiselect, select, tree } from '@bdocs/dui'
```

## input

```ts
input(message: string, options?: InputOptions): Promise<string>
```

<Field name="message" type="string">La pregunta a mostrar.</Field>
<Field name="options" type="InputOptions">Configuración opcional con default, placeholder, validate y colors.</Field>

Prompt interactivo de entrada de texto. Soporta escritura, navegación con ←/→,
backspace, delete, Ctrl+U (limpiar línea), Ctrl+K (borrar hasta el final),
y Enter para enviar.

```ts
const nombre = await input('¿Cómo te llamas?', {
  default: 'Usuario',
  placeholder: 'Escribe tu nombre...',
})
// TTY: escribe libremente, Enter para enviar, Esc para cancelar
// Non-TTY: entrada estándar con readline
```

**Opciones de InputOptions:**

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| `default` | `string` | — | Valor por defecto cuando la entrada está vacía |
| `placeholder` | `string` | — | Texto de ayuda atenuado cuando el buffer está vacío |
| `validate` | `(value: string) => string \| true` | — | Devuelve mensaje de error o `true` |
| `colors` | `object` | — | Sobrescritura de colores por llamada |

**Slots del tema:** `input.message`, `input.value`, `input.placeholder`, `input.error`

```ts
const email = await input('Email:', {
  placeholder: 'user@example.com',
  validate: (v) =>
    v.includes('@') ? true : 'Debe contener @',
  colors: {
    error: '#ff4444',
  },
})
```

## multiselect

```ts
multiselect<T = string>(message: string, options: MultiselectOptions<T>): Promise<T[]>
```

<Field name="message" type="string">La pregunta a mostrar.</Field>
<Field name="options" type="MultiselectOptions">Objeto de configuración con choices, pageSize, required y colors.</Field>

Prompt interactivo para elegir múltiples opciones de una lista. Soporta navegación con
flechas, espacio para alternar, elementos deshabilitados, y un fallback non-TTY con
entrada numérica separada por comas.

```ts
const valores = await multiselect('Elige colores:', {
  choices: [
    { label: 'Rojo',   value: '#ff0000' },
    { label: 'Verde',  value: '#00cc66', checked: true },
    { label: 'Azul',   value: '#3399ff', disabled: true },
  ],
})
// Usa ↑↓ para navegar, Espacio para alternar, Enter para confirmar, Esc para cancelar
```

<Callout variant="info">
  En entornos non-TTY escribe números separados por comas (ej. `1,3`) y presiona Enter.
</Callout>

**Opciones de MultiselectOptions:**

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| `choices` | `MultiselectChoice<T>[]` | — | Array de opciones |
| `pageSize` | `number` | `10` | Máximo de items visibles antes de hacer scroll |
| `required` | `boolean` | `false` | Si es true, al menos una selección es obligatoria |
| `colors` | `object` | — | Sobrescritura de colores por llamada |

**Campos de MultiselectChoice:**

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| `label` | `string` | — | Texto a mostrar |
| `value` | `T` | — | Valor devuelto (cualquier tipo) |
| `disabled` | `boolean` | `false` | Si es true, no se puede seleccionar |
| `checked` | `boolean` | `false` | Estado inicial de selección |

**Slots del tema:** `multiselect.pointer`, `multiselect.selected`, `multiselect.checked`, `multiselect.label`, `multiselect.message`

```ts
const frameworks = await multiselect('Selecciona frameworks:', {
  choices: [
    { label: 'React',   value: 'react', checked: true },
    { label: 'Vue',     value: 'vue' },
    { label: 'Svelte',  value: 'svelte' },
  ],
  colors: {
    pointer: '#ff8800',
    checked: '#00ff88',
  },
})
```

## select

```ts
select<T = string>(message: string, options: SelectOptions<T>): Promise<T>
```

<Field name="message" type="string">La pregunta a mostrar.</Field>
<Field name="options" type="SelectOptions">Objeto de configuración con choices, pageSize y colors.</Field>

Prompt interactivo para elegir una opción de una lista. Soporta navegación con flechas,
navegación con clic del ratón, elementos deshabilitados, scroll por páginas, y un fallback non-TTY con entrada numérica.

```ts
const valor = await select('Elige un color:', {
  choices: [
    { label: 'Rojo',   value: '#ff0000' },
    { label: 'Verde', value: '#00cc66', disabled: true },
    { label: 'Azul',  value: '#3399ff' },
  ],
})
// Usa ↑↓ para navegar, clic para seleccionar, Enter para confirmar, Esc para cancelar
```

<Callout variant="info">
  En entornos non-TTY se muestra una lista numerada y el usuario escribe un número.
</Callout>

**Opciones de SelectOptions:**

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| `choices` | `SelectChoice<T>[]` | — | Array de opciones |
| `pageSize` | `number` | `10` | Máximo de items visibles antes de hacer scroll |
| `colors` | `object` | — | Sobrescritura de colores por llamada |

**Campos de SelectChoice:**

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| `label` | `string` | — | Texto a mostrar |
| `value` | `T` | — | Valor devuelto (cualquier tipo) |
| `disabled` | `boolean` | `false` | Si es true, no se puede seleccionar |

**Slots del tema:** `select.pointer`, `select.selected`, `select.label`, `select.message`

```ts
const framework = await select('Elige un framework:', {
  choices: [
    { label: 'React',  value: 'react' },
    { label: 'Vue',    value: 'vue' },
    { label: 'Svelte', value: 'svelte' },
  ],
  colors: {
    pointer: '#ff8800',
    selected: '#00ff88',
  },
})
```

### Soporte de Mouse

Cuando se ejecuta en un terminal que soporta eventos de mouse (la mayoría de terminales modernos), `select()` soporta automáticamente clics con mouse:

- **Click izquierdo** en una opción la selecciona y cierra el prompt
- Funciona igual que la navegación con flechas y Enter
- Se adapta automáticamente al scroll

El soporte de mouse se habilita automáticamente en entornos TTY y se desactiva en entornos non-TTY.

<Callout variant="info">
  Las características de mouse requieren soporte del protocolo SGR 1006 (la mayoría de terminales modernos).
</Callout>

### Scroll con Rueda

Además de los clics, `select()` lee eventos de rueda del mouse desde el stream SGR 1006 y los convierte en movimientos del cursor:

- **Rueda arriba** equivale a presionar `↑` — mueve el cursor hacia arriba, saltando elementos deshabilitados
- **Rueda abajo** equivale a presionar `↓` — mueve el cursor hacia abajo, saltando elementos deshabilitados
- Cada tick de la rueda mueve el cursor una fila; cuando llega al borde de la página visible, la ventana se desplaza en sincronía
- El scroll **no** confirma el prompt automáticamente — pulsa `Enter` o haz clic para confirmar la selección

El soporte de rueda viene activado por defecto en `select()` — sin opciones extra. El estado de modificadores (Shift/Ctrl/Alt) se captura a través del evento estándar pero la v1 mapea cada tick a una sola fila; un scroll rápido simplemente genera más ticks.

<Callout variant="info">
  El scroll con rueda también funciona en `multiselect()` y `tree()` con la misma semántica — la rueda mueve el cursor únicamente, no alterna checkboxes ni expande ramas. Usa `Espacio` (multiselect) o `→`/`Espacio` (tree) para esas acciones.
</Callout>

#### Sensibilidad de la Rueda

Pasa `wheelSensitivity` en el objeto de opciones de `select`, `multiselect` o `tree` para que un solo tick de la rueda avance el cursor `N` filas en lugar de una. Por defecto vale `1`. Los valores menores a `1` se fuerzan a `1` (fracciones negativas o cero no pueden desactivar el scroll).

```ts
// Un tick = 3 filas. Útil para listas largas donde un solo
// notch se siente muy granular.
const value = await select("Pick", {
  choices: [...allItems],
  wheelSensitivity: 3,
});
```

El multiplicador se compone con los bursts multi-tick: con `wheelSensitivity: 3` y un chunk con dos ticks consecutivos, el cursor avanza `2 × 3 = 6` filas en un solo render. Los elementos deshabilitados siguen saltándose por fila (el loop llama a `clampCursor` una vez por paso). El scroll con rueda en `multiselect` nunca alterna checkboxes independientemente de la sensibilidad, y el cursor de `tree` se topa con los extremos (sin wrap).

## tree

```ts
tree<T = string>(message: string, options: TreeOptions<T>): Promise<T | undefined>
```

<Field name="message" type="string">La pregunta a mostrar.</Field>
<Field name="options" type="TreeOptions">Objeto de configuración con tree, pageSize, initialExpanded y colors.</Field>

Prompt interactivo para seleccionar una hoja de un árbol jerárquico. Soporta navegación
con flechas, expandir/colapsar ramas con ▶/◀ o Espacio, y Enter para seleccionar.

```ts
const valor = await tree('Elige una categoría:', {
  tree: [
    { label: 'Frutas', children: [
      { label: 'Manzana', value: 'apple' },
      { label: 'Plátano', value: 'banana' },
    ]},
    { label: 'Colores', children: [
      { label: 'Rojo',   value: '#ff0000', disabled: true },
      { label: 'Verde',  value: '#00cc66' },
      { label: 'Azul',   value: '#3399ff' },
    ]},
  ],
})
// Usa ↑↓ para navegar, → o Espacio para expandir, ← o Espacio para colapsar, Enter para seleccionar, Esc para cancelar
```

<Callout variant="info">
  En entornos non-TTY las hojas se listan con números y el usuario escribe un número.
</Callout>

**Opciones de TreeOptions:**

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| `tree` | `TreeNode<T>[]` | — | Array de nodos raíz |
| `pageSize` | `number` | `10` | Máximo de items visibles antes de hacer scroll |
| `initialExpanded` | `boolean` | `false` | Si es true, todas las ramas empiezan expandidas |
| `colors` | `object` | — | Sobrescritura de colores por llamada |

**Campos de TreeNode:**

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| `label` | `string` | — | Texto a mostrar |
| `value` | `T` | — | Valor devuelto al seleccionar (solo hojas) |
| `disabled` | `boolean` | `false` | Si es true, no se puede expandir o seleccionar |
| `expanded` | `boolean` | `false` | Estado inicial expandido para ramas |
| `children` | `TreeNode<T>[]` | — | Nodos hijo (crea una rama) |

**Slots del tema:** `tree.pointer`, `tree.selected`, `tree.label`, `tree.message`, `tree.branch`

```ts
const opcion = await tree('Elige un nodo:', {
  tree: [
    { label: 'Raíz', children: [
      { label: 'Anidado', children: [
        { label: 'Profundo', value: 'deep' },
      ]},
    ]},
  ],
  initialExpanded: true,
  colors: {
    pointer: '#ff8800',
    branch: '#88ff00',
  },
})
```

## confirm

```ts
confirm(message: string, options?: ConfirmOptions | boolean): Promise<boolean>
```

<Field name="message" type="string">La pregunta a mostrar.</Field>
<Field name="options" type="ConfirmOptions | boolean">Pasa `{ default: true, color?: ColorInput }`, un booleano directo, u omite para sin default.</Field>

Solicita al usuario una confirmación sí/no. Resuelve `true` para sí, `false` para no.

```ts
const proceed = await confirm('¿Estás seguro de que quieres continuar?')
if (proceed) {
  // hacer algo
}
```

<Callout variant="info">
  Pasa `true` como segundo argumento para un default de `true`: `confirm('¿Continuar?', true)`.
</Callout>

## formatLog

```ts
formatLog(message: string, style?: (s: string) => string | 'info' | 'warn' | 'error' | 'success'): string
```

<Field name="message" type="string">El mensaje a formatear.</Field>
<Field name="style" type="function | string">Función de estilo o nombre predefinido (`'info'`, `'warn'`, etc.).</Field>

Devuelve un string de log formateado con el prefijo configurado.

```ts
console.log(formatLog('Mensaje personalizado', 'info'))
// [mytool] Mensaje personalizado
```

<TerminalPreview command="node prompt.js">
{`\x1b[33m?\x1b[0m \x1b[1m¿Estás seguro de continuar?\x1b[0m (Y/n)
\x1b[1m[mytool]\x1b[0m Mensaje personalizado`}
</TerminalPreview>

<Callout variant="note">
  `style` también acepta una función personalizada: `formatLog('msg', s => s.toUpperCase())`.
</Callout>
