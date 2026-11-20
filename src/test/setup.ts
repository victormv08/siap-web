import '@testing-library/jest-dom/vitest'

// La limpieza del DOM entre pruebas (cleanup de Testing Library) la hace cada archivo de pruebas
// en su propio afterEach: Vitest 5 no admite registrar ese hook a nivel de módulo en setupFiles.
