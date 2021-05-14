import * as THREE from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";
import { GUI } from "three/examples/jsm/libs/dat.gui.module.js";

import { Curves } from "three/examples/jsm/curves/CurveExtras.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default class cameraPath {
  constructor() {
    this.container = null;

    this.camera = null;
    this.scene = null;
    this.renderer = null;
    this.splineCamera = null;
    this.cameraHelper = null;

    this.direction = new THREE.Vector3();
    this.binormal = new THREE.Vector3();
    this.normal = new THREE.Vector3();
    this.position = new THREE.Vector3();
    this.lookAt = new THREE.Vector3();

    // Keep a dictionary of Curve instances

    this.tubeGeometry = null;
    this.mesh = null;

    this.params = {
      extrusionSegments: 100,
      radiusSegments: 3,
      animationView: false,
      lookAhead: false,
      cameraHelper: true,
    };

    this.init();
    this.animate();
  }

  addTube() {
    this.splines = {
      spline: new THREE.CatmullRomCurve3([
        new THREE.Vector3(289.76843686945404, 452.51481137238443, 56.10018915737797),
        new THREE.Vector3(-53.56300074753207, 171.49711742836848, -14.495472686253045),
        new THREE.Vector3(-306.2882759279238, 74.29413394996332, 18.575868487838584),
        new THREE.Vector3(-383.785318791128, 491.1365363371675, 47.869296953772746),
        new THREE.Vector3(-750.4773384758721, 497.01504462972247, -187.29546302995828),
        new THREE.Vector3(-1033.186508088645, 477.1627094629522, 1037.5979592179267),
      ]),
    };

    this.extrudePath = this.splines.spline;

    this.material = new THREE.MeshLambertMaterial({ color: 0xff00ff, wireframe: true });

    this.tubeGeometry = new THREE.TubeGeometry(
      this.extrudePath,
      this.params.extrusionSegments,
      2,
      this.params.radiusSegments
    );
    this.mesh = new THREE.Mesh(this.tubeGeometry, this.material);

    //this.mesh.scale.set(this.params.scale, this.params.scale, this.params.scale);
    this.scene.add(this.mesh);
  }

  animateCamera() {
    this.cameraHelper.visible = this.params.cameraHelper;
  }

  init() {
    this.container = document.getElementById("container");

    // camera
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 10000);
    this.camera.position.set(0, 50, 500);

    // scene
    this.scene = new THREE.Scene();

    // light
    this.light = new THREE.DirectionalLight(0xffffff);
    this.light.position.set(0, 0, 1);
    this.scene.add(this.light);

    // tube
    this.splineCamera = new THREE.PerspectiveCamera(84, window.innerWidth / window.innerHeight, 0.01, 1000);
    this.scene.add(this.splineCamera);

    this.cameraHelper = new THREE.CameraHelper(this.splineCamera);
    this.scene.add(this.cameraHelper);

    this.addTube();

    // debug camera
    this.cameraHelper.visible = this.params.cameraHelper;

    // renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    // dat.GUI
    this.gui = new GUI({ width: 300 });
    this.folderCamera = this.gui.addFolder("Camera");
    this.folderCamera.add(this.params, "animationView").onChange(() => {
      this.animateCamera();
    });
    this.folderCamera.add(this.params, "lookAhead").onChange(() => {
      this.animateCamera();
    });
    this.folderCamera.add(this.params, "cameraHelper").onChange(() => {
      this.animateCamera();
    });
    this.folderCamera.open();

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.minDistance = 100;
    this.controls.maxDistance = 2000;

    window.addEventListener("resize", this.onWindowResize);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  animate() {
    requestAnimationFrame(this.animate.bind(this));

    this.render();
  }

  cameraPath(time) {
    this.looptime = 20 * 1000;

    // range number between 0 and 1
    this.t = (time % this.looptime) / this.looptime;
    this.t2 = ((time + 0.1) % this.looptime) / this.looptime;

    this.pos = this.mesh.geometry.parameters.path.getPointAt(this.t);
    this.pos2 = this.mesh.geometry.parameters.path.getPointAt(this.t2);

    this.splineCamera.position.copy(this.pos);
    this.splineCamera.lookAt(this.pos2);

    this.cameraHelper.update();
  }
  render() {
    // animate camera along spline

    this.time = Date.now();

    this.cameraPath(this.time);

    this.renderer.render(this.scene, this.params.animationView === true ? this.splineCamera : this.camera);
  }
}

//
