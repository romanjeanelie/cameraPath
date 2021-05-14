import * as THREE from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

export default class CreatePath {
  constructor() {
    this.container = null;
    this.stats = null;

    this.camera = null;
    this.scene = null;
    this.renderer = null;
    this.splineHelperObjects = [];
    this.splinePointsLength = 4;
    this.positions = [];
    this.point = new THREE.Vector3();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.onUpPosition = new THREE.Vector2();
    this.onDownPosition = new THREE.Vector2();

    this.geometry = new THREE.BoxGeometry(20, 20, 20);
    this.transformControl;

    this.ARC_SEGMENTS = 200;

    this.splines = {};

    this.params = {
      uniform: true,
      tension: 0.5,
      centripetal: true,
      chordal: true,
      addPoint: () => this.addPoint(),
      removePoint: () => this.removePoint(),
      exportSpline: () => this.exportSpline(),
    };

    this.init();
    this.animate();
  }

  init() {
    this.container = document.getElementById("container");

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
    this.camera.position.set(0, 250, 1000);
    this.scene.add(this.camera);

    //scene.add(new THREE.AmbientLight(0xf0f0f0));
    this.light = new THREE.SpotLight(0xffffff, 1.5);
    this.light.position.set(0, 1500, 200);
    this.light.angle = Math.PI * 0.2;
    this.light.castShadow = true;
    this.light.shadow.camera.near = 200;
    this.light.shadow.camera.far = 2000;
    this.light.shadow.bias = -0.000222;
    this.light.shadow.mapSize.width = 1024;
    this.light.shadow.mapSize.height = 1024;
    // scene.add(light);

    this.planeGeometry = new THREE.PlaneGeometry(2000, 2000);
    this.planeGeometry.rotateX(-Math.PI / 2);
    this.planeMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });

    this.plane = new THREE.Mesh(this.planeGeometry, this.planeMaterial);
    this.plane.position.y = -200;
    this.plane.receiveShadow = true;
    //scene.add(plane);

    this.helper = new THREE.GridHelper(2000, 100);
    this.helper.position.y = -199;
    this.helper.material.opacity = 0.25;
    this.helper.material.transparent = true;
    //scene.add(helper);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    //renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.stats = new Stats();
    this.container.appendChild(this.stats.dom);

    this.gui = new GUI();

    this.gui.add(this.params, "addPoint");
    this.gui.add(this.params, "removePoint");
    this.gui.add(this.params, "exportSpline");
    this.gui.open();

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.damping = 0.2;
    this.controls.addEventListener("change", () => this.render());

    this.transformControl = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControl.addEventListener("change", () => this.render());
    this.transformControl.addEventListener("dragging-changed", (event) => {
      this.controls.enabled = !event.value;
    });
    this.scene.add(this.transformControl);

    this.transformControl.addEventListener("objectChange", () => {
      this.updateSplineOutline();
    });

    this.container.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    this.container.addEventListener("pointerup", (e) => this.onPointerUp(e));
    this.container.addEventListener("pointermove", (e) => this.onPointerMove(e));

    /*******
     * Curves
     *********/

    for (let i = 0; i < this.splinePointsLength; i++) {
      this.addSplineObject(this.positions[i]);
    }

    this.positions.length = 0;

    for (let i = 0; i < this.splinePointsLength; i++) {
      this.positions.push(this.splineHelperObjects[i].position);
    }

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.ARC_SEGMENTS * 3), 3));

    this.curve = new THREE.CatmullRomCurve3(this.positions);
    this.curve.curveType = "catmullrom";
    this.curve.mesh = new THREE.Line(
      this.lineGeometry.clone(),
      new THREE.LineBasicMaterial({
        color: 0xff0000,
        opacity: 0.35,
      })
    );
    this.curve.mesh.castShadow = true;
    this.splines.uniform = this.curve;

    this.splines.chordal = this.curve;

    for (const k in this.splines) {
      this.spline = this.splines[k];
      this.scene.add(this.spline.mesh);
    }

    this.load([
      new THREE.Vector3(289.76843686945404, 452.51481137238443, 56.10018915737797),
      new THREE.Vector3(-53.56300074753207, 171.49711742836848, -14.495472686253045),
      new THREE.Vector3(-91.40118730204415, 176.4306956436485, -6.958271935582161),
      new THREE.Vector3(-383.785318791128, 491.1365363371675, 47.869296953772746),
    ]);
  }

  addSplineObject(position) {
    this.material = new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff });
    this.object = new THREE.Mesh(this.geometry, this.material);

    if (position) {
      this.object.position.copy(position);
    } else {
      this.object.position.x = Math.random() * 1000 - 500;
      this.object.position.y = Math.random() * 600;
      this.object.position.z = Math.random() * 800 - 400;
    }

    this.scene.add(this.object);
    this.splineHelperObjects.push(this.object);

    return this.object;
  }
  addPoint() {
    this.splinePointsLength++;

    this.positions.push(this.addSplineObject().position);

    this.updateSplineOutline();
  }
  removePoint() {
    if (this.splinePointsLength <= 4) {
      return;
    }

    this.pointToRemove = this.splineHelperObjects.pop();
    this.splinePointsLength--;
    this.positions.pop();

    if (this.transformControl.object === this.pointToRemove) this.transformControl.detach();
    this.scene.remove(this.pointToRemove);

    this.updateSplineOutline();
  }

  updateSplineOutline() {
    for (let k in this.splines) {
      this.spline = this.splines[k];

      this.splineMesh = this.spline.mesh;
      this.position = this.splineMesh.geometry.attributes.position;

      for (let i = 0; i < this.ARC_SEGMENTS; i++) {
        const t = i / (this.ARC_SEGMENTS - 1);
        this.spline.getPoint(t, this.point);
        this.position.setXYZ(i, this.point.x, this.point.y, this.point.z);
      }

      this.position.needsUpdate = true;
    }
  }

  exportSpline() {
    this.strplace = [];

    for (let i = 0; i < this.splinePointsLength; i++) {
      const p = this.splineHelperObjects[i].position;
      this.strplace.push(`new THREE.Vector3(${p.x}, ${p.y}, ${p.z})`);
    }

    console.log(this.strplace.join(",\n"));
    const code = "[" + this.strplace.join(",\n\t") + "]";
    prompt("copy and paste code", code);
  }

  load(new_positions) {
    while (new_positions.length > this.positions.length) {
      this.addPoint();
    }

    while (new_positions.length < this.positions.length) {
      this.removePoint();
    }

    for (let i = 0; i < this.positions.length; i++) {
      this.positions[i].copy(new_positions[i]);
    }

    this.updateSplineOutline();
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.render();
    this.stats.update();
  }

  render() {
    this.splines.uniform.mesh.visible = this.params.uniform;

    this.renderer.render(this.scene, this.camera);
  }

  onPointerDown(event) {
    this.onDownPosition.x = event.clientX;
    this.onDownPosition.y = event.clientY;
  }

  onPointerUp(event) {
    this.onUpPosition.x = event.clientX;
    this.onUpPosition.y = event.clientY;

    if (this.onDownPosition.distanceTo(this.onUpPosition) === 0) this.transformControl.detach();
  }

  onPointerMove(event) {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    this.intersects = this.raycaster.intersectObjects(this.splineHelperObjects);

    if (this.intersects.length > 0) {
      const object = this.intersects[0].object;

      if (object !== this.transformControl.object) {
        this.transformControl.attach(object);
      }
    }
  }
}
