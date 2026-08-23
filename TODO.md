# fabrica TODO

### project structure

- [ ] fix typescript import paths to disallow extension-less relative imports
- [ ] unify typescript config in general
- [ ] docs/ folder, symlink subproject readme's to folder
  - [ ] docs/CONTRIBUTING.md

### partdb

- [x] split out gobilda logic (eg rate limiting) so that other scrapers can use diff. rate liimts
- [ ] override layer for products
- [x] type exports from partdb package
  - [x] better inlining logic/build step for partdb in general? perhaps build not only json but also
- [ ] moar scrapers (rev, wcp)
- [x] inquire about scraping w/ gobilda team

### site

- [ ] draft astro action/search webpage for everything scraped so far
