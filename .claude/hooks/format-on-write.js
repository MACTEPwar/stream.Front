#!/usr/bin/env node
/**
 * PostToolUse-хук: форматирует Prettier'ом файл, который только что записал агент.
 *
 * Зачем скрипт, а не однострочник в settings.json: сессия обычно открыта в
 * умбрелла-репо, а правятся файлы в сабмодулях `backend/` и `frontend/` — у
 * каждого свой `node_modules/prettier` и свой `.prettierrc`. Скрипт поднимается
 * от файла вверх и берёт ТОТ prettier и ТУ конфигурацию, которые относятся к
 * этому файлу.
 *
 * Файлы вне сабмодулей (спеки `specs/**.md`, `CLAUDE.md`, реестр блоков)
 * НЕ форматируются намеренно: в умбрелле нет `.prettierrc`, и prettier по
 * умолчанию перестроил бы таблицы и переносы в спеках, которые размечены вручную.
 * Условие «рядом есть и prettier, и его конфиг» и есть этот фильтр.
 *
 * Хук всегда завершается кодом 0: форматирование — удобство, а не проверка,
 * и оно не должно ронять правку.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const CONFIG_NAMES = [
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.js',
  '.prettierrc.cjs',
  'prettier.config.js',
  'prettier.config.cjs',
];

function readStdin() {
  let raw;
  try {
    raw = fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
  // BOM в начале: его дописывает всё, что перенаправляет вывод на Windows
  // (PowerShell при `|`), а `JSON.parse` на нём падает. Дешевле снять, чем
  // отлаживать «хук молча ничего не делает».
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

/** Ближайшая вверх по дереву папка, где есть И prettier, И его конфиг. */
function findPrettierRoot(startDir) {
  let dir = startDir;
  for (;;) {
    const bin = path.join(dir, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
    const hasConfig = CONFIG_NAMES.some((name) => fs.existsSync(path.join(dir, name)));
    if (hasConfig && fs.existsSync(bin)) {
      return { root: dir, bin };
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

function main() {
  const raw = readStdin();
  if (!raw.trim()) {
    return;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }

  const filePath =
    (payload.tool_response && payload.tool_response.filePath) ||
    (payload.tool_input && payload.tool_input.file_path);

  if (!filePath || !fs.existsSync(filePath)) {
    return;
  }

  const found = findPrettierRoot(path.dirname(path.resolve(filePath)));
  if (!found) {
    return;
  }

  // `--ignore-unknown` — файл неизвестного prettier'у типа просто пропускается,
  // без ошибки. `--ignore-path` не указываем: prettier сам подхватит
  // `.prettierignore` из найденного корня.
  spawnSync(process.execPath, [found.bin, '--write', '--ignore-unknown', filePath], {
    cwd: found.root,
    stdio: 'ignore',
  });
}

main();
