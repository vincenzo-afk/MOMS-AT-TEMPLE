"""Temple of Monks Blender helper library.

Conventions (see docs/ART_BIBLE.md):
  * 1 Blender unit = 1 metre, Z up. Asset fronts face -Y (becomes +Z in glTF / Three.js).
  * Origins sit on the ground at the footprint centre unless stated otherwise.
  * Colour lives in a vertex-colour attribute "Col"; materials carry roughness/metalness.
  * Objects named COL_* are box collision proxies, WALK_* are walkable surfaces,
    STATE_<name>* are toggled by game state, WATER_* get the runtime water shader,
    SOCKET_* are empties marking attachment/interaction points.
"""
