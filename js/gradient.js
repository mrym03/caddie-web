/*
 * Opening gradient — extracted faithfully from the monopo-saigon WebGL background.
 * A Three.js sphere mesh rendered with a simplex-noise shader that "blooms" in on
 * load (the opening motion), then settles to a full-screen gradient.
 *
 * Everything here is the original studio's gradient: the exact GLSL shaders,
 * colour palette, camera, uniforms and animation curve. Nothing else from the
 * old site remains — add your own pages on top of this clean base.
 */
(function () {
  'use strict';

  // ---- Palette (RGB 0–255, normalised to 0–1 as the original did) -------------
  var PALETTE = {
    baseFirst:  [120, 158, 113], // green
    baseSecond: [224, 148,  66], // orange
    baseThird:  [232, 201,  73], // yellow
    accent:     [  0,   0,   0]  // black
  };
  function vec3(c) { return new THREE.Vector3(c[0] / 255, c[1] / 255, c[2] / 255); }

  var isMobile = window.matchMedia('(max-width: 1023px)').matches;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Shaders (verbatim from the original bundle) ----------------------------
  var VERT = [
    'varying vec3 vUv;',
    '',
    'void main() {',
    '    vUv = position;',
    '    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);',
    '    gl_Position = projectionMatrix * modelViewPosition;',
    '}'
  ].join('\n');

  var FRAG = [
    'varying vec3 vUv;',
    '',
    'uniform vec3 uBaseFirstColor;',
    'uniform vec3 uBaseSecondColor;',
    'uniform vec3 uAccentColor;',
    'uniform float uBgProgress;',
    'uniform float uAccentOpacity;',
    'uniform float uBaseFrequency;',
    'uniform float uAccentFrequency;',
    'uniform float uNoiseIntensity;',
    'uniform float uOpacityBackground;',
    'uniform float uTime;',
    'uniform float uZoom;',
    '',
    'uniform vec2 u_res;',
    '',
    'vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }',
    'vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}',
    'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}',
    'vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}',
    '',
    'float random (in vec2 st) {',
    '    return fract(sin(dot(st.xy,',
    '                         vec2(12.9898,78.233)))',
    '                * 43758.5453123);',
    '}',
    'float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}',
    'vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}',
    'vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}',
    '',
    'float noise(vec3 p){',
    '    vec3 a = floor(p);',
    '    vec3 d = p - a;',
    '    d = d * d * (3.0 - 2.0 * d);',
    '',
    '    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);',
    '    vec4 k1 = perm(b.xyxy);',
    '    vec4 k2 = perm(k1.xyxy + b.zzww);',
    '',
    '    vec4 c = k2 + a.zzzz;',
    '    vec4 k3 = perm(c);',
    '    vec4 k4 = perm(c + 1.0);',
    '',
    '    vec4 o1 = fract(k3 * (1.0 / 41.0));',
    '    vec4 o2 = fract(k4 * (1.0 / 41.0));',
    '',
    '    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);',
    '    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);',
    '',
    '    return o4.y * d.y + o4.x * (1.0 - d.y);',
    '}',
    '',
    'float snoise3(vec3 v){ ',
    '  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;',
    '  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);',
    '',
    '// First corner',
    '  vec3 i  = floor(v + dot(v, C.yyy) );',
    '  vec3 x0 =   v - i + dot(i, C.xxx) ;',
    '',
    '// Other corners',
    '  vec3 g = step(x0.yzx, x0.xyz);',
    '  vec3 l = 1.0 - g;',
    '  vec3 i1 = min( g.xyz, l.zxy );',
    '  vec3 i2 = max( g.xyz, l.zxy );',
    '',
    '  vec3 x1 = x0 - i1 + 1.0 * C.xxx;',
    '  vec3 x2 = x0 - i2 + 2.0 * C.xxx;',
    '  vec3 x3 = x0 - 1. + 3.0 * C.xxx;',
    '',
    '// Permutations',
    '  i = mod(i, 289.0 ); ',
    '  vec4 p = permute( permute( permute( ',
    '             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))',
    '           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) ',
    '           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));',
    '',
    '// Gradients',
    '  float n_ = 1.0/7.0; // N=7',
    '  vec3  ns = n_ * D.wyz - D.xzx;',
    '',
    '  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)',
    '',
    '  vec4 x_ = floor(j * ns.z);',
    '  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)',
    '',
    '  vec4 x = x_ *ns.x + ns.yyyy;',
    '  vec4 y = y_ *ns.x + ns.yyyy;',
    '  vec4 h = 1.0 - abs(x) - abs(y);',
    '',
    '  vec4 b0 = vec4( x.xy, y.xy );',
    '  vec4 b1 = vec4( x.zw, y.zw );',
    '',
    '  vec4 s0 = floor(b0)*2.0 + 1.0;',
    '  vec4 s1 = floor(b1)*2.0 + 1.0;',
    '  vec4 sh = -step(h, vec4(0.0));',
    '',
    '  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;',
    '  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;',
    '',
    '  vec3 p0 = vec3(a0.xy,h.x);',
    '  vec3 p1 = vec3(a0.zw,h.y);',
    '  vec3 p2 = vec3(a1.xy,h.z);',
    '  vec3 p3 = vec3(a1.zw,h.w);',
    '',
    '//Normalise gradients',
    '  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));',
    '  p0 *= norm.x;',
    '  p1 *= norm.y;',
    '  p2 *= norm.z;',
    '  p3 *= norm.w;',
    '',
    '// Mix final noise value',
    '  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);',
    '  m = m * m;',
    '  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), ',
    '                                dot(p2,x2), dot(p3,x3) ) );',
    '}',
    '',
    'mat2 rotate2d(float angle){',
    '    return mat2(cos(angle),-sin(angle),',
    '                sin(angle),cos(angle));',
    '}',
    '',
    'float lines(in vec2 pos, float b){',
    '    float scale = 10.0;',
    '    pos *= scale;',
    '    return smoothstep(0.0,',
    '                    .5+b*.5,',
    '                    abs((sin(pos.x*3.1415)+b*2.0))*.5);',
    '}',
    '',
    'float circle(in vec2 _st, in float _radius, in float blurriness){',
    '    vec2 dist = _st;',
    '	  return 1. - smoothstep(_radius-(_radius*blurriness), _radius+(_radius*blurriness), dot(dist,dist)*4.0);',
    '}',
    '',
    'float dist(vec2 p0, vec2 pf){return sqrt((pf.x-p0.x)*(pf.x-p0.x)+(pf.y-p0.y)*(pf.y-p0.y));}',
    '',
    'void main() {',
    '    vec2 resolution = u_res * PR;',
    '    vec3 uv = vUv.xyz;',
    '',
    '    float progress = uBgProgress;',
    '',
    '    // base',
    '    float baseNoise = noise(uBaseFrequency * uv + uTime);',
    '    vec2 basePos = rotate2d( baseNoise ) * uv.xy * uZoom;',
    '    float basePattern = basePos.x;',
    '    basePattern = lines(basePos,.5);',
    '',
    '    vec2 st = gl_FragCoord.xy / resolution.xy - vec2(.5);',
    '    st.y *= resolution.y / resolution.x;',
    '    float c = circle(st, .2 + progress * 10.0, 2.);',
    '    float offX = uv.x + sin(uv.y + uTime * 2.);',
    '    float offY = uv.y - uTime * .2 - cos(uTime * 2.) * 0.1;',
    '',
    '    float nc = (snoise3(vec3(offX, offY, uTime * 5.) * 2.)) * .03;',
    '    float d = dist(resolution.xy*0.5,gl_FragCoord.xy)*(1.0-progress)*0.003;',
    '',
    '    vec2 accentPos = rotate2d( baseNoise ) * uv.xy * uZoom;',
    '    float accentPattern = accentPos.x;',
    '    accentPattern = lines(accentPos,.1);',
    '',
    '    vec3 baseMix = mix(uBaseFirstColor, uBaseSecondColor, basePattern);',
    '    vec3 accentMix = mix(baseMix, uAccentColor, accentPattern - (1. - uAccentOpacity));',
    '',
    '    float finalMask = smoothstep(1., 1., pow(c, 6.) * 10. + nc * (1. - progress)); ',
    '    vec4 finalImage = mix(vec4(finalMask), vec4(accentMix, 1.0), clamp((finalMask + progress), 0., 1.)) * (1.0 - d);',
    '',
    '    gl_FragColor = vec4(vec3(finalImage), uOpacityBackground);',
    '}'
  ].join('\n');

  // ---- Renderer / scene / camera (matches the original Renderer class) --------
  var canvas = document.getElementById('gradient-canvas');
  var PR = Math.min(window.devicePixelRatio || 1, 2);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 20);
  camera.position.set(0, 0, -4);
  camera.lookAt(scene.position);

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    precision: 'highp',
    powerPreference: 'high-performance',
    antialias: true,
    alpha: false
  });
  renderer.setPixelRatio(PR);
  renderer.setClearColor(0x000000, 1);
  renderer.setSize(window.innerWidth, window.innerHeight);

  var clock = new THREE.Clock();
  clock.start();

  // ---- Animatable state (the original "Background" defaults) -------------------
  var state = {
    baseFrequency: 2.6,
    zoom: isMobile ? 0.1 : 0.2,
    accentOpacity: 1,
    accentFrequency: 2.2,
    noiseIntensity: 0,
    opacityBackground: 0,
    bgProgress: 0,
    speed: 100
  };

  var uniforms = {
    uTime:             { value: 0 },
    uBaseFirstColor:   { value: vec3(PALETTE.baseFirst) },
    uBaseSecondColor:  { value: vec3(PALETTE.baseSecond) },
    uBaseThirdColor:   { value: vec3(PALETTE.baseThird) },
    uZoom:             { value: state.zoom },
    uBaseFrequency:    { value: state.baseFrequency },
    uAccentColor:      { value: vec3(PALETTE.accent) },
    uAccentOpacity:    { value: state.accentOpacity },
    uAccentFrequency:  { value: state.accentFrequency },
    uNoiseIntensity:   { value: state.noiseIntensity },
    uOpacityBackground:{ value: state.opacityBackground },
    uBgProgress:       { value: state.bgProgress },
    u_res:             { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  };

  var fov = camera.fov * Math.PI / 180;
  var fovY = camera.position.z * Math.tan(fov / 2) * 2; // ~ -3.31

  var geometry = new THREE.SphereGeometry(1, 32, 32);
  var material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.BackSide,
    transparent: true,
    defines: { PI: Math.PI, PR: PR.toFixed(1) }
  });

  var mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(fovY, fovY, fovY);
  mesh.lookAt(camera.position);
  scene.add(mesh);

  // ---- Lens3D: refractive glass sphere (verbatim shaders + setup from original) -
  var LENS_VERT = [
    'uniform float mRefractionRatio;',
    'uniform float mFresnelBias;',
    'uniform float mFresnelScale;',
    'uniform float mFresnelPower;',
    '',
    'varying vec3 vReflect;',
    'varying vec3 vRefract[3];',
    'varying float vReflectionFactor;',
    '',
    'void main() {',
    '    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
    '    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );',
    '    vec3 worldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );',
    '    vec3 I = worldPosition.xyz - cameraPosition;',
    '    vReflect = reflect( I, worldNormal );',
    '    vRefract[0] = refract( normalize( I ), worldNormal, mRefractionRatio );',
    '    vRefract[1] = refract( normalize( I ), worldNormal, mRefractionRatio * 0.99 );',
    '    vRefract[2] = refract( normalize( I ), worldNormal, mRefractionRatio * 0.98 );',
    '    vReflectionFactor = mFresnelBias + mFresnelScale * pow( 1.0 + dot( normalize( I ), worldNormal ), mFresnelPower );',
    '    gl_Position = projectionMatrix * mvPosition;',
    '}'
  ].join('\n');

  var LENS_FRAG = [
    'uniform samplerCube tCube;',
    'uniform float uSphereAlpha;',
    'uniform float uRefractionPower;',
    '',
    'varying vec3 vReflect;',
    'varying vec3 vRefract[3];',
    'varying float vReflectionFactor;',
    '',
    'void main() {',
    '    vec4 reflectedColor = textureCube( tCube, vec3( -vReflect.x, vReflect.yz ) );',
    '    vec4 refractedColor = vec4( 1.0 );',
    '    refractedColor.r = textureCube( tCube, vec3( -vRefract[0].x, vRefract[0].yz ) ).r;',
    '    refractedColor.g = textureCube( tCube, vec3( -vRefract[1].x, vRefract[1].yz ) ).g;',
    '    refractedColor.b = textureCube( tCube, vec3( -vRefract[2].x, vRefract[2].yz ) ).b;',
    '    refractedColor.a = uRefractionPower;',
    '    gl_FragColor = mix( vec4(vec3(refractedColor.rgb), refractedColor.a), reflectedColor * uSphereAlpha, clamp( vReflectionFactor, 0.0, 1.0 ) );',
    '}'
  ].join('\n');

  // animatable lens state (original defaults)
  var lens = {
    mRefractionRatio: 0.016,
    mFresnelBias: 0.016,
    mFresnelPower: 4.206,
    mFresnelScale: 2.442,
    sphereAlpha: 0,
    refractionPower: 0
  };

  var cubeRT = new THREE.WebGLCubeRenderTarget(256, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter
  });
  cubeRT.texture.encoding = THREE.sRGBEncoding;
  var cubeCamera = new THREE.CubeCamera(0.1, 10, cubeRT);

  var lensUniforms = {
    mRefractionRatio: { value: lens.mRefractionRatio },
    mFresnelBias:     { value: lens.mFresnelBias },
    mFresnelPower:    { value: lens.mFresnelPower },
    mFresnelScale:    { value: lens.mFresnelScale },
    uSphereAlpha:     { value: lens.sphereAlpha },
    uRefractionPower: { value: lens.refractionPower },
    tCube:            { value: cubeRT.texture }
  };
  var lensMaterial = new THREE.ShaderMaterial({
    uniforms: lensUniforms,
    vertexShader: LENS_VERT,
    fragmentShader: LENS_FRAG,
    transparent: true,
    side: THREE.FrontSide
  });
  var lensSphere = new THREE.Mesh(new THREE.SphereGeometry(0.4, 64, 64), lensMaterial);
  lensSphere.scale.set(3, 3, 3);
  lensSphere.position.set(-1.25, 0.75, -1.5);
  scene.add(lensSphere);
  cubeCamera.position.copy(lensSphere.position);
  scene.add(cubeCamera);

  // the orb is not drawn at all until the reveal phase, so the entrance stays clean
  var lensVisible = false;

  function updateLens() {
    lensUniforms.mRefractionRatio.value = lens.mRefractionRatio;
    lensUniforms.mFresnelBias.value = lens.mFresnelBias;
    lensUniforms.mFresnelPower.value = lens.mFresnelPower;
    lensUniforms.mFresnelScale.value = lens.mFresnelScale;
    lensUniforms.uSphereAlpha.value = lens.sphereAlpha;
    lensUniforms.uRefractionPower.value = lens.refractionPower;
    cubeCamera.position.copy(lensSphere.position);
    // render the gradient into the cubemap with the glass itself hidden
    lensSphere.visible = false;
    cubeCamera.update(renderer, scene);
    lensSphere.visible = lensVisible;
  }

  // ---- Final film-grain pass (the original applied grain as a full-screen post  -
  //      process, so the cubemap/orb stay clean and grain sits over everything) --
  var sceneRT = new THREE.WebGLRenderTarget(
    Math.floor(window.innerWidth * PR), Math.floor(window.innerHeight * PR),
    { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat }
  );
  var postScene = new THREE.Scene();
  var postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var GRAIN_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }';
  var GRAIN_FRAG = [
    'uniform sampler2D tDiffuse;',
    'uniform float uGrain;',
    'varying vec2 vUv;',
    'float grand( vec2 p ){ return fract( cos( dot(p, vec2(23.14069263277926, 2.665144142690225)) ) * 12345.6789 ); }',
    'void main(){',
    '  vec4 color = texture2D( tDiffuse, vUv );',
    '  vec2 uvRandom = vUv;',
    '  uvRandom.y *= grand( vec2(uvRandom.y, 0.0) );',
    '  color.rgb += grand( uvRandom ) * uGrain;',
    '  gl_FragColor = color;',
    '}'
  ].join('\n');
  var postMaterial = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: sceneRT.texture }, uGrain: { value: 0.075 } },
    vertexShader: GRAIN_VERT,
    fragmentShader: GRAIN_FRAG,
    depthTest: false,
    depthWrite: false
  });
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial));

  // ---- Resize -----------------------------------------------------------------
  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    sceneRT.setSize(Math.floor(w * PR), Math.floor(h * PR));
    uniforms.u_res.value.set(w, h);
  }
  window.addEventListener('resize', onResize);

  // ---- Gentle mouse parallax (the original eased the camera toward the cursor) -
  var pointer = { x: 0, y: 0 };
  var cam = { x: 0, y: 0 };
  window.addEventListener('pointermove', function (e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  // ---- Render loop ------------------------------------------------------------
  function tick() {
    requestAnimationFrame(tick);
    uniforms.uTime.value += 7e-5 * state.speed;
    mesh.scale.x = Math.abs(fovY * camera.aspect);
    mesh.scale.y = Math.abs(fovY);
    uniforms.uAccentFrequency.value = state.accentFrequency;
    uniforms.uNoiseIntensity.value = state.noiseIntensity;
    uniforms.uOpacityBackground.value = state.opacityBackground;
    uniforms.uBgProgress.value = state.bgProgress;

    // eased parallax — subtle, keeps the framing intact
    cam.x += (pointer.x - cam.x) * 0.06;
    cam.y += (pointer.y - cam.y) * 0.06;
    camera.position.x = cam.x * -0.25;
    camera.position.y = -cam.y * 0.12;
    camera.lookAt(0, 0, 0);

    updateLens();
    // 1) render the scene (gradient + glass) into a target, then
    // 2) draw it full-screen with a fine grain over the whole frame
    renderer.setRenderTarget(sceneRT);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);
  }
  tick();

  // ---- Opening choreography (reproduces the GSAP preShow + show timelines) -----
  function easeInOut(t) { // cubic in-out, matches the original feel
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); } // cubic out (lens used easeOut)
  function tween(obj, key, from, to, duration, delay, ease) {
    ease = ease || easeInOut;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var elapsed = ts - start;
      if (elapsed < delay) { requestAnimationFrame(step); return; }
      var p = Math.min((elapsed - delay) / duration, 1);
      obj[key] = from + (to - from) * ease(p);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var brand = document.querySelector('.brand');

  var SHOW = 2800; // when the gradient expands and the glass appears

  if (reduceMotion) {
    // Skip the bloom: settle straight to the full gradient + glass.
    state.opacityBackground = 0.8;
    state.bgProgress = 1;
    state.speed = 30;
    lens.sphereAlpha = 1;
    lens.refractionPower = 0.75;
    lensSphere.scale.set(3.5, 3.5, 3.5);
    lensSphere.position.x = -1;
    lensVisible = true;
    if (brand) brand.classList.add('is-revealed');
  } else {
    // preShow: the orb blooms in (0 → 2s)
    tween(state, 'opacityBackground', 0, 0.8, 2000, 0);
    tween(state, 'bgProgress', 0, 0.25, 2000, 0);
    // reveal the tagline partway through the bloom
    setTimeout(function () { if (brand) brand.classList.add('is-revealed'); }, 700);
    // show: the gradient expands to fill the screen and slows down (after a brief hold)
    tween(state, 'bgProgress', 0.25, 1, 2000, SHOW);
    tween(state, 'speed', 100, 30, 2000, SHOW);
    // the glass sphere fades in, grows and slides — exactly as the original "show"
    setTimeout(function () { lensVisible = true; }, SHOW);
    tween(lens, 'sphereAlpha', 0, 1, 1000, SHOW, easeOut);
    tween(lens, 'refractionPower', 0, 0.75, 1000, SHOW, easeOut);
    tween(lensSphere.scale, 'x', 3, 3.5, 2000, SHOW, easeOut);
    tween(lensSphere.scale, 'y', 3, 3.5, 2000, SHOW, easeOut);
    tween(lensSphere.scale, 'z', 3, 3.5, 2000, SHOW, easeOut);
    tween(lensSphere.position, 'x', -1.25, -1, 2000, SHOW, easeOut);
  }
})();
