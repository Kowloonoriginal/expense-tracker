---
name: pr
description: Створи Pull Request на GitHub із заданою назвою та гілкою. Аргументи: /pr <title> [<branch>]
argument-hint: [title][branch, default: поточна гілка]
model: sonnet
allowed-tools: Bash(git *), Bash(gh *)
user-invocable: true
---

# PR Skill

Створи Pull Request на GitHub, дотримуючись домовленостей проєкту.

## Аргументи

- $0 — назва PR за Conventional Commits: `feat(scope): опис українською`
- $1 — вихідна гілка (опційно; якщо не вказана — поточна активна гілка)

## Алгоритм виконання

1. Виконай (`git branch --show-current`)

2. Переконайся, що гілка запушена на remote:

```bash
git status -sb
```

- Якщо немає upstream — запусти: `git push -u origin <branch>`

3. Отримай список комітів від `main` до HEAD:

```bash
git log main...HEAD --oneline
```

4. Отримай повний diff від `main`:

```bash
git diff main...HEAD --stat
```

5. На основі комітів і diff склади тіло PR:
   - **Підсумок**: 2–4 пункти — що реалізовано/виправлено (суть, а не файли)
   - **Зміни**: зачеплені модулі/ендпоінти (якщо є)
   - **План тестування**: короткий чекліст кроків для перевірки

6. Створи PR командою:

```bash
gh pr create --title "$0" --base main --head $1 --body "$(cat <<'EOF'
## Підсумок
- ...

## Зміни
- ...

## План тестування
- [ ] ...
EOF
)"
```

7. Поверни користувачу посилання на PR, яке видасть `gh pr create`.

## Правила

- Title якщо не передано — строго за Conventional Commits: `type(scope): опис українською`
- **Не мерж** PR автоматично
- **Не видаляй** гілку до явного прохання користувача
- Якщо PR для цієї гілки вже існує — повідом про це і виведи посилання на
  наявний PR (`gh pr view <branch>`)
