# Hoare Logic Tutor

## How to install the dependencies

To make sure we're all using the same version of the same package manager:

* Enable corepack with `corepack enable`.
* Then `corepack install` to install the package manager used by this monorepo.

Finally, `pnpm install`.

## Running on localhost

```
pnpm dev --open   
```

## Synchronizing the private repo with the private mirror (while redacting private info)

### One-time config setup

First, note that the private repo has a `public` branch.

And it's helpful to have this in your git config:

```
[remote "public"]
	url = git@github.com:ym-han/hoare-logic-tutor.git
	push = refs/heads/public:refs/heads/public
```

We also want to run

```bash
git config --global merge.ours.driver true
```

because the .gitattributes file on the `public` branch tells Git to prefer 'our' version when merging `main` into `public` -- e..g, to keep the notes dir deleted.

### To sync changes after merging into `public`

You can use the sync-public script: 

```
chmod +x ./scripts/sync-public.hs 
./scripts/sync-public.hs
```

What the script does:

* Makes an orphan branch off `public` 
(to get a branch with no history) 
* and then `git push -f public <name of orphan branch>:public`

We can automate the running of the script in the future.

### What I've tried in the past

I tried `git-filter-repo` but eventually gave up --- it was taking 
a bit too much time to redact things like the other contributors.
Is definitely a promising approach, though; it just
seems to require a bit more time than I currently have.

## Key technical debt TODOs

1. Improve the answer checking and feedback code and the setting of styles that indicate which triple is relevant to the feedback
2. Improve interfaces for working with z3 / solvers
3. Improve the CSS setup: Use a design system more consistently; look into using 'fluid design'.
4. [Maybe] Replace the Lezer parser with something that returns a syntax tree that's more abstract (and hence less error prone to work with).


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
