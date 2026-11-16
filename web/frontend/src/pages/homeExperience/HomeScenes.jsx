import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { imageFallback } from './homeData.js';

function release(scene, renderer) {
  scene.traverse(object => {
    object.geometry?.dispose();
    for (const material of [object.material].flat().filter(Boolean)) {
      material.map?.dispose();
      material.dispose();
    }
  });
  renderer.dispose();
  renderer.domElement.remove();
}

// A real curved mesh, rather than a row of rotated DOM screenshots.
export function CurvedGallery({ photos }) {
  const host = useRef(null);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const element = host.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); }
    catch { setFallback(true); return; }
    let disposed = false;
    let frame;
    let visible = false;
    let dragging = false;
    let lastX = 0;
    let velocity = 0;
    let position = 0;
    let lastTime = performance.now();
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-10, 10, 2.5, -2.5, .1, 100);
    camera.position.z = 10;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0xffffff, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    element.appendChild(renderer.domElement);
    const loader = new THREE.TextureLoader();
    const count = Math.max(photos.length, 8);
    const width = 3.4;
    const height = 4.3;
    const gap = .18;
    const total = count * (width + gap);
    const meshes = [];
    const geometry = new THREE.PlaneGeometry(width, height, 20, 12);
    for (let i = 0; i < count; i++) {
      const texture = loader.load(photos[i % photos.length], loaded => {
        if (disposed) { loaded.dispose(); return; }
        loaded.colorSpace = THREE.SRGBColorSpace;
        const imageRatio = loaded.image.width / loaded.image.height;
        const planeRatio = width / height;
        if (imageRatio > planeRatio) { loaded.repeat.x = planeRatio / imageRatio; loaded.offset.x = (1 - loaded.repeat.x) / 2; }
        else { loaded.repeat.y = imageRatio / planeRatio; loaded.offset.y = (1 - loaded.repeat.y) / 2; }
      }, undefined, () => {
        if (disposed) return;
        loader.load('/images/home/dorm.jpg', loaded => {
          if (disposed) { loaded.dispose(); return; }
          loaded.colorSpace = THREE.SRGBColorSpace;
          loaded.repeat.x = .5; loaded.offset.x = .25;
          material.map = loaded; material.needsUpdate = true; texture.dispose();
        });
      });
      const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
      // Bend both edges of each image along the same wide arc as the reference.
      material.onBeforeCompile = shader => {
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
          vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
          worldPosition.y += pow(worldPosition.x * 0.065, 2.0) * 0.32;
          worldPosition.z -= pow(worldPosition.x * 0.065, 2.0) * 0.42;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        `);
      };
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      meshes.push(mesh);
    }
    function resize() {
      const w = element.clientWidth;
      const h = element.clientHeight;
      const aspect = w / h;
      camera.left = -2.65 * aspect; camera.right = 2.65 * aspect;
      camera.top = 2.65; camera.bottom = -2.65;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(element); resize();
    function tick(time) {
      frame = requestAnimationFrame(tick);
      const delta = Math.min((time - lastTime) / 16.67, 2);
      lastTime = time;
      if (!visible || document.hidden) return;
      if (!dragging) {
        velocity *= .955;
        position += (motion.matches ? 0 : .006) * delta + velocity * delta;
      }
      for (let i = 0; i < meshes.length; i++) {
        meshes[i].position.x = ((i * (width + gap) + position + total * 100) % total) - total / 2;
      }
      renderer.render(scene, camera);
      element.dataset.offset = position.toFixed(2);
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(element);
    function down(event) { dragging = true; lastX = event.clientX; velocity = 0; element.setPointerCapture(event.pointerId); element.classList.add('is-dragging'); }
    function move(event) {
      if (!dragging) return;
      const difference = event.clientX - lastX;
      velocity = difference * .014;
      position += velocity;
      lastX = event.clientX;
    }
    function up() { dragging = false; element.classList.remove('is-dragging'); }
    function key(event) {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); position += event.key === 'ArrowLeft' ? 1.5 : -1.5;
      }
    }
    element.addEventListener('pointerdown', down); element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up); element.addEventListener('pointercancel', up); element.addEventListener('keydown', key);
    element.dataset.ready = 'true';
    frame = requestAnimationFrame(tick);
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); resizeObserver.disconnect();
      element.removeEventListener('pointerdown', down); element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up); element.removeEventListener('pointercancel', up); element.removeEventListener('keydown', key);
      release(scene, renderer); delete element.dataset.ready;
    };
  }, [photos.join('|')]);
  return <div ref={host} className="hx-curved-gallery" role="region" tabIndex={0} aria-label="Dải ảnh cong: kéo ngang hoặc dùng phím mũi tên để xem">{fallback && <div className="hx-gallery-fallback">{photos.map(photo => <img key={photo} src={photo} alt="Không gian phòng" onError={imageFallback} />)}</div>}</div>;
}

export function HouseScene({ expanded, variant }) {
  const host = useRef(null);
  const state = useRef({ expanded, variant });
  const [fallback, setFallback] = useState(false);
  useEffect(() => { state.current = { expanded, variant }; }, [expanded, variant]);
  useEffect(() => {
    const element = host.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); }
    catch { setFallback(true); return; }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
    camera.position.set(7.6, 5.8, 10.5);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    element.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2.0, 0);
    controls.enableDamping = true; controls.enablePan = false; controls.enableZoom = false;
    controls.minPolarAngle = .4; controls.maxPolarAngle = Math.PI / 2.1;
    scene.add(new THREE.AmbientLight(0xfff5e6, 2.0));
    const sun = new THREE.DirectionalLight(0xfff7e7, 3.5);
    sun.position.set(-4, 9, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -7; sun.shadow.camera.right = 7;
    sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -7;
    sun.shadow.bias = -.001;
    scene.add(sun);
    const building = new THREE.Group(); scene.add(building);
    const colors = { wall: 0xe8d5b6, trim: 0xf6e9ce, wood: 0x8c7355, roof: 0x4a6549, glass: 0x9dc7d1, green: 0x7a9870 };
    function material(color, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: .85, ...extra }); }
    function box(parent, size, position, color, extra = {}) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, extra));
      mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    }
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.75, .18, 64), material(0xe8d2ad));
    pedestal.scale.z = .72; pedestal.position.y = .08; pedestal.receiveShadow = true; scene.add(pedestal);
    const floors = [];
    const outerWalls = [];
    for (let level = 0; level < 2; level++) {
      const floor = new THREE.Group(); floor.position.y = .24 + level * 1.7; building.add(floor); floors.push(floor);
      box(floor, [4.9, .16, 3.5], [0, 0, 0], colors.trim);
      box(floor, [4.7, 1.55, .12], [0, .8, -1.6], colors.wall);
      box(floor, [.12, 1.55, 3.2], [-2.3, .8, 0], colors.wall);
      outerWalls.push(box(floor, [.12, 1.55, 3.2], [2.3, .8, 0], colors.wall, { transparent: true }));
      outerWalls.push(box(floor, [4.7, 1.55, .12], [0, .8, 1.6], colors.wall, { transparent: true }));
      box(floor, [.08, 1.45, 3], [0, .75, 0], colors.trim);
      // Two furnished rooms per floor, revealed when the house opens.
      for (const x of [-1.15, 1.15]) {
        box(floor, [1.45, .25, 1.8], [x, .22, -.1], colors.wood);
        box(floor, [1.38, .2, 1.72], [x, .43, -.1], 0xf6f0e6);
        box(floor, [1.4, .06, .95], [x, .57, .25], level ? 0x9eae9a : 0xb3bccc);
        box(floor, [.55, .12, .32], [x, .59, -.7], 0xffffff);
        box(floor, [.55, .55, .45], [x - .76, .35, -.65], colors.wood);
      }
      for (let i = 0; i < 4; i++) {
        const x = -1.75 + i * 1.17;
        if (!level && i === 2) continue;
        box(floor, [.66, 1.06, .08], [x, .9, 1.69], colors.trim);
        box(floor, [.5, .9, .06], [x, .9, 1.75], colors.glass, { metalness: .1, roughness: .3 });
        box(floor, [.025, .9, .035], [x, .9, 1.8], 0xfaf3e5);
        box(floor, [.5, .025, .035], [x, .9, 1.8], 0xfaf3e5);
        for (const side of [-1, 1]) box(floor, [.13, 1.0, .05], [x + side * .4, .9, 1.72], colors.green);
        box(floor, [.76, .08, .2], [x, .35, 1.74], colors.wood);
      }
    }
    box(floors[0], [.65, 1.3, .12], [.59, .69, 1.72], colors.wood);
    box(floors[0], [.52, .62, .03], [.59, .96, 1.81], colors.glass);
    box(floors[0], [.08, .08, .08], [.8, .55, 1.83], 0xd4b67c);
    box(building, [1.0, .15, .45], [.59, .2, 1.9], colors.trim);
    const roof = new THREE.Group(); roof.position.y = 3.62; building.add(roof);
    const roofShape = new THREE.Shape(); roofShape.moveTo(-1.9, 0); roofShape.lineTo(0, 1.1); roofShape.lineTo(1.9, 0); roofShape.closePath();
    const roofMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 5.1, bevelEnabled: false }), material(colors.roof));
    roofMesh.rotation.y = Math.PI / 2; roofMesh.position.x = -2.55; roofMesh.castShadow = true; roof.add(roofMesh);
    box(roof, [5.3, .12, .12], [0, 1.12, 0], 0x3d553c);
    for (const x of [-2.9, 2.9]) {
      const tree = new THREE.Group(); tree.position.set(x, .2, 1.1); scene.add(tree);
      box(tree, [.12, .6, .12], [0, .3, 0], colors.wood);
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(.44, 1), material(colors.green)); crown.position.y = .9; crown.scale.y = 1.2; crown.castShadow = true; tree.add(crown);
    }
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: .12 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.03; shadow.receiveShadow = true; scene.add(shadow);
    function resize() { camera.aspect = element.clientWidth / element.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(element.clientWidth, element.clientHeight); }
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(element); resize();
    let visible = false;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); observer.observe(element);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    function animate() {
      frame = requestAnimationFrame(animate);
      if (!visible || document.hidden) return;
      const opened = state.current.expanded;
      const ease = reduced.matches ? 1 : .085;
      floors[1].position.y += ((opened ? 2.85 : 1.94) - floors[1].position.y) * ease;
      roof.position.y += ((opened ? 5.25 : 3.62) - roof.position.y) * ease;
      for (const wall of outerWalls) wall.material.opacity += ((opened ? .12 : 1) - wall.material.opacity) * ease;
      const angle = -.12 + (state.current.variant % 3) * .15;
      building.rotation.y += (angle - building.rotation.y) * ease;
      controls.target.y += ((opened ? 2.7 : 2.0) - controls.target.y) * ease;
      controls.update(); renderer.render(scene, camera);
      element.dataset.expanded = String(opened);
    }
    element.dataset.ready = 'true'; frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); resizeObserver.disconnect(); controls.dispose(); release(scene, renderer); delete element.dataset.ready; };
  }, []);
  return <div ref={host} className="hx-house-scene" role="img" aria-label="Mô hình nhà 3D, kéo để xoay">{fallback && <div className="hx-house-fallback">⌂<span>Mô hình nhà · Trình duyệt hiện chưa hỗ trợ 3D.</span></div>}</div>;
}
