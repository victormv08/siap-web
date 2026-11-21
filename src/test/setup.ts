import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

// Con varios archivos de pruebas en paralelo, el primer renderizado en frío puede pasar del segundo que
// Testing Library espera por defecto. Solo se amplía cuánto se espera; lo que se comprueba no cambia.
configure({ asyncUtilTimeout: 5000 })

// jsdom no trae ResizeObserver y el MessageBar de Fluent lo usa. Sustituto vacío solo para las pruebas.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// La limpieza del DOM entre pruebas (cleanup de Testing Library) la hace cada archivo de pruebas
// en su propio afterEach: Vitest 5 no admite registrar ese hook a nivel de módulo en setupFiles.
