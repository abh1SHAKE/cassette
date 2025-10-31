(function(window) {
  'use strict';

  const THREE = window.THREE;

  window.createLiquidEther = function(container, options = {}) {
    const {
      colors = ['#5227FF', '#FF9FFC', '#B19EEF'],
      mouseForce = 0,
      cursorSize = 0,
      isViscous = false,
      viscous = 5,
      iterationsViscous = 8,
      iterationsPoisson = 32,
      resolution = 2,
      isBounce = false,
      autoDemo = true,
      autoSpeed = 0.01,
      autoIntensity = 0.8,
      takeoverDuration = 0,
      autoResumeDelay = 0,
      autoRampDuration = 0.6,
      dt = 0.007,
      BFECC = true
    } = options;

    let paletteTex = makePaletteTexture(colors);
    const bgVec4 = new THREE.Vector4(0, 0, 0, 0);

    function makePaletteTexture(stops) {
      let arr = Array.isArray(stops) && stops.length > 0
        ? (stops.length === 1 ? [stops[0], stops[0]] : stops)
        : ['#ffffff', '#ffffff'];
      
      const w = arr.length;
      const data = new Uint8Array(w * 4);
      
      for (let i = 0; i < w; i++) {
        const c = new THREE.Color(arr[i]);
        data[i * 4 + 0] = Math.round(c.r * 255);
        data[i * 4 + 1] = Math.round(c.g * 255);
        data[i * 4 + 2] = Math.round(c.b * 255);
        data[i * 4 + 3] = 255;
      }
      
      const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      
      return tex;
    }

    const SHADERS = {
      face_vert: `
        attribute vec3 position;
        uniform vec2 px;
        uniform vec2 boundarySpace;
        varying vec2 uv;
        precision highp float;
        void main(){
          vec3 pos = position;
          vec2 scale = 1.0 - boundarySpace * 2.0;
          pos.xy = pos.xy * scale;
          uv = vec2(0.5)+(pos.xy)*0.5;
          gl_Position = vec4(pos, 1.0);
        }
      `,
      line_vert: `
        attribute vec3 position;
        uniform vec2 px;
        precision highp float;
        varying vec2 uv;
        void main(){
          vec3 pos = position;
          uv = 0.5 + pos.xy * 0.5;
          vec2 n = sign(pos.xy);
          pos.xy = abs(pos.xy) - px * 1.0;
          pos.xy *= n;
          gl_Position = vec4(pos, 1.0);
        }
      `,
      mouse_vert: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform vec2 center;
        uniform vec2 scale;
        uniform vec2 px;
        varying vec2 vUv;
        void main(){
          vec2 pos = position.xy * scale * 2.0 * px + center;
          vUv = uv;
          gl_Position = vec4(pos, 0.0, 1.0);
        }
      `,
      advection_frag: `
        precision highp float;
        uniform sampler2D velocity;
        uniform float dt;
        uniform bool isBFECC;
        uniform vec2 fboSize;
        uniform vec2 px;
        varying vec2 uv;
        void main(){
          vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
          if(isBFECC == false){
            vec2 vel = texture2D(velocity, uv).xy;
            vec2 uv2 = uv - vel * dt * ratio;
            vec2 newVel = texture2D(velocity, uv2).xy;
            gl_FragColor = vec4(newVel, 0.0, 0.0);
          } else {
            vec2 spot_new = uv;
            vec2 vel_old = texture2D(velocity, uv).xy;
            vec2 spot_old = spot_new - vel_old * dt * ratio;
            vec2 vel_new1 = texture2D(velocity, spot_old).xy;
            vec2 spot_new2 = spot_old + vel_new1 * dt * ratio;
            vec2 error = spot_new2 - spot_new;
            vec2 spot_new3 = spot_new - error / 2.0;
            vec2 vel_2 = texture2D(velocity, spot_new3).xy;
            vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio;
            vec2 newVel2 = texture2D(velocity, spot_old2).xy;
            gl_FragColor = vec4(newVel2, 0.0, 0.0);
          }
        }
      `,
      color_frag: `
        precision highp float;
        uniform sampler2D velocity;
        uniform sampler2D palette;
        uniform vec4 bgColor;
        varying vec2 uv;
        void main(){
          vec2 vel = texture2D(velocity, uv).xy;
          float lenv = clamp(length(vel), 0.0, 1.0);
          vec3 c = texture2D(palette, vec2(lenv, 0.5)).rgb;
          vec3 outRGB = mix(bgColor.rgb, c, lenv);
          float outA = mix(bgColor.a, 1.0, lenv);
          gl_FragColor = vec4(outRGB, outA);
        }
      `,
      divergence_frag: `
        precision highp float;
        uniform sampler2D velocity;
        uniform float dt;
        uniform vec2 px;
        varying vec2 uv;
        void main(){
          float x0 = texture2D(velocity, uv-vec2(px.x, 0.0)).x;
          float x1 = texture2D(velocity, uv+vec2(px.x, 0.0)).x;
          float y0 = texture2D(velocity, uv-vec2(0.0, px.y)).y;
          float y1 = texture2D(velocity, uv+vec2(0.0, px.y)).y;
          float divergence = (x1 - x0 + y1 - y0) / 2.0;
          gl_FragColor = vec4(divergence / dt);
        }
      `,
      externalForce_frag: `
        precision highp float;
        uniform vec2 force;
        uniform vec2 center;
        uniform vec2 scale;
        uniform vec2 px;
        varying vec2 vUv;
        void main(){
          vec2 circle = (vUv - 0.5) * 2.0;
          float d = 1.0 - min(length(circle), 1.0);
          d *= d;
          gl_FragColor = vec4(force * d, 0.0, 1.0);
        }
      `,
      poisson_frag: `
        precision highp float;
        uniform sampler2D pressure;
        uniform sampler2D divergence;
        uniform vec2 px;
        varying vec2 uv;
        void main(){
          float p0 = texture2D(pressure, uv + vec2(px.x * 2.0, 0.0)).r;
          float p1 = texture2D(pressure, uv - vec2(px.x * 2.0, 0.0)).r;
          float p2 = texture2D(pressure, uv + vec2(0.0, px.y * 2.0)).r;
          float p3 = texture2D(pressure, uv - vec2(0.0, px.y * 2.0)).r;
          float div = texture2D(divergence, uv).r;
          float newP = (p0 + p1 + p2 + p3) / 4.0 - div;
          gl_FragColor = vec4(newP);
        }
      `,
      pressure_frag: `
        precision highp float;
        uniform sampler2D pressure;
        uniform sampler2D velocity;
        uniform vec2 px;
        uniform float dt;
        varying vec2 uv;
        void main(){
          float step = 1.0;
          float p0 = texture2D(pressure, uv + vec2(px.x * step, 0.0)).r;
          float p1 = texture2D(pressure, uv - vec2(px.x * step, 0.0)).r;
          float p2 = texture2D(pressure, uv + vec2(0.0, px.y * step)).r;
          float p3 = texture2D(pressure, uv - vec2(0.0, px.y * step)).r;
          vec2 v = texture2D(velocity, uv).xy;
          vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5;
          v = v - gradP * dt;
          gl_FragColor = vec4(v, 0.0, 1.0);
        }
      `,
      viscous_frag: `
        precision highp float;
        uniform sampler2D velocity;
        uniform sampler2D velocity_new;
        uniform float v;
        uniform vec2 px;
        uniform float dt;
        varying vec2 uv;
        void main(){
          vec2 old = texture2D(velocity, uv).xy;
          vec2 new0 = texture2D(velocity_new, uv + vec2(px.x * 2.0, 0.0)).xy;
          vec2 new1 = texture2D(velocity_new, uv - vec2(px.x * 2.0, 0.0)).xy;
          vec2 new2 = texture2D(velocity_new, uv + vec2(0.0, px.y * 2.0)).xy;
          vec2 new3 = texture2D(velocity_new, uv - vec2(0.0, px.y * 2.0)).xy;
          vec2 newv = 4.0 * old + v * dt * (new0 + new1 + new2 + new3);
          newv /= 4.0 * (1.0 + v * dt);
          gl_FragColor = vec4(newv, 0.0, 0.0);
        }
      `
    };

    class Common {
      constructor() {
        this.width = 0;
        this.height = 0;
        this.aspect = 1;
        this.pixelRatio = 1;
        this.time = 0;
        this.delta = 0;
        this.container = null;
        this.renderer = null;
        this.clock = null;
      }

      init(container) {
        this.container = container;
        this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        this.resize();
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.autoClear = false;
        this.renderer.setClearColor(new THREE.Color(0x000000), 0);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(this.width, this.height);
        const el = this.renderer.domElement;
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.display = 'block';
        el.style.position = 'absolute';
        el.style.top = '0';
        el.style.left = '0';
        this.clock = new THREE.Clock();
        this.clock.start();
      }

      resize() {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.width = Math.max(1, Math.floor(rect.width));
        this.height = Math.max(1, Math.floor(rect.height));
        this.aspect = this.width / this.height;
        if (this.renderer) this.renderer.setSize(this.width, this.height, false);
      }

      update() {
        if (!this.clock) return;
        this.delta = this.clock.getDelta();
        this.time += this.delta;
      }
    }

    class Mouse {
      constructor() {
        this.coords = new THREE.Vector2();
        this.coords_old = new THREE.Vector2();
        this.diff = new THREE.Vector2();
        this.isAutoActive = true;  // Always in auto mode
        this.autoIntensity = autoIntensity;
      }

      init(container) {
        // No mouse event listeners needed
      }

      dispose() {
        // Nothing to dispose
      }

      setNormalized(nx, ny) {
        this.coords.set(nx, ny);
      }

      update() {
        this.diff.subVectors(this.coords, this.coords_old);
        this.coords_old.copy(this.coords);
        if (this.coords_old.x === 0 && this.coords_old.y === 0) this.diff.set(0, 0);
        this.diff.multiplyScalar(this.autoIntensity);
      }
    }

    class AutoDriver {
      constructor(mouse) {
        this.mouse = mouse;
        this.enabled = autoDemo;
        this.speed = autoSpeed;
        this.rampDurationMs = autoRampDuration * 1000;
        this.active = true;
        this.current = new THREE.Vector2(0, 0);
        this.target = new THREE.Vector2();
        this.lastTime = performance.now();
        this.activationTime = performance.now();
        this.margin = 0.2;
        this.pickNewTarget();
      }

      pickNewTarget() {
        const r = Math.random;
        this.target.set(
          (r() * 2 - 1) * (1 - this.margin),
          (r() * 2 - 1) * (1 - this.margin)
        );
      }

      update() {
        if (!this.enabled || !this.active) return;
        
        this.mouse.isAutoActive = true;
        
        const now = performance.now();
        let dtSec = (now - this.lastTime) / 1000;
        this.lastTime = now;
        if (dtSec > 0.2) dtSec = 0.016;
        
        const dir = new THREE.Vector2().subVectors(this.target, this.current);
        const dist = dir.length();
        
        if (dist < 0.01) {
          this.pickNewTarget();
          return;
        }
        
        dir.normalize();
        
        let ramp = 1;
        if (this.rampDurationMs > 0) {
          const t = Math.min(1, (now - this.activationTime) / this.rampDurationMs);
          ramp = t * t * (3 - 2 * t);
        }
        
        const step = this.speed * dtSec * ramp;
        const move = Math.min(step, dist);
        this.current.addScaledVector(dir, move);
        this.mouse.setNormalized(this.current.x, this.current.y);
      }
    }

    class ShaderPass {
      constructor(props) {
        this.props = props || {};
        this.uniforms = this.props.material?.uniforms;
        this.scene = null;
        this.camera = null;
        this.material = null;
        this.geometry = null;
        this.plane = null;
      }

      init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();
        if (this.uniforms) {
          this.material = new THREE.RawShaderMaterial(this.props.material);
          this.geometry = new THREE.PlaneGeometry(2, 2);
          this.plane = new THREE.Mesh(this.geometry, this.material);
          this.scene.add(this.plane);
        }
      }

      update() {
        if (!common.renderer || !this.scene || !this.camera) return;
        common.renderer.setRenderTarget(this.props.output || null);
        common.renderer.render(this.scene, this.camera);
        common.renderer.setRenderTarget(null);
      }
    }

    class Advection extends ShaderPass {
      constructor(simProps) {
        super({
          material: {
            vertexShader: SHADERS.face_vert,
            fragmentShader: SHADERS.advection_frag,
            uniforms: {
              boundarySpace: { value: simProps.cellScale },
              px: { value: simProps.cellScale },
              fboSize: { value: simProps.fboSize },
              velocity: { value: simProps.src.texture },
              dt: { value: simProps.dt },
              isBFECC: { value: true }
            }
          },
          output: simProps.dst
        });
        this.init();
        this.createBoundary();
      }

      createBoundary() {
        const boundaryG = new THREE.BufferGeometry();
        const vertices_boundary = new Float32Array([
          -1, -1, 0, -1, 1, 0, -1, 1, 0, 1, 1, 0,
          1, 1, 0, 1, -1, 0, 1, -1, 0, -1, -1, 0
        ]);
        boundaryG.setAttribute('position', new THREE.BufferAttribute(vertices_boundary, 3));
        const boundaryM = new THREE.RawShaderMaterial({
          vertexShader: SHADERS.line_vert,
          fragmentShader: SHADERS.advection_frag,
          uniforms: this.uniforms
        });
        this.line = new THREE.LineSegments(boundaryG, boundaryM);
        this.scene.add(this.line);
      }

      update(args = {}) {
        if (typeof args.dt === 'number') this.uniforms.dt.value = args.dt;
        if (typeof args.isBounce === 'boolean') this.line.visible = args.isBounce;
        if (typeof args.BFECC === 'boolean') this.uniforms.isBFECC.value = args.BFECC;
        super.update();
      }
    }

    class ExternalForce extends ShaderPass {
      constructor(simProps) {
        super({ output: simProps.dst });
        this.init();
        const mouseG = new THREE.PlaneGeometry(1, 1);
        const mouseM = new THREE.RawShaderMaterial({
          vertexShader: SHADERS.mouse_vert,
          fragmentShader: SHADERS.externalForce_frag,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          uniforms: {
            px: { value: simProps.cellScale },
            force: { value: new THREE.Vector2(0, 0) },
            center: { value: new THREE.Vector2(0, 0) },
            scale: { value: new THREE.Vector2(simProps.cursor_size, simProps.cursor_size) }
          }
        });
        this.mouse = new THREE.Mesh(mouseG, mouseM);
        this.scene.add(this.mouse);
      }

      update(props = {}) {
        const forceX = (mouse.diff.x / 2) * (props.mouse_force || 0);
        const forceY = (mouse.diff.y / 2) * (props.mouse_force || 0);
        const cellScale = props.cellScale || { x: 1, y: 1 };
        const cursorSize = props.cursor_size || 0;
        const cursorSizeX = cursorSize * cellScale.x;
        const cursorSizeY = cursorSize * cellScale.y;
        const centerX = Math.min(
          Math.max(mouse.coords.x, -1 + cursorSizeX + cellScale.x * 2),
          1 - cursorSizeX - cellScale.x * 2
        );
        const centerY = Math.min(
          Math.max(mouse.coords.y, -1 + cursorSizeY + cellScale.y * 2),
          1 - cursorSizeY - cellScale.y * 2
        );
        const uniforms = this.mouse.material.uniforms;
        uniforms.force.value.set(forceX, forceY);
        uniforms.center.value.set(centerX, centerY);
        uniforms.scale.value.set(cursorSize, cursorSize);
        super.update();
      }
    }

    class Viscous extends ShaderPass {
      constructor(simProps) {
        super({
          material: {
            vertexShader: SHADERS.face_vert,
            fragmentShader: SHADERS.viscous_frag,
            uniforms: {
              boundarySpace: { value: simProps.boundarySpace },
              velocity: { value: simProps.src.texture },
              velocity_new: { value: simProps.dst_.texture },
              v: { value: simProps.viscous },
              px: { value: simProps.cellScale },
              dt: { value: simProps.dt }
            }
          },
          output: simProps.dst,
          output0: simProps.dst_,
          output1: simProps.dst
        });
        this.init();
      }

      update(args = {}) {
        if (typeof args.viscous === 'number') this.uniforms.v.value = args.viscous;
        const iter = args.iterations || 0;
        let fbo_in, fbo_out;
        for (let i = 0; i < iter; i++) {
          if (i % 2 === 0) {
            fbo_in = this.props.output0;
            fbo_out = this.props.output1;
          } else {
            fbo_in = this.props.output1;
            fbo_out = this.props.output0;
          }
          this.uniforms.velocity_new.value = fbo_in.texture;
          this.props.output = fbo_out;
          if (typeof args.dt === 'number') this.uniforms.dt.value = args.dt;
          super.update();
        }
        return fbo_out;
      }
    }

    class Divergence extends ShaderPass {
      constructor(simProps) {
        super({
          material: {
            vertexShader: SHADERS.face_vert,
            fragmentShader: SHADERS.divergence_frag,
            uniforms: {
              boundarySpace: { value: simProps.boundarySpace },
              velocity: { value: simProps.src.texture },
              px: { value: simProps.cellScale },
              dt: { value: simProps.dt }
            }
          },
          output: simProps.dst
        });
        this.init();
      }

      update(args = {}) {
        if (args.vel) {
          this.uniforms.velocity.value = args.vel.texture;
        }
        super.update();
      }
    }

    class Poisson extends ShaderPass {
      constructor(simProps) {
        super({
          material: {
            vertexShader: SHADERS.face_vert,
            fragmentShader: SHADERS.poisson_frag,
            uniforms: {
              boundarySpace: { value: simProps.boundarySpace },
              pressure: { value: simProps.dst_.texture },
              divergence: { value: simProps.src.texture },
              px: { value: simProps.cellScale }
            }
          },
          output: simProps.dst,
          output0: simProps.dst_,
          output1: simProps.dst
        });
        this.init();
      }

      update(args = {}) {
        const iter = args.iterations || 0;
        let p_in, p_out;
        for (let i = 0; i < iter; i++) {
          if (i % 2 === 0) {
            p_in = this.props.output0;
            p_out = this.props.output1;
          } else {
            p_in = this.props.output1;
            p_out = this.props.output0;
          }
          this.uniforms.pressure.value = p_in.texture;
          this.props.output = p_out;
          super.update();
        }
        return p_out;
      }
    }

    class Pressure extends ShaderPass {
      constructor(simProps) {
        super({
          material: {
            vertexShader: SHADERS.face_vert,
            fragmentShader: SHADERS.pressure_frag,
            uniforms: {
              boundarySpace: { value: simProps.boundarySpace },
              pressure: { value: simProps.src_p.texture },
              velocity: { value: simProps.src_v.texture },
              px: { value: simProps.cellScale },
              dt: { value: simProps.dt }
            }
          },
          output: simProps.dst
        });
        this.init();
      }

      update(args = {}) {
        if (args.vel && args.pressure) {
          this.uniforms.velocity.value = args.vel.texture;
          this.uniforms.pressure.value = args.pressure.texture;
        }
        super.update();
      }
    }

    class Simulation {
      constructor(opts = {}) {
        this.options = {
          iterations_poisson: iterationsPoisson,
          iterations_viscous: iterationsViscous,
          mouse_force: mouseForce,
          resolution: resolution,
          cursor_size: cursorSize,
          viscous: viscous,
          isBounce: isBounce,
          dt: dt,
          isViscous: isViscous,
          BFECC: BFECC,
          ...opts
        };
        this.fbos = {
          vel_0: null,
          vel_1: null,
          vel_viscous0: null,
          vel_viscous1: null,
          div: null,
          pressure_0: null,
          pressure_1: null
        };
        this.fboSize = new THREE.Vector2();
        this.cellScale = new THREE.Vector2();
        this.boundarySpace = new THREE.Vector2();
        this.init();
      }

      init() {
        this.calcSize();
        this.createAllFBO();
        this.createShaderPass();
      }

      getFloatType() {
        const isIOS = /(iPad|iPhone|iPod)/i.test(navigator.userAgent);
        return isIOS ? THREE.HalfFloatType : THREE.FloatType;
      }

      createAllFBO() {
        const type = this.getFloatType();
        const opts = {
          type,
          depthBuffer: false,
          stencilBuffer: false,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          wrapS: THREE.ClampToEdgeWrapping,
          wrapT: THREE.ClampToEdgeWrapping
        };
        for (const key in this.fbos) {
          this.fbos[key] = new THREE.WebGLRenderTarget(this.fboSize.x, this.fboSize.y, opts);
        }
      }

      createShaderPass() {
        this.advection = new Advection({
          cellScale: this.cellScale,
          fboSize: this.fboSize,
          dt: this.options.dt,
          src: this.fbos.vel_0,
          dst: this.fbos.vel_1
        });
        this.externalForce = new ExternalForce({
          cellScale: this.cellScale,
          cursor_size: this.options.cursor_size,
          dst: this.fbos.vel_1
        });
        this.viscous = new Viscous({
          cellScale: this.cellScale,
          boundarySpace: this.boundarySpace,
          viscous: this.options.viscous,
          src: this.fbos.vel_1,
          dst: this.fbos.vel_viscous1,
          dst_: this.fbos.vel_viscous0,
          dt: this.options.dt
        });
        this.divergence = new Divergence({
          cellScale: this.cellScale,
          boundarySpace: this.boundarySpace,
          src: this.fbos.vel_viscous0,
          dst: this.fbos.div,
          dt: this.options.dt
        });
        this.poisson = new Poisson({
          cellScale: this.cellScale,
          boundarySpace: this.boundarySpace,
          src: this.fbos.div,
          dst: this.fbos.pressure_1,
          dst_: this.fbos.pressure_0
        });
        this.pressure = new Pressure({
          cellScale: this.cellScale,
          boundarySpace: this.boundarySpace,
          src_p: this.fbos.pressure_0,
          src_v: this.fbos.vel_viscous0,
          dst: this.fbos.vel_0,
          dt: this.options.dt
        });
      }

      calcSize() {
        const width = Math.max(1, Math.round(this.options.resolution * common.width));
        const height = Math.max(1, Math.round(this.options.resolution * common.height));
        this.cellScale.set(1 / width, 1 / height);
        this.fboSize.set(width, height);
      }

      resize() {
        this.calcSize();
        for (const key in this.fbos) {
          this.fbos[key].setSize(this.fboSize.x, this.fboSize.y);
        }
      }

      update() {
        if (this.options.isBounce) this.boundarySpace.set(0, 0);
        else this.boundarySpace.copy(this.cellScale);
        
        this.advection.update({
          dt: this.options.dt,
          isBounce: this.options.isBounce,
          BFECC: this.options.BFECC
        });
        this.externalForce.update({
          cursor_size: this.options.cursor_size,
          mouse_force: this.options.mouse_force,
          cellScale: this.cellScale
        });
        
        let vel = this.fbos.vel_1;
        if (this.options.isViscous) {
          vel = this.viscous.update({
            viscous: this.options.viscous,
            iterations: this.options.iterations_viscous,
            dt: this.options.dt
          });
        }
        
        this.divergence.update({ vel });
        const pressure = this.poisson.update({ iterations: this.options.iterations_poisson });
        this.pressure.update({ vel, pressure });
      }
    }

    class Output {
      constructor() {
        this.simulation = new Simulation();
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();
        this.output = new THREE.Mesh(
          new THREE.PlaneGeometry(2, 2),
          new THREE.RawShaderMaterial({
            vertexShader: SHADERS.face_vert,
            fragmentShader: SHADERS.color_frag,
            transparent: true,
            depthWrite: false,
            uniforms: {
              velocity: { value: this.simulation.fbos.vel_0.texture },
              boundarySpace: { value: new THREE.Vector2() },
              palette: { value: paletteTex },
              bgColor: { value: bgVec4 }
            }
          })
        );
        this.scene.add(this.output);
      }

      resize() {
        this.simulation.resize();
      }

      render() {
        if (!common.renderer) return;
        common.renderer.setRenderTarget(null);
        common.renderer.render(this.scene, this.camera);
      }

      update() {
        this.simulation.update();
        this.render();
      }

      updateColors(newColors) {
        paletteTex.dispose();
        paletteTex = makePaletteTexture(newColors);
        this.output.material.uniforms.palette.value = paletteTex;
      }
    }

    class WebGLManager {
      constructor() {
        this.running = false;
        this.rafId = null;
        
        common.init(container);
        mouse.init(container);
        
        autoDriver = new AutoDriver(mouse);
        
        container.prepend(common.renderer.domElement);
        this.output = new Output();
        
        this.resize = this.resize.bind(this);
        this.loop = this.loop.bind(this);
        
        window.addEventListener('resize', this.resize);
      }

      resize() {
        common.resize();
        this.output.resize();
      }

      render() {
        if (autoDriver) autoDriver.update();
        mouse.update();
        common.update();
        this.output.update();
      }

      loop() {
        if (!this.running) return;
        this.render();
        this.rafId = requestAnimationFrame(this.loop);
      }

      start() {
        if (this.running) return;
        this.running = true;
        this.loop();
      }

      pause() {
        this.running = false;
        if (this.rafId) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
      }

      updateColors(newColors) {
        this.output.updateColors(newColors);
      }

      dispose() {
        try {
          this.pause();
          window.removeEventListener('resize', this.resize);
          mouse.dispose();
          if (common.renderer) {
            const canvas = common.renderer.domElement;
            if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
            common.renderer.dispose();
          }
        } catch (e) {
          console.error('Error disposing LiquidEther:', e);
        }
      }
    }

    const common = new Common();
    const mouse = new Mouse();
    let autoDriver = null;

    const manager = new WebGLManager();
    manager.start();

    return {
      start: () => manager.start(),
      pause: () => manager.pause(),
      dispose: () => manager.dispose(),
      resize: () => manager.resize(),
      updateColors: (newColors) => manager.updateColors(newColors),
      output: manager.output,
      autoDriver: autoDriver
    };
  };
})(window);