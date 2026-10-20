# Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Bare number thrown (e.g. `1124712`) | C++ exception pointer escaped; discard the instance. Use `isOpenScadWasmAbort()`. |
| Output appears on stdout | You passed your own `print`; the default is stderr. |
| `include <x.scad>` not found | Stage it via `extraFiles` at the MEMFS root. |
| `missing Wasm export: __main_argc_argv` | Custom `instantiateWasm` passed `{module, instance}`; the callback needs the `Instance`. |
| Build: `possibly undefined macro: LT_SYS_SYMBOL_USCORE` | Install `libltdl-dev`. |
| Build: weird failure after editing a running script | Don't edit `build-*.sh` while it runs; bash reads by byte offset. |
