struct Params {
  textureSize : vec2<f32>,
  fov : f32,
  samplesPerPixel: f32,
  cameraPosition: vec3<f32>,
  pitch: f32,
  yaw: f32
}

struct Ray {
  origin: vec3f,
  direction: vec3f
}

struct Sphere {
  position: vec3f,
  radius: f32,
  material_index: i32
}

const METAL: i32 = 0;
const LAMBERTIAN: i32 = 1;
const DIELECTRIC: i32 = 2;

struct Material {
  color: vec3f,
  material_type: i32,
  fuzz_factor: f32,
  index_of_refraction: f32
}


struct Intersection {
  hit: bool,
  position: vec3f,
  normal: vec3f,
  t: f32,
  material_index: i32,
  front_face: bool
}

struct Scatter {
    scattered: Ray,
    attenuation: vec3f
}