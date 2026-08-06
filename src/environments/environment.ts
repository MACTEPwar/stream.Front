export const environment = {
  // Хост берётся из адреса открытой страницы, а не жёстко `localhost` — иначе
  // при заходе с другого устройства по LAN-адресу (`http://192.168.x.x:4200`)
  // страница ходила бы в API на `localhost:3000`, и это уже другой сайт для
  // браузера: cookie-сессия JWT (`credentials: true`, см. `main.ts` бэка)
  // режется правилом SameSite и авторизация слетает на первом же запросе.
  // Порт отличается, но SameSite считается по хосту, а не по порту — с
  // одинаковым хостом cookie доходит.
  apiUrl: `http://${window.location.hostname}:3000`,
  googleClientId: '1053473725492-d17ui5avs25kfh9qiabt8tdslhnqdtn7.apps.googleusercontent.com',
  // TODO: заменить на реальный PrimeNG Community license key — см. stream.Front#75
  primengLicenseKey: 'eyJpZCI6IjgyYTE2YzUyLWUyNzEtNDRmOS04ZjE0LTUyNzM3MzA0ZjU3ZiIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3ODUwMjcwMTIsImV4cCI6MTgxNjU2MzAxMn0.vgTzybqsRnq7y8v-stxzNj8OD_omTK1KcHe9ru4jV41GXZFfvwtcnavFlpyArT4qRjlq7bpOs57_KxcnW5E8Ag',
};
