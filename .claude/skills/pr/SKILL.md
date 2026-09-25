---
name: pr
description: Створи Pull Request на GitHub із заданою назвою та гілкою. Аргументи: /pr <title> [<branch>]
argument-hint: [title] [branch, default: поточна гілка]
model: sonnet
allowed-tools: Bash(git *), Bash(gh *), Bash(bash *)
user-invocable: true
---

# PR Skill

Створи Pull Request на GitHub за правилами `docs/GIT_WORKFLOW.md`.

## Аргументи

- `$0` — назва PR за Conventional Commits: `type(scope): subject`
  (англійською, lowercase, ≤72 символи). Якщо не передано — склади сам.
- `$1` — вихідна гілка. Якщо не передано — поточна гілка.

## Контекст

Перевірка гілки: !`bash "${CLAUDE_SKILL_DIR}/scripts/validate.sh"`

Коміти від main: !`git log origin/main..HEAD --oneline`

Масштаб змін: !`git diff origin/main...HEAD --stat`

## Алгоритм

1. Прочитай «Перевірку гілки» вище:
   - `STOP:` — поясни користувачу причину і зупинись.
   - `EXISTS:` — PR вже є: запуш нові коміти і поверни наявне посилання.
   - `WARN:` — попередь, що незакомічені зміни в PR не потраплять.
2. Прочитай повний diff (`git diff origin/main...HEAD`) — опис пишеться
   з diff, а не з пам'яті про задачу.
3. Запуш гілку, якщо в неї немає upstream: `git push -u origin <branch>`.
4. Заповни @template.md, орієнтуючись на @examples/good.pr.md. Збережи
   тіло у тимчасовий файл.
5. Створи PR:
   `gh pr create --base main --head <branch> --title "<title>" --body-file <file>`
6. Поверни користувачу посилання на PR.

## Правила

- **Не мерж** PR автоматично.
- **Не видаляй** гілку без явного прохання користувача.
- **Не створюй** draft, якщо не попросили.
