# Solicitud de datos: verificación y servidor

El formulario público necesita los endpoints nuevos del backend, integrados en `develop`, en `C:/Users/garci/OneDrive/Desktop/cohorteApp/cohorte_test`. Las instrucciones de despliegue, SQL y variables están en `docs/solicitudes-seguridad.md` de ese repositorio. No se ha desplegado en producción ni configurado un proveedor VPN/proxy.

El navegador valida teléfono de diez dígitos, textos, correo y opciones; bloquea números en nombre y letras/símbolos en teléfono, exige verificar el correo por código y autorizar geolocalización antes de enviar. El campo del código es visible desde el principio y se habilita al enviarlo. El servidor vuelve a validar y consume el ticket de correo. El navegador no puede garantizar la ausencia de VPN. La ubicación requiere HTTPS/localhost y permiso; no demuestra residencia o identidad.

El CAPTCHA Turnstile se carga solamente al llegar al último paso y se valida en el backend al enviar. En desarrollo local (`dev`, opción explícita `solicitudes.security.local-testing=true`, IP loopback) utiliza claves oficiales de prueba y marca ese estado. Fuera de ese caso necesita las claves reales del servidor y el hostname permitido. No se usa el modo de prueba como protección antispam de producción.

Vite reenvía `/api` al origen definido en `VITE_API_URL` (por defecto `http://localhost:8081`). En producción configurar el reverse proxy para `/api`; no exponer credenciales de servicios en `VITE_*`. Mientras el backend/proveedor/SMTP no estén configurados, no se permite completar la solicitud: no hay respuesta simulada de éxito en la aplicación.

Pruebas:

```powershell
npm test -- src/features/configuracion/api/requestValidation.test.ts
npm run build
playwright-cli open http://localhost:5173/landing/solicitud-datos.html
playwright-cli run-code --filename tests/browser/solicitud-datos.playwright.js
```

El recorrido de navegador intercepta todos los endpoints del formulario y utiliza geolocalización y CAPTCHA de prueba; no envía correos ni crea solicitudes. Comprueba validaciones, campo de código visible, código incorrecto/correcto, bloqueo sin permiso/CAPTCHA, envío único, reinicio, clasificación de red simulada, traducción y anchos 390/768/1440. Es necesario tener Vite en 5173 y backend en 8081 para la prueba manual sin interceptores.
