/* ==========================================================================
   mu_hud.js — Redirecionamento transparente para a Interface Oficial Lineage 2 (l2_hud.js)
   Substitui definitivamente os orbes e dragões do MU Online pela interface 1:1 do L2 Interlude.
   ========================================================================== */

import { L2Hud, MuHud as L2MuHud } from './l2_hud.js?v=40';

export const MuHud = L2MuHud;

window.L2Hud = L2Hud;
window.MuHud = MuHud;
