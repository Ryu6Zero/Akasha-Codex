# Product Manager Skill Pack Integration

## Purpose

This project uses a local product-manager skill pack as a working method for product specs, design direction, implementation planning, bug fixing, release checks, and feedback digestion.

## Installed Codex Skills

The Claude-oriented source skills were adapted into Codex personal skills with `pm-` prefixes:

- `pm-product-spec-builder`
- `pm-design-brief-builder`
- `pm-dev-planner`
- `pm-dev-builder`
- `pm-bug-fixer`
- `pm-code-review`
- `pm-release-builder`
- `pm-feedback-writer`
- `pm-evolution-engine`
- `pm-design-maker`
- `pm-skill-builder`

## Conversion Notes

- `SKILL.md` frontmatter names were prefixed with `pm-`.
- Templates were copied as local reference material.
- Claude hooks and Claude-specific automation were not installed because Codex does not use that hook mechanism.
- Claude-specific hard bindings were softened into procedural Codex guidance.

## Project-Level Fallback

The durable 绯典阁 product method lives in this folder:

```text
docs/product/
```

Future contributors can continue from `Product-Manual.md`, `Product-Spec.md`, `DEV-PLAN.md`, `Knowledge-Base-Development-Manual.md`, and `CHANGELOG.md` even if the original local skill pack is unavailable.
