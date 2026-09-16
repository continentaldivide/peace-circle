-- Peace Circle — avatar tints members can tell apart.
--
-- The six tints on offer were all olives and khakis, close enough that two
-- members' avatars could be indistinguishable side by side — the nearest pair
-- was barely a noticeable difference — and four were too light to carry white
-- initials legibly. `lib/welcome.ts` now offers six that differ in hue and in
-- lightness; its comment has the measurements.
--
-- This moves every stored tint to its counterpart in the new palette, position
-- for position, so nobody's avatar is left in a colour the picker no longer
-- offers. Each member keeps a tint of their own choosing in spirit: whoever
-- chose the first swatch still has the first swatch.
--
--   Moss  #6b7355 → #4f5b2b  Moss
--   Fern  #7e8466 → #1d5b5d  Lake
--   Olive #8c8a6e → #2d4668  Dusk
--   Linen #8f8b73 → #8b5a87  Plum
--   Clay  #9a8f7a → #a95d4f  Clay
--   Bark  #7d7566 → #4b3a26  Bark
--
-- A tint outside the old palette (only reachable by writing the column directly)
-- and a null tint are left alone. Data only; no types change.

update public.profiles
   set avatar_tint = case avatar_tint
         when '#6b7355' then '#4f5b2b'
         when '#7e8466' then '#1d5b5d'
         when '#8c8a6e' then '#2d4668'
         when '#8f8b73' then '#8b5a87'
         when '#9a8f7a' then '#a95d4f'
         when '#7d7566' then '#4b3a26'
       end
 where avatar_tint in (
   '#6b7355', '#7e8466', '#8c8a6e', '#8f8b73', '#9a8f7a', '#7d7566'
 );
