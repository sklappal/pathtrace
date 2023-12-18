struct Params {
  textureSize : vec2<f32>
}

struct Ray {
  origin: vec3f,
  direction: vec3f
}

struct Sphere {
  position: vec3f,
  radius: f32,
  material: Material
}

struct Material {
  color: vec3f
}

struct Intersection {
  hit: bool,
  position: vec3f,
  normal: vec3f,
  t: f32
}