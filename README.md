# Support 3 écrans 32" — fabrication package

Generated from `Support_ecrans.sc` (SolidCraft). The drawings and sheets are in French (shop language); this README is in English.

## Contents

| Path | What it is |
|---|---|
| `Support_ecrans.sc` | The SolidCraft design: assembly with 16 parts, 14 joints, 4 configurations (3/2 screens × clamp/grommet), 2 motion studies |
| `Plans_Support_ecrans.pdf` | 10 A3 drawing sheets: overview, dimensioned layout, every manufactured part (A01–A16), 3D-printed parts table, assembly notice with torques |
| `Nomenclature_Support_ecrans.xlsx` | Material sheet: parts list with masses (formulas), hardware list, raw-stock cut list (+10 %), 3D-print sheet with filament, load check. Blue cells are editable inputs |
| `STEP/Support_ecrans_assemblage.step` | Full assembly for any CAD tool or a fabricator |
| `STL/P01…P13_*.stl` | 3D-printable parts, one file per part type; the suffix `_xN` is the quantity to print. All checked watertight, size verified |
| `DXF/T01…T14_*.dxf` | Laser-cut profiles (mm). T01/T02 are true sheet-metal flat patterns with bend lines (layer BEND_*) and bend notes; `*_pliage.csv` = bend tables (k = 0.44, R5) |
| `Images/` | Renders and two animated GIFs (3→2 screens, tilt/rotation) |

## Part numbering

- **A01–A16**: steel / aluminium parts (laser, bending, welding, machining). Finish: powder coat RAL 9016.
- **P01–P13**: 3D-printed parts (PA12 / PETG / TPU).
- **T01–T14**: DXF laser files for the flat pieces of the A-parts.

## Things to decide or check before fabrication

1. **Mounting**: clamp (desk 10–85 mm) or grommet (hole Ø12, plate A15). The Ø10.5 hole in A01 is used only by the grommet.
2. **Thumbscrew M6 (QR)**: tap M6 in A13; A12 keeps its Ø6.5 clearance hole.
3. **Rotation pin retention**: add a circlip groove on the Ø8 pin (DIN 6799), or a M5 screw in the pin end. This is not modelled.
4. **VESA 75 screens**: add 4 × Ø5.5 on a 75 mm square on A12.
5. **Pivot friction**: tighten the M8 pivots (6–8 N·m) until each arm holds the screen; nylon washers/pads are consumables.
6. **2-screen mode** moves the screens 90 mm forward and the elbows go ~210 mm behind the desk edge: keep that clearance from the wall.
7. Mast stress at the worst case (one 9 kg screen at 765 mm): about 22 MPa, so a safety factor of about 10 on S235 (sheet `Charge`).

## Website (GitHub Pages)

`site/` is a static page with an interactive three.js view of the assembly (real joints, pull-apart view, part picking) and download links to every file above. `.github/workflows/pages.yml` builds and deploys it on every push to `main` or `master`.

- **First time**: on GitHub, open *Settings → Pages* and set *Source* to **GitHub Actions**. The site appears at `https://<user>.github.io/<repo>/`.
- **Preview locally**: `node tools/build-site.mjs` then serve `_site/` (for example `python -m http.server -d _site`) and open http://localhost:8000. It must be served over http, not opened as a file.
- **After changing the STEP**: regenerate the web model with `npm i occt-import-js@0.0.23` then `node tools/step_to_glb.cjs STEP/Support_ecrans_assemblage.step site/model`.
