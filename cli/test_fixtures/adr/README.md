# ADR test fixtures

`schema/adr.json` and `valid-adr.json` are copies of the same files in `shared/test_fixtures/adr/`. The CLI needs its own copy because vitest resolves relative to the test file. Replace both copies with the released schema when `@finos/calm-schema` ships `adr.json`.
