import * as THREE from 'three';

export const FLOOR_HEIGHT = 1.65;
export const FLOOR_GAP = .8;

export function createHouseModel(scene, layout) {
  const { width, depth, columns, rows } = layout;
  const colors = { wall: 0xe8d5b6, trim: 0xf6e9ce, wood: 0x8c7355, roof: 0x4a6549, glass: 0x9dc7d1, green: 0x7a9870 };
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, ...extra });
  function box(parent, size, position, color, extra = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, extra));
    mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function label(parent, text, position, scale = 1) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f8f5eb'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#345139'; ctx.font = '600 36px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 48, 480);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
    sprite.position.set(...position); sprite.scale.set(1.45 * scale, .28 * scale, 1); parent.add(sprite); return sprite;
  }
  const building = new THREE.Group(); scene.add(building);
  const floors = [], outerWalls = [], roomLabels = [], floorSlabs = [];
  layout.floors.forEach((data, level) => {
    const floor = new THREE.Group(); floor.position.y = .24 + level * FLOOR_HEIGHT;
    floor.userData.floor = data.number; building.add(floor); floors.push(floor);
    floorSlabs.push(box(floor, [width + .15, .16, depth + .15], [0, 0, 0], colors.trim));
    outerWalls.push(box(floor, [width, 1.48, .1], [0, .8, -depth / 2], colors.wall, { transparent: true }));
    outerWalls.push(box(floor, [.1, 1.48, depth], [-width / 2, .8, 0], colors.wall, { transparent: true }));
    outerWalls.push(box(floor, [.1, 1.48, depth], [width / 2, .8, 0], colors.wall, { transparent: true }));
    outerWalls.push(box(floor, [width, 1.48, .1], [0, .8, depth / 2], colors.wall, { transparent: true }));
    label(floor, data.name, [0, 1.4, depth / 2 + .15], .8);
    data.rooms.forEach((room, index) => {
      const col = index % columns, row = Math.floor(index / columns);
      const x = (col - (columns - 1) / 2) * 1.7, z = ((rows - 1) / 2 - row) * 2.2;
      const cell = new THREE.Group(); cell.position.set(x, 0, z); cell.userData.roomId = room.MaPhong || room.maPhong || room.id;
      floor.add(cell);
      box(cell, [1.58, .025, 2.08], [0, .1, 0], index % 2 ? 0xd4c2a4 : 0xe6d9c2);
      box(cell, [.055, 1.1, 2.1], [-.82, .62, 0], colors.trim);
      box(cell, [1.6, 1.1, .055], [0, .62, -1.05], colors.trim);
      box(cell, [.95, .22, 1.4], [.12, .23, -.1], colors.wood);
      box(cell, [.92, .14, 1.36], [.12, .41, -.1], 0xf6f0e6);
      box(cell, [.92, .05, .8], [.12, .51, .17], level % 2 ? 0x9eae9a : 0xb3bccc);
      box(cell, [.58, .1, .27], [.12, .53, -.59], 0xffffff);
      box(cell, [.32, .45, .38], [-.55, .32, -.6], colors.wood);
      const text = room.TenPhong || room.tenPhong || cell.userData.roomId;
      const roomLabel = label(floor, text, [x, 1.2, z + .6], .85); roomLabel.visible = false; roomLabels.push(roomLabel);
      // Windows belong to actual rooms, never to empty grid cells or an empty floor.
      if (row === 0 || row === rows - 1) {
        const side = row === 0 ? 1 : -1, face = side * (depth / 2 + .08);
        const window = new THREE.Group(); floor.add(window);
        box(window, [.76, .9, .07], [x, .75, face], colors.trim);
        box(window, [.6, .76, .04], [x, .75, face + side * .05], colors.glass, { metalness: .1, roughness: .3 });
        box(window, [.025, .76, .025], [x, .75, face + side * .08], 0xfaf3e5);
        box(window, [.6, .025, .025], [x, .75, face + side * .08], 0xfaf3e5);
        for (const direction of [-1, 1]) box(window, [.12, .86, .05], [x + direction * .47, .75, face], colors.green);
        window.userData.exterior = true; outerWalls.push(...window.children);
      }
    });
  });
  // A separate entrance avoids replacing any of the modeled rooms with a doorway.
  const door = new THREE.Group(); door.position.set(width / 2 + .07, 0, 0); building.add(door);
  outerWalls.push(box(door, [.1, 1.12, .58], [0, .82, 0], colors.wood));
  box(building, [.45, .15, .85], [width / 2 + .25, .17, 0], colors.trim);
  const roof = new THREE.Group(); roof.position.y = .24 + floors.length * FLOOR_HEIGHT; building.add(roof);
  const shape = new THREE.Shape(); shape.moveTo(-depth / 2 - .23, 0); shape.lineTo(0, .9); shape.lineTo(depth / 2 + .23, 0); shape.closePath();
  const roofMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: width + .5, bevelEnabled: false }), material(colors.roof));
  roofMesh.rotation.y = Math.PI / 2; roofMesh.position.x = -width / 2 - .25; roofMesh.castShadow = true; roof.add(roofMesh);
  box(roof, [width + .6, .1, .1], [0, .92, 0], 0x3d553c);
  const radius = Math.hypot(width, depth) / 2 + .8;
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + .13, .18, 64), material(0xe8d2ad));
  pedestal.position.y = .08; pedestal.receiveShadow = true; scene.add(pedestal);
  for (const x of [-width / 2 - .55, width / 2 + .55]) {
    const tree = new THREE.Group(); tree.position.set(x, .2, depth / 2 - .4); scene.add(tree);
    box(tree, [.12, .6, .12], [0, .3, 0], colors.wood);
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(.4, 1), material(colors.green));
    crown.position.y = .9; crown.scale.y = 1.2; crown.castShadow = true; tree.add(crown);
  }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(radius * 5, radius * 5), new THREE.ShadowMaterial({ opacity: .12 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.03; shadow.receiveShadow = true; scene.add(shadow);
  return { building, floors, roof, outerWalls, roomLabels, floorSlabs, radius };
}
