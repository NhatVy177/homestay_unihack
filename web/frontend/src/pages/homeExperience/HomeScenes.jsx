import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { imageFallback } from './homeData.js';
import { createHouseModel, FLOOR_HEIGHT, FLOOR_GAP } from './HouseModel.js';

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
    const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
    camera.position.z = 10;
    const viewportHalfWidth = { value: 10 };
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
      // Bring the outer edges toward the viewer: larger, slanted panels that fall outward.
      material.onBeforeCompile = shader => {
        shader.uniforms.uGalleryHalfWidth = viewportHalfWidth;
        shader.vertexShader = 'uniform float uGalleryHalfWidth;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
          vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
          float bend = clamp(worldPosition.x / uGalleryHalfWidth, -1.5, 1.5);
          float edge = bend * bend;
          worldPosition.y *= 1.0 + edge * 0.04;
          worldPosition.y -= edge * 0.045;
          worldPosition.z += edge * 0.7;
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
      camera.aspect = aspect;
      viewportHalfWidth.value = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * aspect;
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
        position += (motion.matches ? 0 : -.008) * delta + velocity * delta;
      }
      for (let i = 0; i < meshes.length; i++) {
        const wrapped = (i * (width + gap) + position) % total;
        meshes[i].position.x = ((wrapped + total) % total) - total / 2;
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

export function HouseScene({ expanded, variant, layout, selectedFloor }) {
  const host = useRef(null);
  const state = useRef({ expanded, variant, selectedFloor });
  const [fallback, setFallback] = useState(false);
  useEffect(() => { state.current = { expanded, variant, selectedFloor }; }, [expanded, variant, selectedFloor]);
  useEffect(() => {
    const element = host.current;
    if (!layout.floorCount) return;
    let renderer;
    setFallback(false);
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); }
    catch { setFallback(true); return; }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 500);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    element.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.enablePan = false; controls.enableZoom = false;
    controls.minPolarAngle = .4; controls.maxPolarAngle = Math.PI / 2.1;
    scene.add(new THREE.AmbientLight(0xfff5e6, 2.0));
    const model = createHouseModel(scene, layout);
    const { building, floors, roof, outerWalls, roomLabels, floorSlabs, radius } = model;
    for (const wall of outerWalls) wall.material.transparent = true;
    const sun = new THREE.DirectionalLight(0xfff7e7, 3.5);
    const maxHeight = layout.floorCount * (FLOOR_HEIGHT + FLOOR_GAP) + 2;
    sun.position.set(-radius, maxHeight + 4, radius * 2); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -radius * 2; sun.shadow.camera.right = radius * 2;
    sun.shadow.camera.top = maxHeight; sun.shadow.camera.bottom = -radius * 2;
    sun.shadow.camera.far = maxHeight + radius * 8; sun.shadow.bias = -.001;
    scene.add(sun);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const target = new THREE.Vector3();
    const offset = new THREE.Vector3();
    function frameHouse(opened, ease) {
      const height = .24 + layout.floorCount * FLOOR_HEIGHT + (opened ? layout.floorCount * FLOOR_GAP : 0) + 1.1;
      const y = height / 2;
      const deltaY = (y - controls.target.y) * ease;
      controls.target.y += deltaY; camera.position.y += deltaY;
      const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
      const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
      // Fit the entire building, including raised roof, for tall branches and narrow screens.
      const distance = 1.12 * Math.max((height + layout.depth * .35) / (2 * Math.tan(vertical)),
        (layout.width + layout.depth * .65 + 1.3) / (2 * Math.tan(horizontal))) + layout.depth * .5;
      offset.copy(camera.position).sub(controls.target).normalize().multiplyScalar(distance);
      target.copy(controls.target).add(offset); camera.position.lerp(target, ease);
    }
    function resize() {
      camera.aspect = element.clientWidth / Math.max(element.clientHeight, 1);
      camera.updateProjectionMatrix(); renderer.setSize(element.clientWidth, element.clientHeight);
      frameHouse(state.current.expanded, 1); controls.update();
    }
    controls.target.set(0, 2, 0); camera.position.set(7.6, 7.8, 10.5);
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(element); resize();
    let visible = false;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); observer.observe(element);
    let frame;
    function animate() {
      frame = requestAnimationFrame(animate);
      if (!visible || document.hidden) return;
      const { expanded: opened, variant: currentVariant, selectedFloor: activeFloor } = state.current;
      const ease = reduced.matches ? 1 : .085;
      floors.forEach((floor, index) => {
        const destination = .24 + index * (FLOOR_HEIGHT + (opened ? FLOOR_GAP : 0));
        floor.position.y += (destination - floor.position.y) * ease;
        floorSlabs[index].material.color.setHex(layout.floors[index].number === activeFloor ? 0xe4c99d : 0xf6e9ce);
      });
      const roofY = .24 + layout.floorCount * (FLOOR_HEIGHT + (opened ? FLOOR_GAP : 0));
      roof.position.y += (roofY - roof.position.y) * ease;
      for (const wall of outerWalls) wall.material.opacity += ((opened ? .08 : 1) - wall.material.opacity) * ease;
      for (const label of roomLabels) label.visible = opened;
      building.rotation.y += ((-.12 + (currentVariant % 3) * .15) - building.rotation.y) * ease;
      frameHouse(opened, ease); controls.update(); renderer.render(scene, camera);
      element.dataset.expanded = String(opened);
    }
    element.dataset.ready = 'true'; frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); resizeObserver.disconnect(); controls.dispose();
      release(scene, renderer); renderer.forceContextLoss(); delete element.dataset.ready; delete element.dataset.expanded;
    };
  }, [layout]);
  return <div ref={host} className="hx-house-scene" role="img"
    data-floor-count={layout.floorCount} data-room-count={layout.modeledRoomCount}
    aria-label={`Mô hình nhà 3D ${layout.floorCount} tầng, ${layout.modeledRoomCount} phòng đã xác định tầng, kéo để xoay`}>
    {(!layout.floorCount || fallback) && <div className="hx-house-fallback"><span>{!layout.floorCount ? 'Chưa có thông tin tầng để dựng mô hình. Xem danh sách phòng bên dưới.' : 'Trình duyệt hiện chưa hỗ trợ 3D. Xem các tầng và phòng bên dưới.'}</span></div>}
  </div>;
}
