# CalcuConta - Calculadora de Planilla de Sueldos y Salarios

Este es un proyecto web interactivo diseñado para realizar cálculos rápidos de planillas de sueldos y salarios, incluyendo el cálculo automático o manual del **Bono de Antigüedad** y bonos personalizados. 

El proyecto está diseñado bajo un enfoque minimalista sin necesidad de bases de datos o variables de entorno (`.env`), ideal para una implementación rápida y despliegue inmediato en **Vercel**.

## Características
- **Interfaz Premium**: Diseño oscuro elegante con efectos de glassmorphism, micro-animaciones y diseño completamente responsivo.
- **Configuración Dinámica**: Posibilidad de ajustar en tiempo real el Salario Mínimo Nacional (SMN).
- **Lista Dinámica de Bonos ("+ Agregar Bono")**:
  - Permite agregar múltiples bonos independientes a un mismo empleado.
  - **Tipo Monto Fijo (Efectivo)**: Ingresa un nombre personalizado (ej. *Bono Pasaje*, *Bono de Producción*, *Bono de Ventas*) junto con su respectivo monto directo.
  - **Tipo Antigüedad**: Calcula el bono automáticamente según los años de servicio del empleado aplicando la escala porcentual sobre 3 Salarios Mínimos Nacionales.
- **Simulación Dinámica e Inmediata**: Los montos simulados del Total Ganado se actualizan en tiempo real dentro del formulario al modificar los bonos o el haber básico.
- **Persistencia Local**: Los datos de los empleados y parámetros se guardan automáticamente en el navegador (`localStorage`).
- **Organización en 4 Planillas Distintas**:
  - **Planilla de Sueldos y Salarios**: Enfocada en ingresos (Haber Básico, Bonos Dinámicos y Total Ganado).
  - **Planilla Tributaria (RC-IVA)**: Detalle del cálculo del impuesto fiscal con 10 columnas dedicadas.
  - **Planilla de Líquido Pagable**: Muestra el descuento total de aportes laborales y RC-IVA para obtener el neto final pagado al empleado.
  - **Planilla de Aportes Patronales**: Calcula la contribución patronal correspondiente al 32.37% del Total Ganado.
- **Asiento Contable de Planilla (Registro Contable)**: Generación automática de un asiento de diario contable balanceado (partida doble) con columnas de Debe y Haber detallando las cuentas de gasto y pasivos por pagar correspondientes.
- **Planilla Tributaria (RC-IVA)**: Cálculo automático del impuesto RC-IVA para cada empleado con 10 columnas detalladas:
  1. *Empleado*
  2. *Total Ganado*
  3. *Aportes Laborales (12.71%)*
  4. *Sueldo Neto*
  5. *Menos 2 Salarios Mínimos* (Mínimo no imponible)
  6. *Importe Salarial*
  7. *RC-IVA (13%)*
  8. *Menos 13% SMN* (Pago a cuenta por ley de 1 SMN)
  9. *Form 110 (13%)* (Crédito fiscal por facturas presentadas)
  10. *RC-IVA a Pagar* (Saldo de impuesto definitivo)

---

## Cómo Ejecutar en Local

### Requisitos Previos
Tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior recomendada).

### Pasos
1. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```

2. Inicia el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:5173](http://localhost:5173) en tu navegador para ver la aplicación.

3. Compila el proyecto para producción:
   ```bash
   npm run build
   ```

---

## Despliegue en Vercel

Este proyecto cuenta con un archivo `vercel.json` preconfigurado para compilar automáticamente con Vite.

### Opción 1: Despliegue con Vercel CLI
Si tienes Vercel CLI instalado globalmente:
```bash
vercel
```

### Opción 2: Conectar a GitHub (Recomendado)
1. Sube este directorio a un repositorio de **GitHub**, **GitLab** o **Bitbucket**.
2. Ve a [Vercel](https://vercel.com/) e inicia sesión.
3. Haz clic en **"Add New"** > **"Project"** y selecciona tu repositorio.
4. Vercel detectará la configuración automáticamente (Vite). Haz clic en **"Deploy"**.
5. ¡Listo! Tu proyecto estará público en segundos.

---

## Metodología de Cálculo (Bolivia)
El Bono de Antigüedad se calcula aplicando un porcentaje determinado según los años de servicio sobre **3 Salarios Mínimos Nacionales**:

$$\text{Bono} = 3 \times \text{SMN} \times \frac{\text{Porcentaje Escala}}{100}$$

### Escala de Porcentajes:
- **0 a 1 año**: 0%
- **2 a 4 años**: 5%
- **5 a 7 años**: 11%
- **8 a 10 años**: 18%
- **11 a 14 años**: 26%
- **15 a 19 años**: 34%
- **20 a 24 años**: 42%
- **25 años o más**: 50%
