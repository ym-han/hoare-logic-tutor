

## Key technical debt TODOs

1. Improve the answer checking and feedback code and the setting of styles that indicate which triple is relevant to the feedback
2. Improve interfaces for working with z3 / solvers
3. Improve the CSS setup: Use a design system more consistently; look into using 'fluid design'.
4. [Maybe] Replace the Lezer parser with something that returns a syntax tree that's more abstract (and hence less error prone to work with).


## Running on localhost

```
pnpm dev --open   
```

## Troubleshooting

If, when trying to open an exercises page, you run into an error like

```
The file does not exist at "hoare-logic-tutor/hl-tutor/node_modules/.vite/deps/chunk-5PZ5JJQH.js?v=29acd891" which is in the optimize deps directory. The dependency might be incompatible with the dep optimizer. Try adding it to `optimizeDeps.exclude`.
```

try clearing your browser cache.

## Codebase

### Conventions

#### $ interfix

Something like `get$Doc` means: this is a getter for a *signal*. I.e., the thing you're getting is a $state or $derived rune.

## Resources

### Re running z3 in browser

* https://github.com/Z3Prover/z3/issues/6768
* https://github.com/bakkot/client-side-typescript/
* https://github.com/bakkot/z3-web-demo/
* https://github.com/microsoft/z3guide/tree/main/website/static
