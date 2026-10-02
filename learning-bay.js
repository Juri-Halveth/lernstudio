/* Original procedural harbor art. Three.js 0.186.1 (MIT): vendor/three/LICENSE.txt.
 * Classic script: await LernBay.mount(host, { phase: 0, reducedMotion: false }).
 * Give host a size; transparent: true optionally preserves its background.
 * The host owns learning controls. Canvas data-* values are output diagnostics.
 * setReducedMotion(true) keeps phase/pulse renders; setPaused(true) suspends all.
 */
(function (root) {
  'use strict';

  const scriptURL = document.currentScript?.src || document.baseURI;
  const threeURL = new URL('./vendor/three/three.module.js', scriptURL).href;
  const mounts = new WeakMap();
  const SKY = '#191d1e';
  let threePromise;

  function phaseValue(value) {
    if (!Number.isInteger(value) || value < 0 || value > 2) {
      throw new RangeError('LernBay phase must be the integer 0, 1, or 2.');
    }
    return value;
  }

  function booleanValue(value, name) {
    if (typeof value !== 'boolean') throw new TypeError('LernBay ' + name + ' must be boolean.');
    return value;
  }

  function element(doc, tag, style, parent) {
    const node = doc.createElement(tag);
    Object.assign(node.style, style);
    if (parent) parent.appendChild(node);
    return node;
  }

  // This small CSS harbor remains useful when a GPU or the module is unavailable.
  function fallbackHarbor(doc, parent) {
    const view = element(doc, 'div', {
      position: 'absolute', inset: '0', overflow: 'hidden', pointerEvents: 'none'
    }, parent);
    view.className = 'lern-bay-fallback';
    const map = element(doc, 'div', {
      position: 'absolute', width: '88%', height: '64%', left: '6%', top: '17%'
    }, view);
    const bridges = [
      'polygon(31% 66%, 33% 67%, 47% 45%, 45% 44%)',
      'polygon(58% 44%, 60% 45%, 76% 20%, 74% 19%)'
    ].map(clipPath => {
      return element(doc, 'i', {
        position: 'absolute', inset: '0', background: '#c0a283', clipPath
      }, map);
    });
    const decks = [[12, 60, 27], [39, 36, 27], [67, 9, 29]].map(([x, y, width]) => {
      const deck = element(doc, 'div', {
        position: 'absolute', left: x + '%', top: y + '%', width: width + '%',
        height: '31%', background: '#4f605e',
        clipPath: 'polygon(0 24%, 28% 0, 80% 6%, 100% 28%, 81% 75%, 48% 100%, 16% 74%)'
      }, map);
      element(doc, 'i', {
        position: 'absolute', inset: '0 0 48%', background: '#adc3b8',
        clipPath: 'polygon(0 44%, 28% 0, 80% 11%, 100% 54%, 68% 100%, 17% 88%)'
      }, deck);
      return deck;
    });
    const tower = element(doc, 'div', {
      position: 'absolute', left: '79%', top: '3%', width: '5%', height: '23%',
      background: '#d6e6df', borderInline: '3px solid #efc98b',
      clipPath: 'polygon(20% 0, 80% 0, 100% 100%, 0 100%)'
    }, map);
    const beacon = element(doc, 'div', {
      position: 'absolute', left: '77%', top: '-7%', width: '9%', aspectRatio: '1',
      background: '#fc9687', clipPath: 'polygon(50% 0, 65% 35%, 100% 50%, 65% 65%, 50% 100%, 35% 65%, 0 50%, 35% 35%)'
    }, map);
    const traveler = element(doc, 'div', {
      position: 'absolute', left: '23%', top: '62%', width: '13px', height: '22px',
      background: '#ffcf88', borderTop: '7px solid #f0f2df', borderRadius: '3px 3px 0 0'
    }, map);
    return {
      view,
      update(phase, success) {
        const colors = ['#fc9687', '#ffd58b', '#7ae8c6'];
        beacon.style.background = success === false ? colors[0] : colors[phase];
        tower.style.height = (23 + phase * 3) + '%';
        tower.style.top = (3 - phase * 3) + '%';
        beacon.style.top = (-7 - phase * 3) + '%';
        traveler.style.left = [23, 50, 76][phase] + '%';
        traveler.style.top = [62, 37, 13][phase] + '%';
        bridges.forEach((bridge, index) => {
          bridge.style.background = phase > index ? '#7ae8c6' : '#c0a283';
        });
        decks.forEach((deck, index) => { deck.style.filter = index > phase ? 'brightness(.8)' : 'none'; });
      }
    };
  }

  function buildHarbor(T, scene, resources) {
    const geometry = value => { resources.geometries.add(value); return value; };
    const material = value => { resources.materials.add(value); return value; };
    const solid = color => material(new T.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0.08, flatShading: true }));
    const ink = (color, opacity = 1) => material(new T.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity === 1, toneMapped: false }));
    const M = {
      rock: solid('#414d4c'), rockDark: solid('#303937'), edge: solid('#7a9690'),
      deck: solid('#bbc9bb'), deckLight: solid('#e0e6d6'), path: solid('#4e6561'),
      structure: solid('#dce7df'), metal: solid('#4d6263'), gold: solid('#dbb778'),
      coral: solid('#ed8b7f'), mint: solid('#6ccaae'), violet: solid('#a89acb'),
      night: solid('#243532'), glass: solid('#29474b'),
      lightMint: ink('#94f4d1'), lightCoral: ink('#ffac92'), lightGold: ink('#ffe0a0'),
      lightViolet: ink('#c7b4ff'), dim: ink('#55736b'),
      shade: ink('#172a25', 0.18)
    };
    const G = {
      box: geometry(new T.BoxGeometry(1, 1, 1)),
      cylinder: geometry(new T.CylinderGeometry(1, 1, 1, 10)),
      taper: geometry(new T.CylinderGeometry(0.7, 1, 1, 6)),
      cone: geometry(new T.ConeGeometry(1, 1, 5)),
      crystal: geometry(new T.OctahedronGeometry(1)),
      ring: geometry(new T.TorusGeometry(1, 0.027, 5, 64)),
      disk: geometry(new T.CircleGeometry(1, 16))
    };
    const world = new T.Group();
    const architecture = new T.Group();
    world.add(architecture);
    scene.add(world);

    function mesh(parent, geo, mat, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
      const item = new T.Mesh(geo, mat);
      item.position.set(...position);
      item.scale.set(...scale);
      item.rotation.set(...rotation);
      item.castShadow = !mat.transparent && !mat.isMeshBasicMaterial;
      item.receiveShadow = !mat.isMeshBasicMaterial;
      parent.add(item);
      return item;
    }
    const box = (parent, mat, position, scale, rotation) => mesh(parent, G.box, mat, position, scale, rotation);
    function beam(parent, a, b, width, mat, depth = width) {
      const start = new T.Vector3(...a), end = new T.Vector3(...b);
      const item = box(parent, mat, start.clone().add(end).multiplyScalar(0.5).toArray(), [width, start.distanceTo(end), depth]);
      item.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), end.sub(start).normalize());
      return item;
    }
    function groupAt(parent, x, y, z) {
      const group = new T.Group();
      group.position.set(x, y, z);
      parent.add(group);
      return group;
    }
    function ring(parent, mat, position, radius, rotation = [-Math.PI / 2, 0, 0]) {
      return mesh(parent, G.ring, mat, position, [radius, radius, radius], rotation);
    }
    function shadow(parent, x, y, z, rx, rz) {
      return mesh(parent, G.disk, M.shade, [x, y, z], [rx, rz, 1], [-Math.PI / 2, 0, 0]);
    }

    let seed = 41377;
    function random() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    function rockGeometry(radius) {
      const count = 10, vertices = [], rings = [];
      const shape = Array.from({ length: count }, () => 0.83 + random() * 0.25);
      [[1, -0.22], [0.88, -1.1], [0.25, -3.0]].forEach(([r, y], level) => {
        rings.push(shape.map((factor, i) => {
          const angle = i / count * Math.PI * 2;
          return [Math.cos(angle) * radius * factor * r + level * 0.09, y + (level ? random() * 0.25 : 0), Math.sin(angle) * radius * factor * r];
        }));
      });
      for (let level = 0; level < 2; level++) {
        for (let i = 0; i < count; i++) {
          const next = (i + 1) % count;
          vertices.push(...rings[level][i], ...rings[level + 1][i], ...rings[level][next]);
          vertices.push(...rings[level][next], ...rings[level + 1][i], ...rings[level + 1][next]);
        }
      }
      for (let i = 0; i < count; i++) vertices.push(...rings[2][i], 0.2, -3.5, 0, ...rings[2][(i + 1) % count]);
      const result = new T.BufferGeometry();
      result.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
      result.computeVertexNormals();
      return geometry(result);
    }

    const islands = [
      { x: -6.4, y: 0, z: 3.4, r: 2.65, color: M.coral },
      { x: 0, y: 0.65, z: -0.05, r: 2.6, color: M.mint },
      { x: 6.3, y: 1.3, z: -3.5, r: 2.95, color: M.violet },
      { x: -1.8, y: 0.1, z: -5.7, r: 1.42, color: M.gold }
    ];
    const framing = [];
    islands.forEach((island, index) => {
      const { x, y, z, r } = island;
      const group = groupAt(architecture, x, y, z);
      mesh(group, rockGeometry(r), M.rock, [0, 0, 0]);
      mesh(group, G.cylinder, M.rockDark, [0, -0.42, 0], [r * 1.01, 0.23, r * 1.01]);
      mesh(group, G.cylinder, island.color, [0, -0.21, 0], [r * 1.02, 0.12, r * 1.02]);
      mesh(group, G.cylinder, M.edge, [0, -0.12, 0], [r * 1.03, 0.1, r * 1.03]);
      mesh(group, G.cylinder, M.deck, [0, -0.035, 0], [r, 0.09, r]);
      for (let side = 0; side < 10; side++) {
        const a = side / 10 * Math.PI * 2;
        box(group, M.metal, [Math.cos(a) * r * 0.9, -0.51, Math.sin(a) * r * 0.9], [0.1, 0.72, 0.18], [0, -a, 0.15]);
        if (side % 2 === 0) {
          box(group, M.lightMint, [Math.cos(a) * r * 0.94, -0.17, Math.sin(a) * r * 0.94], [0.21, 0.055, 0.06], [0, -a + Math.PI / 2, 0]);
        }
        framing.push(new T.Vector3(x + Math.cos(a) * (r + 0.3), y + 0.5, z + Math.sin(a) * (r + 0.3)));
      }
      framing.push(new T.Vector3(x, y - 3.5, z));
      for (let j = 0; j < (index === 3 ? 4 : 9); j++) {
        const a = 3.2 + j * 0.13, radius = r * (0.78 + random() * 0.12);
        const px = Math.cos(a) * radius, pz = Math.sin(a) * radius;
        const plant = groupAt(group, px, 0.04, pz);
        mesh(plant, G.cylinder, M.night, [0, 0.03, 0], [0.25, 0.09, 0.2]);
        for (let leaf = 0; leaf < 3; leaf++) {
          mesh(plant, G.crystal, j % 3 ? M.mint : M.coral, [(leaf - 1) * 0.11, 0.22 + random() * 0.17, 0], [0.09, 0.26 + random() * 0.14, 0.09], [0, leaf, (1 - leaf) * 0.35]);
        }
      }
    });

    function bridge(a, b, width, rails = true) {
      const start = new T.Vector3(...a), end = new T.Vector3(...b);
      const tangent = end.clone().sub(start), length = tangent.length();
      const side = new T.Vector3(-tangent.z, 0, tangent.x).normalize();
      const angle = Math.atan2(tangent.x, tangent.z);
      const steps = Math.ceil(length / 0.29);
      for (let i = 0; i <= steps; i++) {
        const point = start.clone().lerp(end, i / steps);
        box(architecture, i % 3 ? M.deck : M.deckLight, point.toArray(), [width, 0.15, length / steps * 0.97], [0, angle, 0]);
        if (rails && i % 3 === 0) {
          for (const sign of [-1, 1]) {
            const p = point.clone().addScaledVector(side, sign * width * 0.45);
            box(architecture, M.metal, [p.x, p.y + 0.34, p.z], [0.07, 0.69, 0.07]);
            box(architecture, M.lightGold, [p.x, p.y + 0.69, p.z], [0.1, 0.07, 0.1]);
          }
        }
      }
      for (const sign of [-1, 1]) {
        const p = start.clone().addScaledVector(side, sign * width * 0.44);
        const q = end.clone().addScaledVector(side, sign * width * 0.44);
        beam(architecture, [p.x, p.y - 0.16, p.z], [q.x, q.y - 0.16, q.z], 0.11, M.metal);
        if (rails) beam(architecture, [p.x, p.y + 0.68, p.z], [q.x, q.y + 0.68, q.z], 0.045, M.gold);
      }
    }
    bridge([-4.5, 0.04, 2.4], [-1.9, 0.69, 1.02], 1.22);
    bridge([2.05, 0.69, -1.13], [4.1, 1.34, -2.34], 1.22);
    bridge([-0.6, 0.67, -2.05], [-1.52, 0.14, -4.55], 0.74, false);

    // A single continuous promenade and a single destination, with three stations.
    const route = new T.CatmullRomCurve3([
      new T.Vector3(-6.25, 0.085, 3.38), new T.Vector3(-4.55, 0.085, 2.43),
      new T.Vector3(-1.85, 0.735, 1.0), new T.Vector3(0, 0.735, 0),
      new T.Vector3(2.02, 0.735, -1.12), new T.Vector3(4.14, 1.385, -2.35),
      new T.Vector3(4.7, 1.385, -2.65)
    ], false, 'centripetal');
    const pathMaterial = material(new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }));
    const pathMarks = new T.InstancedMesh(G.box, pathMaterial, 67);
    resources.instances.add(pathMarks);
    const marker = new T.Object3D();
    for (let i = 0; i < pathMarks.count; i++) {
      const t = i / (pathMarks.count - 1), p = route.getPointAt(t), tangent = route.getTangentAt(t);
      marker.position.copy(p);
      marker.position.y += 0.025;
      marker.rotation.y = Math.atan2(tangent.x, tangent.z);
      marker.scale.set(i % 5 === 0 ? 0.4 : 0.19, 0.025, 0.075);
      marker.updateMatrix();
      pathMarks.setMatrixAt(i, marker.matrix);
    }
    pathMarks.instanceMatrix.needsUpdate = true;
    pathMarks.computeBoundingSphere();
    world.add(pathMarks);

    // The arrival berth, including its original folded sail and tied-down skiff.
    const berth = groupAt(architecture, -7.25, 0.05, 4.08);
    for (let i = 0; i < 6; i++) box(berth, M.gold, [0, -0.03, i * 0.27], [1.45, 0.13, 0.23]);
    beam(berth, [-0.78, 0, -0.2], [-0.78, 0, 1.7], 0.11, M.metal);
    beam(berth, [0.78, 0, -0.2], [0.78, 0, 1.7], 0.11, M.metal);
    const skiff = groupAt(world, -7.22, 0.2, 4.62);
    mesh(skiff, G.crystal, M.structure, [0, 0.19, 0], [0.56, 0.25, 1.17]);
    mesh(skiff, G.crystal, M.coral, [0, 0.23, 0], [0.43, 0.2, 1.0]);
    box(skiff, M.gold, [0, 1.04, 0], [0.055, 1.9, 0.055]);
    const sailShape = new T.Shape();
    sailShape.moveTo(0, 0); sailShape.lineTo(1.12, 0.2); sailShape.lineTo(0, 1.65); sailShape.closePath();
    const sailMaterial = solid('#fca18e'); sailMaterial.side = T.DoubleSide;
    const sail = mesh(skiff, geometry(new T.ShapeGeometry(sailShape)), sailMaterial, [0.03, 0.53, 0.025], [1, 1, 1], [0, 0.52, 0]);
    beam(architecture, [-6.4, 0.28, 4.4], [-7.15, 0.41, 4.95], 0.025, M.gold);
    framing.push(new T.Vector3(-7.5, 2.7, 5.85));

    // Open-air learning pavilion: a readable desk, ribs, and folding solar roof.
    const pavilion = groupAt(architecture, -0.55, 0.69, -0.95);
    shadow(pavilion, 0, 0.012, -0.05, 1.35, 0.85);
    for (const x of [-0.85, 0.85]) {
      box(pavilion, M.structure, [x, 0.72, 0], [0.11, 1.44, 0.12]);
      box(pavilion, M.lightMint, [x, 0.75, 0.072], [0.055, 0.7, 0.02]);
    }
    box(pavilion, M.metal, [0, 0.39, 0.25], [1.35, 0.12, 0.65], [-0.18, 0, 0]);
    box(pavilion, M.gold, [0, 0.2, 0.25], [0.18, 0.45, 0.42]);
    box(pavilion, M.glass, [0, 0.48, 0.22], [0.97, 0.025, 0.41], [-0.18, 0, 0]);
    for (let i = 0; i < 4; i++) box(pavilion, M.lightMint, [-0.3 + i * 0.18, 0.506, 0.23], [0.055, 0.016, 0.18 + (i % 2) * 0.1], [-0.18, 0, 0]);
    beam(pavilion, [-1, 1.46, 0], [1, 1.46, 0], 0.13, M.structure);
    const roof = groupAt(world, -0.55, 2.24, -0.95);
    for (const side of [-1, 1]) {
      const wing = groupAt(roof, side * 0.2, 0, 0);
      wing.rotation.z = side * 0.17;
      box(wing, M.mint, [side * 0.59, 0, 0], [1.17, 0.085, 1.55]);
      for (let i = 0; i < 5; i++) box(wing, M.structure, [side * (0.12 + i * 0.23), 0.055, 0], [0.03, 0.035, 1.47]);
      box(wing, M.lightGold, [side * 1.16, 0.04, 0], [0.035, 0.06, 1.5]);
    }

    // A secondary, unlit telescope pier has no competing beacon.
    const telescope = groupAt(architecture, -1.8, 0.18, -5.7);
    shadow(telescope, 0, 0.006, 0, 0.77, 0.5);
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2;
      beam(telescope, [Math.cos(a) * 0.58, 0.03, Math.sin(a) * 0.58], [0, 0.88, 0], 0.1, M.gold);
    }
    const tube = groupAt(telescope, 0, 1.0, 0);
    tube.rotation.set(0.7, 0.3, -0.7);
    mesh(tube, G.cylinder, M.structure, [0, 0.15, 0], [0.29, 1.3, 0.29]);
    mesh(tube, G.cylinder, M.glass, [0, 0.82, 0], [0.24, 0.025, 0.24]);
    mesh(tube, G.cylinder, M.gold, [0, 0.75, 0], [0.33, 0.12, 0.33]);
    box(tube, M.coral, [0.33, 0.2, 0], [0.12, 0.37, 0.12]);
    framing.push(new T.Vector3(-1.8, 2.4, -5.7));

    // The destination is a physical armillary lighthouse with an opening crown.
    const lighthouse = groupAt(architecture, 6.3, 1.34, -3.5);
    shadow(lighthouse, 0, 0.014, 0, 1.65, 1.6);
    for (let step = 0; step < 3; step++) {
      mesh(lighthouse, G.cylinder, step === 1 ? M.gold : M.structure, [0, step * 0.16, 0], [1.55 - step * 0.2, 0.14, 1.55 - step * 0.2]);
    }
    ring(lighthouse, M.lightViolet, [0, 0.37, 0], 1.03);
    mesh(lighthouse, G.taper, M.structure, [0, 1.36, 0], [0.63, 2.1, 0.63]);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2, x = Math.cos(a), z = Math.sin(a);
      beam(lighthouse, [x * 0.8, 0.35, z * 0.8], [x * 0.54, 2.75, z * 0.54], 0.11, M.gold);
      beam(lighthouse, [x * 0.4, 0.53, z * 0.4], [x * 0.32, 2.0, z * 0.32], 0.045, M.lightMint);
    }
    mesh(lighthouse, G.cylinder, M.gold, [0, 2.53, 0], [0.98, 0.16, 0.98]);
    mesh(lighthouse, G.cylinder, M.night, [0, 2.64, 0], [0.8, 0.12, 0.8]);
    const crown = groupAt(world, 6.3, 4.05, -3.5);
    const beaconMaterial = ink('#ffad93');
    const beacon = mesh(crown, G.crystal, beaconMaterial, [0, 0.59, 0], [0.32, 0.79, 0.32]);
    const gimbal = groupAt(crown, 0, 0.6, 0);
    ring(gimbal, M.gold, [0, 0, 0], 1.25, [0.52, 0.15, 0]);
    ring(gimbal, M.structure, [0, 0, 0], 1.05, [0.65, 1.5, 0]);
    const halo = ring(gimbal, M.lightViolet, [0, 0, 0], 1.46, [1.1, 0.25, 0.4]);
    const petals = [];
    for (let i = 0; i < 4; i++) {
      const hinge = groupAt(crown, 0, 0, 0);
      hinge.rotation.y = i * Math.PI / 2 + Math.PI / 4;
      const petal = groupAt(hinge, 0, 0, 0.73);
      mesh(petal, G.cone, i % 2 ? M.violet : M.structure, [0, 0.5, 0], [0.2, 1.1, 0.14]);
      box(petal, M.lightGold, [0, 0.4, 0.12], [0.045, 0.7, 0.035]);
      petals.push(petal);
    }
    const pennants = [];
    for (const side of [-1, 1]) {
      const mast = groupAt(architecture, 6.3 + side * 1.86, 1.33, -3.9);
      box(mast, M.gold, [0, 1.14, 0], [0.07, 2.28, 0.07]);
      const flag = groupAt(world, 6.3 + side * 1.86, 3.43, -3.9);
      box(flag, side === 1 ? M.coral : M.violet, [side * 0.31, -0.3, 0], [0.58, 0.65, 0.04]);
      pennants.push(flag);
    }
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      framing.push(new T.Vector3(6.3 + Math.cos(a) * 1.7, 6.4, -3.5 + Math.sin(a) * 1.7));
    }

    const traveler = groupAt(world, -6.25, 0.085, 3.38);
    shadow(traveler, 0, 0.002, 0, 0.4, 0.3);
    const body = groupAt(traveler, 0, 0, 0);
    box(body, M.gold, [0, 0.45, 0], [0.36, 0.46, 0.3]);
    box(body, M.structure, [0, 0.78, 0], [0.42, 0.33, 0.38]);
    box(body, M.glass, [0, 0.79, 0.197], [0.33, 0.15, 0.024]);
    box(body, M.lightMint, [0.11, 0.8, 0.211], [0.045, 0.035, 0.012]);
    box(body, M.coral, [0, 0.45, -0.2], [0.28, 0.29, 0.15]);
    for (const side of [-1, 1]) {
      box(body, M.metal, [side * 0.105, 0.14, 0.03], [0.14, 0.25, 0.23]);
      box(body, M.structure, [side * 0.24, 0.42, 0.03], [0.12, 0.32, 0.15], [0, 0, side * 0.13]);
    }
    const feedbackMaterial = ink('#94f4d1', 0.6);
    const feedback = mesh(world, geometry(new T.RingGeometry(0.57, 0.63, 6)), feedbackMaterial, [0, 0, 0], [1, 1, 1], [-Math.PI / 2, 0, 0]);
    feedback.visible = false;

    // Batch fixed architecture by primitive/material; animation keeps small groups.
    architecture.updateMatrixWorld(true);
    const batches = new Map();
    architecture.traverse(item => {
      if (!item.isMesh) return;
      const key = item.geometry.uuid + ':' + item.material.uuid;
      if (!batches.has(key)) batches.set(key, { geometry: item.geometry, material: item.material, matrices: [], shadow: item.castShadow });
      batches.get(key).matrices.push(item.matrixWorld.clone());
    });
    architecture.clear();
    batches.forEach(batch => {
      const instance = new T.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
      resources.instances.add(instance);
      batch.matrices.forEach((matrix, i) => instance.setMatrixAt(i, matrix));
      instance.instanceMatrix.needsUpdate = true;
      instance.castShadow = batch.shadow;
      instance.receiveShadow = !batch.material.isMeshBasicMaterial;
      instance.computeBoundingSphere();
      architecture.add(instance);
    });

    const colors = [new T.Color('#ffad93'), new T.Color('#ffe0a0'), new T.Color('#91f2ce')];
    const dim = new T.Color('#55736b');
    const mint = new T.Color('#91f2ce');
    let lastPhase = -1;
    return {
      world, framing,
      update(phase, progress, time, pulseAge, success, motion) {
        if (phase !== lastPhase) {
          for (let i = 0; i < pathMarks.count; i++) {
            const part = i / (pathMarks.count - 1);
            const color = phase === 2 || (phase === 1 && part < 0.5) ? mint : part < (phase + 1) / 2 ? colors[phase] : dim;
            pathMarks.setColorAt(i, color);
          }
          pathMarks.instanceColor.needsUpdate = true;
          beaconMaterial.color.copy(colors[phase]);
          lastPhase = phase;
        }
        roof.scale.x = 0.38 + Math.min(progress, 1) * 0.62;
        crown.position.y = 4.05 + progress * 0.44;
        petals.forEach(petal => { petal.rotation.x = 0.1 + progress * 0.47; });
        gimbal.rotation.y = progress * 0.42 + time * 0.1;
        halo.rotation.z = 0.4 + time * 0.06;
        beacon.rotation.y = time * 0.22;
        const t = progress / 2, p = route.getPointAt(t), tangent = route.getTangentAt(t);
        traveler.position.copy(p);
        traveler.rotation.y = Math.atan2(tangent.x, tangent.z);
        body.position.y = motion ? Math.sin(time * 1.9) * 0.025 : 0;
        skiff.rotation.z = motion ? Math.sin(time * 0.85) * 0.035 : 0;
        sail.rotation.y = 0.52 + (motion ? Math.sin(time) * 0.07 : 0);
        pennants.forEach((flag, i) => { flag.rotation.y = motion ? Math.sin(time * 0.8 + i) * 0.07 : 0; });
        feedback.visible = pulseAge < 1.1;
        if (feedback.visible) {
          feedback.position.copy(p); feedback.position.y += 0.04;
          feedback.scale.setScalar(motion ? 1 + pulseAge * 1.65 : 1.6);
          feedbackMaterial.opacity = motion ? Math.max(0, 0.68 * (1 - pulseAge / 1.1)) : 0.6;
          feedbackMaterial.color.set(success ? '#94f4d1' : '#ffac92');
          beacon.scale.setScalar(success && motion ? 1 + Math.sin(pulseAge / 1.1 * Math.PI) * 0.1 : 1);
          beacon.scale.multiply(new T.Vector3(0.32, 0.79, 0.32));
        } else beacon.scale.set(0.32, 0.79, 0.32);
      }
    };
  }

  async function mount(container, options = {}) {
    if (!container || container.nodeType !== 1 || !container.ownerDocument) throw new TypeError('LernBay.mount needs a host element.');
    if (!container.ownerDocument.defaultView) {
      throw new TypeError('LernBay.mount needs a host adopted into a live document; append its template fragment before mounting.');
    }
    let phase = phaseValue(options.phase === undefined ? 0 : options.phase);
    let requestedReduced = options.reducedMotion === undefined ? false : booleanValue(options.reducedMotion, 'reducedMotion');
    const transparent = options.transparent === undefined ? false : booleanValue(options.transparent, 'transparent');
    mounts.get(container)?.dispose();
    const doc = container.ownerDocument, win = doc.defaultView;
    const surface = element(doc, 'div', {
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      isolation: 'isolate', background: transparent ? 'transparent' : SKY
    }, container);
    surface.className = 'lern-bay-view';
    surface.setAttribute('aria-hidden', 'true');
    const fallback = fallbackHarbor(doc, surface);
    const canvas = element(doc, 'canvas', {
      position: 'absolute', inset: '0', display: 'block', width: '100%', height: '100%',
      outline: 'none', opacity: '0', pointerEvents: 'none'
    }, surface);
    canvas.className = 'lern-bay-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const resources = { geometries: new Set(), materials: new Set(), instances: new Set() };
    const motionQuery = win.matchMedia?.('(prefers-reduced-motion: reduce)');
    let reduced = requestedReduced || !!motionQuery?.matches;
    let disposed = false, paused = false, contextLost = false, failure = '';
    let renderer, scene, camera, harbor, stars, T, observer;
    let frame = 0, frames = 0, previousTime = 0, elapsed = 0;
    let progress = phase, pulseAge = Infinity, success = true, width = 0, height = 0;
    let pixelRatio = 1, bufferWidth = 0, bufferHeight = 0, bufferDPR = 0;
    let targetX = 0, targetY = 0, pointerX = 0, pointerY = 0;
    let shadowDirty = true;

    function diagnostic(name, value) {
      const text = String(value);
      if (canvas.dataset[name] !== text) canvas.dataset[name] = text;
    }
    function state(value) {
      diagnostic('renderState', value);
      surface.dataset.renderState = value;
    }
    function cancelFrame() {
      if (frame) win.cancelAnimationFrame(frame);
      frame = 0; previousTime = 0;
    }
    function freeGPU() {
      scene?.traverse(item => { item.shadow?.dispose(); });
      resources.instances.forEach(item => item.dispose());
      resources.geometries.forEach(item => item.dispose());
      resources.materials.forEach(item => item.dispose());
      resources.instances.clear(); resources.geometries.clear(); resources.materials.clear();
      if (renderer) {
        renderer.setAnimationLoop(null);
        renderer.dispose();
        renderer.forceContextLoss();
      }
      renderer = null;
      scene?.clear();
      scene = null; harbor = null; camera = null; stars = null;
    }
    function fail(reason) {
      failure = reason;
      cancelFrame();
      canvas.style.opacity = '0'; fallback.view.hidden = false;
      fallback.update(phase, success);
      state(reason);
    }
    function active() {
      return !disposed && !failure && !paused && !doc.hidden && !contextLost && !!renderer && width > 0 && height > 0;
    }
    function draw() {
      if (!active()) return;
      try {
        // Defer buffer replacement while paused/hidden so the last frame survives.
        if (width !== bufferWidth || height !== bufferHeight || pixelRatio !== bufferDPR) {
          renderer.setPixelRatio(pixelRatio);
          renderer.setSize(width, height, false);
          fitCamera();
          bufferWidth = width; bufferHeight = height; bufferDPR = pixelRatio;
          shadowDirty = true;
        }
        harbor.update(phase, progress, elapsed, pulseAge, success, !reduced);
        harbor.world.rotation.y = pointerX * 0.028;
        harbor.world.rotation.x = pointerY * 0.012;
        renderer.shadowMap.needsUpdate = shadowDirty;
        renderer.render(scene, camera);
        shadowDirty = false;
        frames++;
        diagnostic('frames', frames);
        diagnostic('drawCalls', renderer.info.render.calls);
        diagnostic('triangles', renderer.info.render.triangles);
        diagnostic('progress', progress.toFixed(3));
        canvas.style.opacity = '1'; fallback.view.hidden = true;
      } catch (_) { fail('fallback-render'); }
    }
    function tick(now) {
      frame = 0;
      if (!active() || reduced) return;
      if (!previousTime || now - previousTime >= 1000 / 30 - 0.5) {
        const delta = previousTime ? Math.min((now - previousTime) / 1000, 0.075) : 0;
        previousTime = now;
        elapsed += delta;
        if (Number.isFinite(pulseAge)) pulseAge += delta;
        const previousProgress = progress;
        progress += (phase - progress) * (1 - Math.exp(-delta * 5));
        if (Math.abs(phase - progress) < 0.001) progress = phase;
        pointerX += (targetX - pointerX) * (1 - Math.exp(-delta * 4));
        pointerY += (targetY - pointerY) * (1 - Math.exp(-delta * 4));
        if (progress !== previousProgress) shadowDirty = true;
        draw();
      }
      if (active()) frame = win.requestAnimationFrame(tick);
    }
    function synchronize(render = true) {
      cancelFrame();
      diagnostic('paused', paused);
      diagnostic('motion', reduced ? 'reduced' : 'animated');
      if (disposed) { state('disposed'); return; }
      if (failure) { state(failure); return; }
      if (contextLost) { state('context-lost'); return; }
      if (!renderer) { state('loading'); return; }
      if (doc.hidden) { state('hidden'); return; }
      if (paused) { state('paused'); return; }
      if (!width || !height) { state('waiting-size'); return; }
      if (reduced) {
        progress = phase; pointerX = 0; pointerY = 0;
      }
      state(reduced ? 'static' : 'running');
      if (render) draw();
      if (!reduced && active()) frame = win.requestAnimationFrame(tick);
    }
    function fitCamera() {
      const aspect = width / height;
      const mix = T.MathUtils.clamp((aspect - 0.7) / 0.9, 0, 1);
      const azimuth = -0.91 + mix * 1.41;
      camera.position.set(Math.sin(azimuth) * 34, 30, Math.cos(azimuth) * 34);
      camera.lookAt(0, 1, 0);
      camera.updateMatrixWorld();
      let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity;
      const projected = new T.Vector3();
      harbor.framing.forEach(point => {
        projected.copy(point).applyMatrix4(camera.matrixWorldInverse);
        left = Math.min(left, projected.x); right = Math.max(right, projected.x);
        bottom = Math.min(bottom, projected.y); top = Math.max(top, projected.y);
      });
      const halfHeight = Math.max((top - bottom) / 1.74, (right - left) / (1.8 * aspect));
      const halfWidth = halfHeight * aspect, cx = (left + right) / 2, cy = (bottom + top) / 2;
      camera.left = cx - halfWidth; camera.right = cx + halfWidth;
      camera.bottom = cy - halfHeight; camera.top = cy + halfHeight;
      camera.updateProjectionMatrix();
      stars.position.set(cx, cy, -80);
      stars.scale.set(halfWidth / 15, halfHeight / 15, 1);
      diagnostic('framing', aspect < 1 ? 'portrait' : 'landscape');
    }
    function resize() {
      if (disposed) return;
      const rect = surface.getBoundingClientRect();
      const nextWidth = Math.max(0, Math.floor(rect.width)), nextHeight = Math.max(0, Math.floor(rect.height));
      const dpr = Math.min(win.devicePixelRatio || 1, nextWidth < 700 ? 1.5 : 1.75, Math.sqrt(1800000 / Math.max(1, nextWidth * nextHeight)), 4096 / Math.max(1, nextWidth, nextHeight));
      if (nextWidth === width && nextHeight === height && Math.abs(pixelRatio - dpr) < 0.001) return;
      width = nextWidth; height = nextHeight; pixelRatio = dpr;
      diagnostic('width', width); diagnostic('height', height); diagnostic('dpr', dpr.toFixed(3));
      synchronize();
    }
    function visibilityChanged() { synchronize(); }
    function motionChanged() {
      reduced = requestedReduced || !!motionQuery?.matches;
      targetX = 0; targetY = 0; shadowDirty = true;
      synchronize();
    }
    function pointerMoved(event) {
      if (reduced || paused || event.pointerType === 'touch') return;
      const rect = surface.getBoundingClientRect();
      targetX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width) * 2 - 1));
      targetY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height) * 2 - 1));
    }
    function pointerLeft() { targetX = 0; targetY = 0; }
    function contextWasLost(event) {
      event.preventDefault();
      if (disposed || failure) return;
      contextLost = true; cancelFrame();
      fallback.view.hidden = false; canvas.style.opacity = '0';
      fallback.update(phase, success); state('context-lost');
    }
    function contextWasRestored() {
      if (disposed || failure) return;
      contextLost = false; shadowDirty = true;
      width = 0; height = 0; bufferWidth = 0; bufferHeight = 0;
      resize();
    }

    const handle = Object.freeze({
      setPhase(value) {
        if (disposed) return;
        const next = phaseValue(value);
        if (next === phase) return;
        phase = next; pulseAge = Infinity; success = true; shadowDirty = true;
        diagnostic('phase', phase); diagnostic('pulse', 'none'); surface.dataset.phase = String(phase);
        fallback.update(phase);
        synchronize();
      },
      pulse(value) {
        if (disposed) return;
        success = booleanValue(value, 'pulse'); pulseAge = 0;
        diagnostic('pulse', success ? 'success' : 'retry');
        fallback.update(phase, success);
        synchronize();
      },
      setPaused(value) {
        if (disposed) return;
        const next = booleanValue(value, 'setPaused');
        if (next === paused) return;
        paused = next;
        synchronize();
      },
      setReducedMotion(value) {
        if (disposed) return;
        const next = booleanValue(value, 'setReducedMotion');
        if (next === requestedReduced) return;
        requestedReduced = next;
        motionChanged();
      },
      dispose() {
        if (disposed) return;
        disposed = true; cancelFrame(); observer?.disconnect();
        doc.removeEventListener('visibilitychange', visibilityChanged);
        win.removeEventListener('resize', resize);
        motionQuery?.removeEventListener?.('change', motionChanged);
        container.removeEventListener('pointermove', pointerMoved);
        container.removeEventListener('pointerleave', pointerLeft);
        canvas.removeEventListener('webglcontextlost', contextWasLost);
        canvas.removeEventListener('webglcontextrestored', contextWasRestored);
        freeGPU();
        state('disposed'); surface.remove();
        if (mounts.get(container) === handle) mounts.delete(container);
      }
    });
    mounts.set(container, handle);
    diagnostic('frames', 0); diagnostic('phase', phase); diagnostic('pulse', 'none');
    diagnostic('motion', reduced ? 'reduced' : 'animated'); diagnostic('paused', false);
    surface.dataset.phase = String(phase); state('loading'); fallback.update(phase);
    doc.addEventListener('visibilitychange', visibilityChanged);
    win.addEventListener('resize', resize, { passive: true });
    motionQuery?.addEventListener?.('change', motionChanged);
    container.addEventListener('pointermove', pointerMoved, { passive: true });
    container.addEventListener('pointerleave', pointerLeft, { passive: true });
    if (win.ResizeObserver) { observer = new win.ResizeObserver(resize); observer.observe(surface); }

    try {
      if (!threePromise) threePromise = import(threeURL).catch(error => { threePromise = undefined; throw error; });
      T = await threePromise;
    } catch (_) {
      if (!disposed) fail('fallback-module');
      return handle;
    }
    if (disposed) return handle;
    try {
      renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power', stencil: false });
    } catch (_) {
      fail('fallback-webgl');
      return handle;
    }
    canvas.addEventListener('webglcontextlost', contextWasLost);
    canvas.addEventListener('webglcontextrestored', contextWasRestored);
    try {
      diagnostic('threeRevision', T.REVISION);
      renderer.setClearColor(SKY, transparent ? 0 : 1);
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFShadowMap;
      renderer.shadowMap.autoUpdate = false;
      scene = new T.Scene();
      camera = new T.OrthographicCamera(-15, 15, 10, -10, 0.1, 160);
      scene.add(camera);
      scene.add(new T.HemisphereLight('#e8f4e9', '#45404c', 2.5));
      const sunlight = new T.DirectionalLight('#ffe5be', 3.1);
      sunlight.position.set(-8, 18, 12); sunlight.castShadow = true;
      sunlight.shadow.mapSize.set(1024, 1024);
      Object.assign(sunlight.shadow.camera, { left: -15, right: 15, top: 14, bottom: -14, near: 1, far: 65 });
      sunlight.shadow.bias = -0.0005; sunlight.shadow.normalBias = 0.04;
      scene.add(sunlight); scene.add(sunlight.target);
      const fill = new T.DirectionalLight('#a7e9d5', 1.25);
      fill.position.set(10, 7, -12); scene.add(fill);
      harbor = buildHarbor(T, scene, resources);
      stars = new T.Group();
      camera.add(stars);
      const positions = [];
      let starSeed = 9127;
      const nextStar = () => { starSeed = (Math.imul(starSeed, 1664525) + 1013904223) >>> 0; return starSeed / 4294967296; };
      for (let i = 0; i < 95; i++) {
        const x = (nextStar() - 0.5) * 30, y = (nextStar() - 0.5) * 30, size = i % 7 ? 0.016 : 0.052;
        positions.push(x - size, y, 0, x + size, y, 0, x, y - size, 0, x, y + size, 0);
      }
      const starGeometry = new T.BufferGeometry();
      starGeometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      const starMaterial = new T.LineBasicMaterial({ color: '#d5e5df', transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false });
      resources.geometries.add(starGeometry); resources.materials.add(starMaterial);
      stars.add(new T.LineSegments(starGeometry, starMaterial));
      width = 0; height = 0;
      resize();
      if (!width || !height) synchronize(false);
    } catch (_) {
      canvas.removeEventListener('webglcontextlost', contextWasLost);
      canvas.removeEventListener('webglcontextrestored', contextWasRestored);
      freeGPU();
      fail('fallback-render');
    }
    return handle;
  }

  root.LernBay = Object.freeze({ mount });
})(window);
